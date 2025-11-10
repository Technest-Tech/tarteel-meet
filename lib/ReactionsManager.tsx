'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRoomContext, useLocalParticipant, useParticipants } from '@livekit/components-react';
import { ReactionType } from './ReactionSound';
import { ReactionNotification } from './ReactionNotification';

export interface Reaction {
  id: string;
  reaction: ReactionType;
  sender: string;
  timestamp: number;
}

// Global reactions state for video overlay
export let globalReactions: Reaction[] = [];
export const reactionListeners: Set<() => void> = new Set();

export function getGlobalReactions(): Reaction[] {
  return globalReactions;
}

export function ReactionsManager() {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const [reactions, setReactions] = useState<Reaction[]>([]);

  // Normalize emoji to handle encoding issues
  const normalizeEmoji = (emoji: string): ReactionType | null => {
    if (!emoji) return null;
    
    const emojiString = String(emoji).trim();
    
    // Map of valid emojis
    const validEmojis: ReactionType[] = ['👍', '❤️', '😂', '😮', '👏', '🎉'];
    
    // Try direct match first
    if (validEmojis.includes(emojiString as ReactionType)) {
      return emojiString as ReactionType;
    }

    // Map of corrupted UTF-8 patterns to valid emojis (common mojibake patterns from Flutter)
    // These patterns occur when emojis are double-encoded or incorrectly decoded
    const corruptedPatterns: Record<string, ReactionType> = {
      // Heart emoji corrupted patterns (from Flutter logs: "â¤ï¸")
      'â¤ï¸': '❤️',
      'â¤': '❤️',
      // Check for heart character code in corrupted form
      '\u00E2\u0099\u00A5': '❤️', // UTF-8 bytes for heart: E2 99 A5
      '\u00E2': '❤️', // Partial match
    };

    // Check for known corrupted patterns
    for (const [pattern, emoji] of Object.entries(corruptedPatterns)) {
      if (emojiString.includes(pattern) || pattern.includes(emojiString)) {
        return emoji;
      }
    }

    // Try to find by checking if any valid emoji is contained in the string
    for (const validEmoji of validEmojis) {
      if (emojiString.includes(validEmoji) || validEmoji.includes(emojiString)) {
        return validEmoji;
      }
    }

    // Try to match by checking character codes (handles encoding variations)
    const validEmojiCodes: Record<ReactionType, number[]> = {
      '👍': [0x1F44D],
      '❤️': [0x2764, 0xFE0F],
      '😂': [0x1F602],
      '😮': [0x1F62E],
      '👏': [0x1F44F],
      '🎉': [0x1F389],
    };

    // Extract all code points from the received string
    const receivedCodes = Array.from(emojiString).map(c => c.codePointAt(0)).filter(c => c !== undefined) as number[];
    
    // Check each valid emoji
    for (const [emoji, codes] of Object.entries(validEmojiCodes)) {
      // Check if any of the received codes match the emoji codes
      const hasMatch = codes.some(code => receivedCodes.includes(code));
      if (hasMatch) {
        return emoji as ReactionType;
      }
      
      // Also check if the emoji contains any of the received codes (for partial matches)
      const emojiCodes = Array.from(emoji).map(c => c.codePointAt(0)).filter(c => c !== undefined) as number[];
      const hasPartialMatch = receivedCodes.some(code => emojiCodes.includes(code));
      if (hasPartialMatch) {
        return emoji as ReactionType;
      }
    }

    // Last resort: try to reconstruct from byte patterns
    // This handles cases where emojis are corrupted during JSON encoding/decoding
    try {
      const bytes = new TextEncoder().encode(emojiString);
      
      // Map of emoji to their UTF-8 byte sequences (for corrupted detection)
      const emojiBytePatterns: Record<ReactionType, number[][]> = {
        '👍': [[0xF0, 0x9F, 0x91, 0x8D]], // Thumbs up
        '❤️': [[0xE2, 0x99, 0xA5, 0xEF, 0xB8, 0x8F], [0xE2, 0x99, 0xA5]], // Heart with and without variation selector
        '😂': [[0xF0, 0x9F, 0x98, 0x82]], // Laughing
        '😮': [[0xF0, 0x9F, 0x98, 0xAE]], // Surprised
        '👏': [[0xF0, 0x9F, 0x91, 0x8F]], // Clapping
        '🎉': [[0xF0, 0x9F, 0x8E, 0x89]], // Party
      };
      
      // Check each valid emoji's byte pattern
      for (const [emoji, patterns] of Object.entries(emojiBytePatterns)) {
        for (const pattern of patterns) {
          // Check if the received bytes contain the emoji byte pattern
          let matchCount = 0;
          let patternIndex = 0;
          
          for (let i = 0; i < bytes.length && patternIndex < pattern.length; i++) {
            if (bytes[i] === pattern[patternIndex]) {
              matchCount++;
              patternIndex++;
            } else if (patternIndex > 0) {
              // Reset if sequence breaks
              patternIndex = 0;
              matchCount = 0;
            }
          }
          
          // If we matched most of the pattern, consider it a match
          if (matchCount >= pattern.length * 0.7) {
            return emoji as ReactionType;
          }
          
          // Also check if bytes array contains the pattern as a subsequence
          let foundPattern = true;
          let byteIndex = 0;
          for (const patternByte of pattern) {
            const found = bytes.indexOf(patternByte, byteIndex);
            if (found === -1) {
              foundPattern = false;
              break;
            }
            byteIndex = found + 1;
          }
          
          if (foundPattern) {
            return emoji as ReactionType;
          }
        }
      }
    } catch (e) {
      // Ignore encoding errors
    }

    return null;
  };

  // Handle incoming reactions
  useEffect(() => {
    if (!room) return;

    const handleDataReceived = (data: Uint8Array, participant?: any) => {
      try {
        // Use UTF-8 decoder with error handling
        const messageString = new TextDecoder('utf-8', { fatal: false }).decode(data);
        const messageData = JSON.parse(messageString);

        if (messageData.type === 'reaction') {
          // Normalize emoji to handle encoding issues
          const normalizedEmoji = normalizeEmoji(messageData.reaction);
          
          if (!normalizedEmoji) {
            console.warn('Invalid reaction emoji received:', messageData.reaction, 'Raw:', messageString);
            return; // Skip invalid reactions
          }

          const reaction: Reaction = {
            id: `${messageData.sender}-${messageData.timestamp}`,
            reaction: normalizedEmoji,
            sender: messageData.sender || participant?.identity || 'Unknown',
            timestamp: messageData.timestamp || Date.now(),
          };

          // Check if reaction already exists (to prevent duplicates from optimistic updates)
          const reactionExists = globalReactions.some(r => r.id === reaction.id);
          if (reactionExists) {
            return; // Skip if already exists
          }

          setReactions((prev) => {
            // Also check local state to prevent duplicates
            if (prev.some(r => r.id === reaction.id)) {
              return prev;
            }
            const updated = [...prev, reaction];
            // Update global state
            globalReactions = updated;
            // Notify listeners
            reactionListeners.forEach(listener => listener());
            return updated;
          });

          // Show notification for non-local reactions
          // ReactionNotification component will handle the notification and sound for all reactions
          // It checks isLocal internally, so we always render it

          // Auto-remove reaction after 5 seconds
          setTimeout(() => {
            setReactions((prev) => {
              const updated = prev.filter((r) => r.id !== reaction.id);
              globalReactions = updated;
              reactionListeners.forEach(listener => listener());
              return updated;
            });
          }, 5000);
        }
      } catch (error) {
        console.error('Error parsing reaction data:', error);
      }
    };

    room.on('dataReceived', handleDataReceived);

    return () => {
      room.off('dataReceived', handleDataReceived);
    };
  }, [room, localParticipant]);

  // Get reactions for a specific participant
  const getReactionsForParticipant = useCallback(
    (participantId: string) => {
      return reactions.filter((r) => r.sender === participantId);
    },
    [reactions]
  );

  // Render reaction notifications
  // Show notifications for all reactions - the component handles isLocal check internally
  return (
    <>
      {reactions.map((reaction) => {
        const isLocal = reaction.sender === localParticipant?.identity;
        return (
          <ReactionNotification
            key={reaction.id}
            reaction={reaction.reaction}
            sender={reaction.sender}
            isLocal={isLocal}
          />
        );
      })}
    </>
  );
}

