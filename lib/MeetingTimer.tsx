'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Room } from 'livekit-client';
import { RoomEvent } from 'livekit-client';

interface MeetingTimerProps {
  room: Room | null;
  isConnected: boolean;
}

export function MeetingTimer({ room, isConnected }: MeetingTimerProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (isConnected && room && room.state === 'connected') {
      // Start the timer when connected
      if (startTimeRef.current === null) {
        startTimeRef.current = Date.now();
        setElapsedTime(0); // Initialize to 0
      }

      // Update timer every second
      intervalRef.current = setInterval(() => {
        if (startTimeRef.current !== null) {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setElapsedTime(elapsed);
        }
      }, 1000);

      // Listen for disconnection to reset timer
      const handleDisconnected = () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        startTimeRef.current = null;
        setElapsedTime(0);
      };

      room.on(RoomEvent.Disconnected, handleDisconnected);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        room.off(RoomEvent.Disconnected, handleDisconnected);
      };
    } else {
      // Clear timer when disconnected
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (!isConnected) {
        startTimeRef.current = null;
        setElapsedTime(0);
      }
    }
  }, [isConnected, room]);

  // Format time as HH:MM:SS
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isConnected) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1000,
      padding: '8px 16px',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      color: 'white',
      borderRadius: '20px',
      fontSize: '14px',
      fontWeight: '500',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontFamily: 'monospace'
    }}>
      <span style={{ fontSize: '16px' }}>⏱️</span>
      <span>{formatTime(elapsedTime)}</span>
    </div>
  );
}

