'use client';

import React, { useState, useEffect } from 'react';
import { ReactionType } from './ReactionSound';

interface ReactionOverlayProps {
  participantId: string;
  reactions: Array<{
    reaction: ReactionType;
    sender: string;
    timestamp: number;
    id: string;
  }>;
}

export function ReactionOverlay({ participantId, reactions }: ReactionOverlayProps) {
  const [displayedReactions, setDisplayedReactions] = useState<Array<{
    reaction: ReactionType;
    sender: string;
    timestamp: number;
    id: string;
    animationKey: number;
  }>>([]);

  useEffect(() => {
    // Filter reactions for this participant and add animation keys
    const participantReactions = reactions
      .filter((r) => r.sender === participantId)
      .map((r, index) => ({
        ...r,
        animationKey: Date.now() + index, // Unique key for animation
      }));

    setDisplayedReactions(participantReactions);

    // Auto-dismiss reactions after 4 seconds
    const timers = participantReactions.map((reaction) => {
      return setTimeout(() => {
        setDisplayedReactions((prev) =>
          prev.filter((r) => r.animationKey !== reaction.animationKey)
        );
      }, 4000);
    });

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [reactions, participantId]);

  if (displayedReactions.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1000,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      {displayedReactions.map((reaction) => (
        <div
          key={reaction.animationKey}
          className="reaction-emoji"
          style={{
            fontSize: '48px',
            animation: 'reactionPopIn 0.3s ease-out, reactionFadeOut 0.5s ease-in 3.5s',
            opacity: 1,
            transform: 'scale(1)',
            filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))',
          }}
        >
          {reaction.reaction}
        </div>
      ))}
      <style jsx>{`
        @keyframes reactionPopIn {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes reactionFadeOut {
          0% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            opacity: 0;
            transform: scale(0.8);
          }
        }
      `}</style>
    </div>
  );
}

