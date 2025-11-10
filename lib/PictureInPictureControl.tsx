'use client';

import React, { useState, useEffect } from 'react';
import { useLocalParticipant } from '@livekit/components-react';
import { Track } from 'livekit-client';
import styles from '@/styles/PictureInPicture.module.css';

interface PictureInPictureControlProps {
  onToggleLocalPiP: (enabled: boolean) => void;
}

export function PictureInPictureControl({ onToggleLocalPiP }: PictureInPictureControlProps) {
  const { localParticipant } = useLocalParticipant();
  const [isLocalCameraEnabled, setIsLocalCameraEnabled] = useState(false);

  // Check if local participant has camera enabled
  useEffect(() => {
    if (!localParticipant) return;

    const checkCameraStatus = () => {
      const cameraTrack = localParticipant.getTrackPublication(Track.Source.Camera);
      const isEnabled = cameraTrack?.isEnabled || false;
      setIsLocalCameraEnabled(isEnabled);
    };

    // Initial check
    checkCameraStatus();

    // Listen for track changes
    const handleTrackPublished = () => checkCameraStatus();
    const handleTrackUnpublished = () => checkCameraStatus();
    const handleTrackMuted = () => checkCameraStatus();
    const handleTrackUnmuted = () => checkCameraStatus();

    localParticipant.on('trackPublished', handleTrackPublished);
    localParticipant.on('trackUnpublished', handleTrackUnpublished);
    localParticipant.on('trackMuted', handleTrackMuted);
    localParticipant.on('trackUnmuted', handleTrackUnmuted);

    return () => {
      localParticipant.off('trackPublished', handleTrackPublished);
      localParticipant.off('trackUnpublished', handleTrackUnpublished);
      localParticipant.off('trackMuted', handleTrackMuted);
      localParticipant.off('trackUnmuted', handleTrackUnmuted);
    };
  }, [localParticipant]);

  // Don't show the control if camera is not enabled
  if (!isLocalCameraEnabled) {
    return null;
  }

  return (
    <button
      onClick={() => onToggleLocalPiP(true)}
      className={styles.pipControlButtonMain}
      title="Show Your Video in Picture-in-Picture"
    >
      <span>📺</span>
      <span>PiP</span>
    </button>
  );
}
