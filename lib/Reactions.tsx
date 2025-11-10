'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRoomContext, useLocalParticipant } from '@livekit/components-react';
import { reactionSoundManager, ReactionType } from './ReactionSound';
import { globalReactions, reactionListeners, Reaction } from './ReactionsManager';

interface ReactionsProps {
  isOpen: boolean;
  onClose: () => void;
  onReactionSent?: () => void;
}

const REACTIONS: ReactionType[] = ['👍', '❤️', '😂', '😮', '👏', '🎉'];

export function Reactions({ isOpen, onClose, onReactionSent }: ReactionsProps) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const sendReaction = async (reaction: ReactionType) => {
    if (!room || !localParticipant) return;

    try {
      const reactionData = {
        type: 'reaction',
        reaction: reaction,
        sender: localParticipant.identity,
        timestamp: Date.now(),
      };

      const encodedData = new TextEncoder().encode(JSON.stringify(reactionData));
      await room.localParticipant.publishData(encodedData, { topic: 'reactions' });

      // Add to global reactions immediately (optimistic update)
      const reactionObj: Reaction = {
        id: `${reactionData.sender}-${reactionData.timestamp}`,
        reaction: reactionData.reaction as ReactionType,
        sender: reactionData.sender,
        timestamp: reactionData.timestamp,
      };
      globalReactions.push(reactionObj);
      reactionListeners.forEach(listener => listener());

      // Play sound for the sent reaction
      reactionSoundManager.play(reactionData.reaction as ReactionType);

      // Auto-remove after 4 seconds
      setTimeout(() => {
        const index = globalReactions.findIndex(r => r.id === reactionObj.id);
        if (index > -1) {
          globalReactions.splice(index, 1);
          reactionListeners.forEach(listener => listener());
        }
      }, 4000);

      // Close the picker
      onClose();
      onReactionSent?.();
    } catch (error) {
      console.error('Error sending reaction:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        bottom: '100px',
        right: '20px',
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        backdropFilter: 'blur(12px)',
        borderRadius: '16px',
        padding: '16px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        zIndex: 100000,
        minWidth: '200px',
      }}
    >
      <div style={{ marginBottom: '12px' }}>
        <h3 style={{
          margin: 0,
          fontSize: '14px',
          fontWeight: '600',
          color: 'rgba(255, 255, 255, 0.9)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          Reactions
        </h3>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px',
      }}>
        {REACTIONS.map((reaction) => (
          <button
            key={reaction}
            onClick={() => sendReaction(reaction)}
            style={{
              fontSize: '32px',
              padding: '12px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '60px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
            title={reaction}
          >
            {reaction}
          </button>
        ))}
      </div>
    </div>
  );
}

