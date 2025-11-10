'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Reactions } from './Reactions';

interface ReactionButtonProps {
  isHost?: boolean;
}

export function ReactionButton({ isHost = false }: ReactionButtonProps) {
  const [isReactionsOpen, setIsReactionsOpen] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);

  const toggleReactions = () => {
    setIsReactionsOpen(!isReactionsOpen);
  };

  const closeReactions = () => {
    setIsReactionsOpen(false);
  };

  return (
    <div ref={buttonRef} className="reaction-button-container" style={{ position: 'relative' }}>
      {/* Reaction Button */}
      <button
        className="reaction-button"
        onClick={toggleReactions}
        style={{
          padding: '12px 16px',
          backgroundColor: isReactionsOpen 
            ? 'rgba(34, 197, 94, 0.9)' 
            : 'rgba(107, 114, 128, 0.9)',
          color: 'white',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '500',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          minWidth: '120px',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
          boxShadow: isReactionsOpen ? '0 4px 12px rgba(0, 0, 0, 0.15)' : 'none'
        }}
        onMouseEnter={(e) => {
          if (!isReactionsOpen) {
            e.currentTarget.style.backgroundColor = 'rgba(75, 85, 99, 0.9)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isReactionsOpen) {
            e.currentTarget.style.backgroundColor = 'rgba(107, 114, 128, 0.9)';
          }
        }}
        title="Send Reaction"
      >
        <span style={{ fontSize: '16px' }}>😊</span>
        Reactions
      </button>

      {/* Reactions Picker */}
      <Reactions
        isOpen={isReactionsOpen}
        onClose={closeReactions}
        onReactionSent={closeReactions}
      />
    </div>
  );
}

