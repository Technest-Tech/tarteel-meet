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

  // Handle incoming reactions
  useEffect(() => {
    if (!room) return;

    const handleDataReceived = (data: Uint8Array, participant?: any) => {
      try {
        const messageString = new TextDecoder().decode(data);
        const messageData = JSON.parse(messageString);

        if (messageData.type === 'reaction') {
          // Validate and normalize emoji string
          const emojiString = String(messageData.reaction || '').trim();
          const validEmojis: ReactionType[] = ['👍', '❤️', '😂', '😮', '👏', '🎉'];
          const isValidEmoji = validEmojis.includes(emojiString as ReactionType);
          
          if (!isValidEmoji || !emojiString) {
            console.warn('Invalid reaction emoji received:', emojiString);
            return; // Skip invalid reactions
          }

          const reaction: Reaction = {
            id: `${messageData.sender}-${messageData.timestamp}`,
            reaction: emojiString as ReactionType,
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

  useEffect(() => {
    if (!room) return;

    const handleDataReceived = (data: Uint8Array, participant?: any) => {
      try {
        const messageString = new TextDecoder().decode(data);
        const messageData = JSON.parse(messageString);

        if (messageData.type === 'reaction' && messageData.sender === participantId) {
          const reaction: Reaction = {
            id: `${messageData.sender}-${messageData.timestamp}`,
            reaction: messageData.reaction,
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

