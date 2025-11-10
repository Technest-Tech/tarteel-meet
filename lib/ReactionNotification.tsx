'use client';

import React, { useEffect } from 'react';
import toast from 'react-hot-toast';
import { ReactionType } from './ReactionSound';
import { reactionSoundManager } from './ReactionSound';

interface ReactionNotificationProps {
  reaction: ReactionType;
  sender: string;
  isLocal: boolean;
}

export function ReactionNotification({ reaction, sender, isLocal }: ReactionNotificationProps) {
  useEffect(() => {
    // Only show notification and play sound for non-local reactions
    if (!isLocal) {
      // Play sound for received reaction (will use unique sound per reaction)
      reactionSoundManager.play(reaction);

      // Show toast notification
      toast(
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          minWidth: '200px',
        }}>
          <span style={{ fontSize: '24px' }}>{reaction}</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{
              fontWeight: '600',
              fontSize: '14px',
              color: '#1f2937',
            }}>
              {sender}
            </span>
            <span style={{
              fontSize: '12px',
              color: '#6b7280',
            }}>
              sent a reaction
            </span>
          </div>
        </div>,
        {
          duration: 3000,
          position: 'top-right',
          style: {
            backgroundColor: '#ffffff',
            color: '#1f2937',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            padding: '12px 16px',
            maxWidth: '350px',
          },
          icon: reaction,
        }
      );
    }
  }, [reaction, sender, isLocal]);

  return null; // This component only triggers side effects
}