// Export function to get reactions for a participant (for use in overlays)
export function useReactionsForParticipant(participantId: string) {
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();

  // Normalize emoji to handle encoding issues (same as above)
  const normalizeEmoji = (emoji: string): ReactionType | null => {
    if (!emoji) return null;
    
    const emojiString = String(emoji).trim();
    const validEmojis: ReactionType[] = ['👍', '❤️', '😂', '😮', '👏', '🎉'];
    
    // Try direct match first
    if (validEmojis.includes(emojiString as ReactionType)) {
      return emojiString as ReactionType;
    }

    // Try to find by checking if any valid emoji is contained in the string
    for (const validEmoji of validEmojis) {
      if (emojiString.includes(validEmoji) || validEmoji.includes(emojiString)) {
        return validEmoji;
      }
    }

    // Try to match by checking character codes
    const validEmojiCodes = {
      '👍': [0x1F44D],
      '❤️': [0x2764, 0xFE0F],
      '❤': [0x2764],
      '😂': [0x1F602],
      '😮': [0x1F62E],
      '👏': [0x1F44F],
      '🎉': [0x1F389],
    };

    for (const [emoji, codes] of Object.entries(validEmojiCodes)) {
      const emojiCodes = Array.from(emojiString).map(c => c.codePointAt(0));
      if (emojiCodes.some(code => codes.includes(code || 0))) {
        return emoji as ReactionType;
      }
    }

    return null;
  };

  useEffect(() => {
    if (!room) return;

    const handleDataReceived = (data: Uint8Array, participant?: any) => {
      try {
        const messageString = new TextDecoder('utf-8', { fatal: false }).decode(data);
        const messageData = JSON.parse(messageString);

        if (messageData.type === 'reaction' && messageData.sender === participantId) {
          const normalizedEmoji = normalizeEmoji(messageData.reaction);
          
          if (!normalizedEmoji) {
            return; // Skip invalid reactions
          }

          const reaction: Reaction = {
            id: `${messageData.sender}-${messageData.timestamp}`,
            reaction: normalizedEmoji,
            sender: messageData.sender,
            timestamp: messageData.timestamp || Date.now(),
          };

          setReactions((prev) => [...prev, reaction]);

          // Auto-remove reaction after 4 seconds
          setTimeout(() => {
            setReactions((prev) => prev.filter((r) => r.id !== reaction.id));
          }, 4000);
        }
      } catch (error) {
        console.error('Error parsing reaction data:', error);
      }
    };

    room.on('dataReceived', handleDataReceived);

    return () => {
      room.off('dataReceived', handleDataReceived);
    };
  }, [room, participantId]);

  return reactions;
}

