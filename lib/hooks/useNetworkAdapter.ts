import { useEffect, useRef } from 'react';
import { Room, VideoQuality, VideoPresets } from 'livekit-client';
import { QualityLevel } from './useNetworkMonitor';
import { logger } from '../utils/logger';

export interface AdaptationSettings {
  videoQuality: VideoQuality;
  maxBitrate: number;
  simulcast: boolean;
  audioOnly: boolean;
}

/**
 * Hook to automatically adapt video quality based on network conditions
 * Adjusts quality, bitrate, and simulcast settings based on connection quality
 */
export function useNetworkAdapter(room: Room | null, quality: QualityLevel) {
  const previousQualityRef = useRef<QualityLevel | null>(null);
  const adaptationInProgressRef = useRef(false);

  // Get adaptation settings for a given quality level
  const getAdaptationSettings = (qualityLevel: QualityLevel): AdaptationSettings => {
    switch (qualityLevel) {
      case 'excellent':
        return {
          videoQuality: VideoQuality.HIGH,
          maxBitrate: 2500000, // 2.5 Mbps
          simulcast: true,
          audioOnly: false,
        };

      case 'good':
        return {
          videoQuality: VideoQuality.MEDIUM,
          maxBitrate: 1500000, // 1.5 Mbps
          simulcast: true,
          audioOnly: false,
        };

      case 'fair':
        return {
          videoQuality: VideoQuality.LOW,
          maxBitrate: 750000, // 750 kbps
          simulcast: false,
          audioOnly: false,
        };

      case 'poor':
        return {
          videoQuality: VideoQuality.LOW,
          maxBitrate: 300000, // 300 kbps
          simulcast: false,
          audioOnly: true, // Switch to audio-only for poor connections
        };

      default:
        return {
          videoQuality: VideoQuality.MEDIUM,
          maxBitrate: 1500000,
          simulcast: true,
          audioOnly: false,
        };
    }
  };

  // Apply video quality settings
  const applyVideoSettings = async (settings: AdaptationSettings) => {
    if (!room || room.state !== 'connected') {
      return;
    }

    try {
      const localParticipant = room.localParticipant;
      if (!localParticipant) {
        return;
      }

      // Adjust video quality for all remote participants
      room.remoteParticipants.forEach((participant) => {
        participant.videoTrackPublications.forEach((publication) => {
          if (publication.track) {
            publication.setVideoQuality(settings.videoQuality);
          }
        });
      });

      // Adjust local video track if needed
      const localVideoTrack = localParticipant.videoTrackPublications.values().next().value;
      if (localVideoTrack?.track) {
        // For poor connections, prioritize performance
        if (settings.videoQuality === VideoQuality.LOW) {
          localVideoTrack.track.prioritizePerformance();
        }
      }

      logger.debug('Applied video settings:', {
        quality: settings.videoQuality,
        maxBitrate: settings.maxBitrate,
        simulcast: settings.simulcast,
      });
    } catch (error) {
      logger.error('Failed to apply video settings:', error);
    }
  };

  // Switch to audio-only mode
  const switchToAudioOnly = async () => {
    if (!room || room.state !== 'connected') {
      return;
    }

    try {
      const localParticipant = room.localParticipant;
      if (!localParticipant) {
        return;
      }

      // Disable local video
      await localParticipant.setCameraEnabled(false);

      // Disable video for all remote participants
      room.remoteParticipants.forEach((participant) => {
        participant.videoTrackPublications.forEach((publication) => {
          if (publication.track) {
            publication.setVideoQuality(VideoQuality.LOW);
            publication.setEnabled(false);
          }
        });
      });

      logger.debug('Switched to audio-only mode due to poor connection');
    } catch (error) {
      logger.error('Failed to switch to audio-only mode:', error);
    }
  };

  // Adapt to network conditions
  const adaptToNetworkConditions = async (qualityLevel: QualityLevel) => {
    if (adaptationInProgressRef.current) {
      return;
    }

    adaptationInProgressRef.current = true;

    try {
      const settings = getAdaptationSettings(qualityLevel);

      logger.info('Adapting to network conditions:', {
        quality: qualityLevel,
        settings,
      });

      // Apply video quality settings
      await applyVideoSettings(settings);

      // Apply audio settings if needed
      if (settings.audioOnly) {
        await switchToAudioOnly();
      }
    } catch (error) {
      logger.error('Failed to adapt network settings:', error);
    } finally {
      adaptationInProgressRef.current = false;
    }
  };

  // Monitor quality changes and adapt
  useEffect(() => {
    if (!room || room.state !== 'connected') {
      return;
    }

    // Only adapt if quality has changed
    if (previousQualityRef.current === quality) {
      return;
    }

    previousQualityRef.current = quality;
    adaptToNetworkConditions(quality);
  }, [room, quality]);

  return {
    adaptToNetworkConditions,
  };
}

