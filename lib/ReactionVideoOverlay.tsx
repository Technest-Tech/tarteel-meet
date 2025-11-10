'use client';

import React, { useEffect, useState } from 'react';
import { useRoomContext, useLocalParticipant, useParticipants } from '@livekit/components-react';
import { ReactionType } from './ReactionSound';
import { globalReactions, reactionListeners } from './ReactionsManager';

interface Reaction {
  id: string;
  reaction: ReactionType;
  sender: string;
  timestamp: number;
}

export function ReactionVideoOverlay() {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [, forceUpdate] = useState({});

  // Listen for reactions from ReactionsManager only (not directly from room)
  // This prevents duplicates since ReactionsManager already handles deduplication

  // Listen for reactions from ReactionsManager
  useEffect(() => {
    const updateReactions = () => {
      setReactions([...globalReactions]);
      forceUpdate({});
    };

    // Add listener
    reactionListeners.add(updateReactions);

    // Initial load
    setReactions([...globalReactions]);

    return () => {
      reactionListeners.delete(updateReactions);
    };
  }, []);

  // Inject reaction overlays into video tiles
  useEffect(() => {
    const updateOverlays = () => {
      // Get all participants (local + remote)
      const allParticipants = [
        ...(localParticipant ? [localParticipant] : []),
        ...participants,
      ];

      allParticipants.forEach((participant) => {
        const participantId = participant.identity;
        const participantReactions = reactions.filter((r) => r.sender === participantId);

        if (participantReactions.length === 0) return;

        // Debug log
        console.log('🔍 Looking for video tile for participant:', participantId, 'with', participantReactions.length, 'reactions');

        // Find the video tile for this participant
        // LiveKit uses various selectors - try multiple approaches
        let videoTile: HTMLElement | null = null;

        // Method 1: Look for LiveKit participant tile class (most reliable)
        const lkTiles = Array.from(document.querySelectorAll('.lk-participant-tile, [class*="lk-participant"]'));
        videoTile = lkTiles.find((el) => {
          const text = el.textContent || '';
          const ariaLabel = el.getAttribute('aria-label') || '';
          return text.includes(participantId) || 
                 text.includes(participant.name || '') ||
                 ariaLabel.includes(participantId);
        }) as HTMLElement || null;

        // Method 2: Look for data attributes
        if (!videoTile) {
          videoTile = document.querySelector(
            `[data-lk-participant="${participantId}"], [data-participant="${participantId}"], [data-identity="${participantId}"]`
          ) as HTMLElement;
        }

        // Method 3: Look for participant name in text content
        if (!videoTile) {
          const allTiles = Array.from(document.querySelectorAll(
            '[class*="participant"], [class*="video"], [class*="lk-"], video, [class*="grid"] > *'
          ));
          
          videoTile = allTiles.find((el) => {
            const text = el.textContent || '';
            const ariaLabel = el.getAttribute('aria-label') || '';
            return text.includes(participantId) || 
                   text.includes(participant.name || '') ||
                   ariaLabel.includes(participantId) ||
                   el.getAttribute('data-identity') === participantId;
          }) as HTMLElement || null;
        }

        // Method 3: Look for video elements and check their parent containers
        if (!videoTile) {
          const videoElements = Array.from(document.querySelectorAll('video'));
          for (const video of videoElements) {
            // Check if this video belongs to our participant
            const container = video.closest('[class*="participant"], [class*="lk-"], [class*="grid"] > *') as HTMLElement;
            if (container) {
              const containerText = container.textContent || '';
              if (containerText.includes(participantId)) {
                videoTile = container;
                break;
              }
            }
          }
        }

        // Method 4: Use LiveKit's participant tracking - find by participant name/identity
        if (!videoTile) {
          // Look for elements containing the participant's name
          const nameElements = Array.from(document.querySelectorAll('*')).filter((el) => {
            return el.textContent?.trim() === participantId || 
                   el.textContent?.trim() === participant.name ||
                   el.getAttribute('aria-label') === participantId;
          });
          
          if (nameElements.length > 0) {
            // Find the closest video container
            videoTile = nameElements[0].closest('[class*="participant"], [class*="video"], [class*="lk-"]') as HTMLElement;
          }
        }

        if (videoTile) {
          console.log('✅ Found video tile for', participantId);
          injectReactionOverlay(videoTile, participantReactions);
        } else {
          console.warn('⚠️ Could not find video tile for participant:', participantId, 'trying fallback...');
          // Fallback: Try to inject into any visible video container
          // This is a last resort - might show on wrong tile but better than nothing
          const fallbackTile = document.querySelector('[class*="lk-grid"], [class*="participant"], video')?.parentElement as HTMLElement;
          if (fallbackTile) {
            console.log('✅ Using fallback tile for', participantId);
            injectReactionOverlay(fallbackTile, participantReactions);
          } else {
            console.error('❌ Could not find any video tile for participant:', participantId);
          }
        }
      });
    };

    const injectReactionOverlay = (tile: HTMLElement, participantReactions: Reaction[]) => {
      // Remove existing overlay for this participant
      const existingOverlay = tile.querySelector('.reaction-overlay-container');
      if (existingOverlay) {
        existingOverlay.remove();
      }

      if (participantReactions.length === 0) return;

      // Find the video container within the tile (could be .lk-participant-tile-video or video element)
      const videoContainer = tile.querySelector('.lk-participant-tile-video, video, [class*="video"]') as HTMLElement || tile;

      // Create overlay container
      const overlay = document.createElement('div');
      overlay.className = 'reaction-overlay-container';
      overlay.setAttribute('data-participant-id', participantReactions[0].sender);
      overlay.style.cssText = `
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        top: 0;
        z-index: 10000;
        pointer-events: none;
        overflow: visible;
      `;

      // Show the most recent reaction (or all if multiple)
      const recentReactions = participantReactions
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 3); // Show max 3 reactions at once

      recentReactions.forEach((reaction, index) => {
        const emoji = document.createElement('div');
        emoji.className = 'reaction-emoji';
        emoji.textContent = reaction.reaction;
        emoji.setAttribute('data-reaction-id', reaction.id);
        // Stagger multiple reactions horizontally
        const horizontalOffset = (index - (recentReactions.length - 1) / 2) * 30;
        
        emoji.style.cssText = `
          font-size: 64px;
          filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5));
          position: absolute;
          bottom: 30px;
          left: calc(50% + ${horizontalOffset}px);
          margin-left: -32px;
          z-index: ${1000 + index};
          will-change: transform, opacity;
          pointer-events: none;
        `;
        
        // Initial state - start at bottom, visible
        emoji.style.opacity = '1';
        emoji.style.transform = `translateY(0px) translateX(${horizontalOffset}px) scale(1)`;
        
        // Start smooth animation from bottom to top
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            emoji.style.transition = 'transform 3s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 2.5s ease-out';
            emoji.style.transform = `translateY(-350px) translateX(${horizontalOffset}px) scale(0.4)`;
            emoji.style.opacity = '0';
          });
        });
        
        overlay.appendChild(emoji);
        
        // Remove after animation completes
        setTimeout(() => {
          if (emoji.parentElement) {
            emoji.remove();
          }
        }, 3000);
      });

      // Ensure container has position relative
      const containerStyle = getComputedStyle(videoContainer);
      if (containerStyle.position === 'static' || containerStyle.position === '') {
        videoContainer.style.position = 'relative';
      }

      // Append to video container, not the tile
      videoContainer.appendChild(overlay);

      // Debug log
      console.log('✅ Reaction overlay injected for participant:', participantReactions[0].sender, 'on tile:', tile);
    };

    // Update overlays when reactions or participants change
    updateOverlays();

    // Also update periodically to catch dynamically added video tiles
    const interval = setInterval(() => {
      if (reactions.length > 0) {
        updateOverlays();
      }
    }, 200);

    // No CSS animations needed - using CSS transitions instead

    return () => {
      clearInterval(interval);
    };
  }, [reactions, participants, localParticipant]);

  return null; // This component only handles side effects
}

