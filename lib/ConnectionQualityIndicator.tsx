'use client';

import React, { useState } from 'react';
import { QualityLevel, ConnectionStats } from './hooks/useNetworkMonitor';

interface ConnectionQualityIndicatorProps {
  quality: QualityLevel;
  stats: ConnectionStats;
}

/**
 * Visual indicator showing connection quality with signal strength icon
 * Color-coded: green (excellent), yellow (good), orange (fair), red (poor)
 * Shows detailed stats on hover
 */
export function ConnectionQualityIndicator({ quality, stats }: ConnectionQualityIndicatorProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const getQualityColor = () => {
    switch (quality) {
      case 'excellent':
        return '#22c55e'; // green
      case 'good':
        return '#eab308'; // yellow
      case 'fair':
        return '#f97316'; // orange
      case 'poor':
        return '#ef4444'; // red
      default:
        return '#6b7280'; // gray
    }
  };

  const getQualityLabel = () => {
    switch (quality) {
      case 'excellent':
        return 'Excellent';
      case 'good':
        return 'Good';
      case 'fair':
        return 'Fair';
      case 'poor':
        return 'Poor';
      default:
        return 'Unknown';
    }
  };

  const formatBitrate = (bitsPerSecond: number): string => {
    if (bitsPerSecond >= 1000000) {
      return `${(bitsPerSecond / 1000000).toFixed(2)} Mbps`;
    } else if (bitsPerSecond >= 1000) {
      return `${(bitsPerSecond / 1000).toFixed(0)} kbps`;
    }
    return `${bitsPerSecond.toFixed(0)} bps`;
  };

  const formatLatency = (ms: number): string => {
    return `${ms.toFixed(0)} ms`;
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: '20px',
        backdropFilter: 'blur(10px)',
        border: `1px solid ${getQualityColor()}`,
        cursor: 'pointer',
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Signal strength icon */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '16px' }}>
        {[1, 2, 3, 4].map((bar) => {
          const isActive = bar <= (quality === 'excellent' ? 4 : quality === 'good' ? 3 : quality === 'fair' ? 2 : 1);
          return (
            <div
              key={bar}
              style={{
                width: '3px',
                height: `${bar * 3}px`,
                backgroundColor: isActive ? getQualityColor() : 'rgba(255, 255, 255, 0.3)',
                borderRadius: '1px',
                transition: 'background-color 0.2s',
              }}
            />
          );
        })}
      </div>

      {/* Quality label */}
      <span
        style={{
          color: 'white',
          fontSize: '12px',
          fontWeight: '500',
        }}
      >
        {getQualityLabel()}
      </span>

      {/* Tooltip with detailed stats */}
      {showTooltip && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: '0',
            marginTop: '8px',
            padding: '12px',
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            borderRadius: '8px',
            minWidth: '200px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            border: `1px solid ${getQualityColor()}`,
            zIndex: 1001,
          }}
        >
          <div style={{ color: 'white', fontSize: '12px', lineHeight: '1.6' }}>
            <div style={{ fontWeight: '600', marginBottom: '8px', color: getQualityColor() }}>
              Connection Quality: {getQualityLabel()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Bitrate:</span>
                <span>{formatBitrate(stats.bitrate)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Latency:</span>
                <span>{formatLatency(stats.latency)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Packet Loss:</span>
                <span>{stats.packetLoss.toFixed(2)}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Jitter:</span>
                <span>{formatLatency(stats.jitter)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

