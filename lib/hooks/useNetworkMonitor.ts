import { useEffect, useState, useRef } from 'react';
import { Room, RoomEvent, ConnectionQuality, Participant } from 'livekit-client';
import { logger } from '../utils/logger';

export type QualityLevel = 'excellent' | 'good' | 'fair' | 'poor';

export interface ConnectionStats {
  quality: QualityLevel;
  bitrate: number;
  packetLoss: number;
  latency: number;
  jitter: number;
  lastUpdated: number;
}

const MONITORING_INTERVAL_MS = 5000; // Check every 5 seconds

/**
 * Hook to monitor network connection quality
 * Tracks packet loss, latency, jitter, and bitrate
 */
export function useNetworkMonitor(room: Room | null) {
  const [quality, setQuality] = useState<QualityLevel>('good');
  const [stats, setStats] = useState<ConnectionStats>({
    quality: 'good',
    bitrate: 0,
    packetLoss: 0,
    latency: 0,
    jitter: 0,
    lastUpdated: Date.now(),
  });
  const monitoringIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const statsRef = useRef<ConnectionStats>(stats);

  // Map LiveKit ConnectionQuality to our QualityLevel
  const mapLiveKitQuality = (lkQuality: ConnectionQuality): QualityLevel => {
    switch (lkQuality) {
      case ConnectionQuality.Excellent:
        return 'excellent';
      case ConnectionQuality.Good:
        return 'good';
      case ConnectionQuality.Poor:
        return 'fair';
      case ConnectionQuality.Lost:
        return 'poor';
      default:
        return 'good';
    }
  };

  // Calculate quality level from statistics
  const calculateQualityFromStats = (connectionStats: ConnectionStats): QualityLevel => {
    let score = 100;

    // Deduct points for packet loss (0-40 points)
    if (connectionStats.packetLoss > 10) {
      score -= 40;
    } else if (connectionStats.packetLoss > 5) {
      score -= 30;
    } else if (connectionStats.packetLoss > 2) {
      score -= 20;
    } else if (connectionStats.packetLoss > 0.5) {
      score -= 10;
    }

    // Deduct points for latency (0-30 points)
    if (connectionStats.latency > 300) {
      score -= 30;
    } else if (connectionStats.latency > 200) {
      score -= 20;
    } else if (connectionStats.latency > 100) {
      score -= 10;
    }

    // Deduct points for jitter (0-20 points)
    if (connectionStats.jitter > 50) {
      score -= 20;
    } else if (connectionStats.jitter > 30) {
      score -= 15;
    } else if (connectionStats.jitter > 15) {
      score -= 10;
    }

    // Deduct points for low bitrate (0-10 points)
    if (connectionStats.bitrate < 100000) {
      score -= 10;
    } else if (connectionStats.bitrate < 500000) {
      score -= 5;
    }

    // Map score to quality level
    if (score >= 85) {
      return 'excellent';
    } else if (score >= 70) {
      return 'good';
    } else if (score >= 50) {
      return 'fair';
    } else {
      return 'poor';
    }
  };

  // Collect connection statistics
  const collectStats = async () => {
    if (!room || room.state !== 'connected') {
      return;
    }

    try {
      const localParticipant = room.localParticipant;
      if (!localParticipant) {
        return;
      }

      // Get the first available track for stats
      const tracks = Array.from(localParticipant.trackPublications.values());
      if (tracks.length === 0) {
        return;
      }

      const track = tracks[0].track;
      if (!track || !track.mediaStreamTrack) {
        return;
      }

      // Get WebRTC stats via RTCPeerConnection
      const rtcStats = await track.sender?.getStats();
      if (!rtcStats) {
        return;
      }

      let totalBitrate = 0;
      let totalPacketLoss = 0;
      let totalLatency = 0;
      let totalJitter = 0;
      let statsCount = 0;

      rtcStats.forEach((report) => {
        // Outbound RTP stats
        if (report.type === 'outbound-rtp') {
          if (report.bytesSent) {
            const bytesPerSecond = report.bytesSent / (Date.now() - statsRef.current.lastUpdated) * 1000;
            totalBitrate += bytesPerSecond * 8; // Convert to bits per second
          }
          
          if (report.fractionLost !== undefined) {
            totalPacketLoss += report.fractionLost * 100;
          }
          
          statsCount++;
        }

        // Candidate pair stats (for RTT/latency)
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          if (report.currentRoundTripTime !== undefined) {
            totalLatency += report.currentRoundTripTime * 1000; // Convert to ms
          }
          statsCount++;
        }

        // Remote inbound RTP stats (for jitter)
        if (report.type === 'remote-inbound-rtp') {
          if (report.jitter !== undefined) {
            totalJitter += report.jitter * 1000; // Convert to ms
          }
          statsCount++;
        }
      });

      // Calculate averages
      if (statsCount > 0) {
        const newStats: ConnectionStats = {
          quality: statsRef.current.quality,
          bitrate: totalBitrate / statsCount,
          packetLoss: totalPacketLoss / statsCount,
          latency: totalLatency / statsCount,
          jitter: totalJitter / statsCount,
          lastUpdated: Date.now(),
        };

        // Determine quality based on stats
        const calculatedQuality = calculateQualityFromStats(newStats);
        newStats.quality = calculatedQuality;

        statsRef.current = newStats;
        setStats(newStats);
        setQuality(calculatedQuality);
      }
    } catch (error) {
      logger.warn('Failed to collect connection stats:', error);
    }
  };

  // Handle LiveKit connection quality change event
  const handleQualityChange = (lkQuality: ConnectionQuality, participant: Participant | undefined) => {
    // Only monitor local participant quality
    if (participant && participant !== room?.localParticipant) {
      return;
    }

    logger.debug('Connection quality changed:', lkQuality);
    const qualityLevel = mapLiveKitQuality(lkQuality);
    setQuality(qualityLevel);
    
    // Update stats with new quality
    setStats(prev => ({ ...prev, quality: qualityLevel }));
    statsRef.current = { ...statsRef.current, quality: qualityLevel };
  };

  // Start monitoring
  useEffect(() => {
    if (!room) {
      return;
    }

    // Setup LiveKit connection quality events
    room.on(RoomEvent.ConnectionQualityChanged, handleQualityChange);

    // Start periodic stats collection
    monitoringIntervalRef.current = setInterval(() => {
      collectStats();
    }, MONITORING_INTERVAL_MS);

    // Collect initial stats
    collectStats();

    return () => {
      if (monitoringIntervalRef.current) {
        clearInterval(monitoringIntervalRef.current);
        monitoringIntervalRef.current = null;
      }
      room.off(RoomEvent.ConnectionQualityChanged, handleQualityChange);
    };
  }, [room]);

  return {
    quality,
    stats,
  };
}

