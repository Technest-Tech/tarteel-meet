'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRoomContext, useLocalParticipant, useParticipants, VideoTrack } from '@livekit/components-react';
import { Track, TrackPublication } from 'livekit-client';
import styles from '@/styles/StudentMonitorPiP.module.css';
import { logger } from '@/lib/utils/logger';

interface Position {
  x: number;
  y: number;
}

interface StudentMonitorPiPProps {
  isHost?: boolean;
  disabled?: boolean;
  showProBadge?: boolean;
}

export function StudentMonitorPiP({ isHost = false, disabled = false, showProBadge = false }: StudentMonitorPiPProps) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isManuallyEnabled, setIsManuallyEnabled] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef<Position>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const positionInitialized = useRef(false);
  const manualEnableRef = useRef(false);
  const [mounted, setMounted] = useState(false);
  const [lockedDimensions, setLockedDimensions] = useState<{ width: number; height: number } | null>(null);
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  
  // Persist manual enable state in sessionStorage
  const STORAGE_KEY = 'student-monitor-manually-enabled';
  const MINIMIZED_KEY = 'student-monitor-minimized';
  
  // Ensure component is mounted before rendering portal (client-side only)
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);
  
  // Load persisted state on mount
  useEffect(() => {
    const persisted = sessionStorage.getItem(STORAGE_KEY);
    if (persisted === 'true') {
      manualEnableRef.current = true;
      setIsManuallyEnabled(true);
      logger.log('Restored manual enable state from sessionStorage');
    }
    
    const minimized = sessionStorage.getItem(MINIMIZED_KEY);
    if (minimized === 'true') {
      setIsMinimized(true);
      logger.log('Restored minimized state from sessionStorage');
    }
  }, []);

  // Detect screen sharing
  useEffect(() => {
    if (!room || !localParticipant || room.state !== 'connected') {
      setIsScreenSharing(false);
      return;
    }

    const checkScreenShare = () => {
      try {
        const screenShareTrack = localParticipant.getTrackPublication(Track.Source.ScreenShare);
        const hasScreenShare = screenShareTrack?.isEnabled && !!screenShareTrack?.track;
        
        let foundScreenShare = hasScreenShare;
        if (!foundScreenShare) {
          for (const publication of localParticipant.trackPublications.values()) {
            if (publication.source === Track.Source.ScreenShare && publication.isEnabled && publication.track) {
              foundScreenShare = true;
              break;
            }
          }
        }
        
        setIsScreenSharing(!!foundScreenShare);
      } catch (error) {
        console.error('Error checking screen share:', error);
        setIsScreenSharing(false);
      }
    };

    checkScreenShare();

    const handleTrackPublished = (publication: TrackPublication) => {
      if (publication.source === Track.Source.ScreenShare) {
        checkScreenShare();
      }
    };

    const handleTrackUnpublished = (publication: TrackPublication) => {
      if (publication.source === Track.Source.ScreenShare) {
        checkScreenShare();
      }
    };

    localParticipant.on('trackPublished', handleTrackPublished);
    localParticipant.on('trackUnpublished', handleTrackUnpublished);

    return () => {
      if (localParticipant) {
        localParticipant.off('trackPublished', handleTrackPublished);
        localParticipant.off('trackUnpublished', handleTrackUnpublished);
      }
    };
  }, [room, localParticipant]);

  // Initialize position - start at 0,0 (base position set in CSS like PictureInPicture)
  useEffect(() => {
    if ((isScreenSharing || isManuallyEnabled || manualEnableRef.current) && !positionInitialized.current) {
      setPosition({ x: 0, y: 0 });
      positionInitialized.current = true;
    }
    
    if (!isScreenSharing && !isManuallyEnabled && !manualEnableRef.current) {
      positionInitialized.current = false;
      setPosition({ x: 0, y: 0 });
    }
  }, [isScreenSharing, isManuallyEnabled]);

  // Debounce position updates to prevent excessive re-renders
  const positionUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Handle dragging - EXACTLY like PictureInPicture
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest(`.${styles.dragHandle}`) || target.closest(`.${styles.header}`)) {
      e.preventDefault();
      e.stopPropagation();
      
      // Lock dimensions when dragging starts
      if (containerRef.current) {
        setLockedDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        });
      }
      
      isDragging.current = true;
      dragStart.current = { x: e.clientX, y: e.clientY };
      
      const handleMouseMove = (e: MouseEvent) => {
        if (isDragging.current) {
          const deltaX = e.clientX - dragStart.current.x;
          const deltaY = e.clientY - dragStart.current.y;
          
          // Debounce position updates (update every 16ms for ~60fps)
          if (positionUpdateTimeoutRef.current) {
            clearTimeout(positionUpdateTimeoutRef.current);
          }
          
          positionUpdateTimeoutRef.current = setTimeout(() => {
            setPosition(prev => ({
              x: prev.x + deltaX,
              y: prev.y + deltaY
            }));
          }, 16);
          
          dragStart.current = { x: e.clientX, y: e.clientY };
        }
      };
      
      const handleMouseUp = () => {
        isDragging.current = false;
        setLockedDimensions(null);
        if (positionUpdateTimeoutRef.current) {
          clearTimeout(positionUpdateTimeoutRef.current);
          positionUpdateTimeoutRef.current = null;
        }
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
  }, []);

  // Only show for hosts
  if (!isHost) {
    return null;
  }

  // Filter students (remote participants with camera) - memoized to prevent recalculation
  const students = React.useMemo(() => {
    return participants.filter(participant => {
      try {
        const cameraTrack = participant.getTrackPublication(Track.Source.Camera);
        return cameraTrack?.isEnabled && !!cameraTrack?.track;
      } catch {
        return false;
      }
    });
  }, [participants]);

  // Handle manual enable
  const handleManualEnable = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    manualEnableRef.current = true;
    setIsManuallyEnabled(true);
    sessionStorage.setItem(STORAGE_KEY, 'true');
  }, []);

  // Sync ref with state and persist
  useEffect(() => {
    if (isManuallyEnabled) {
      manualEnableRef.current = true;
      sessionStorage.setItem(STORAGE_KEY, 'true');
    } else if (!isManuallyEnabled && !isScreenSharing) {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, [isManuallyEnabled, isScreenSharing]);

  // Persist minimized state
  useEffect(() => {
    if (isMinimized) {
      sessionStorage.setItem(MINIMIZED_KEY, 'true');
    } else {
      sessionStorage.removeItem(MINIMIZED_KEY);
    }
  }, [isMinimized]);

  // Open Document Picture-in-Picture window
  const openDocumentPiP = useCallback(async () => {
    try {
      // Check if Document PiP API is supported
      if ('documentPictureInPicture' in window) {
        const pip = await (window as any).documentPictureInPicture.requestWindow({
          width: 600,
          height: 400,
        });
        
        // Copy all stylesheets to the PiP window
        [...document.styleSheets].forEach((styleSheet) => {
          try {
            const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join('');
            const style = pip.document.createElement('style');
            style.textContent = cssRules;
            pip.document.head.appendChild(style);
          } catch (e) {
            // Some stylesheets might have CORS issues, try linking them instead
            const link = pip.document.createElement('link');
            link.rel = 'stylesheet';
            link.href = (styleSheet as any).href;
            pip.document.head.appendChild(link);
          }
        });
        
        // Handle PiP window close event
        const handlePipClose = () => {
          logger.log('PiP window closed, returning to main window');
          setPipWindow(null);
        };
        
        pip.addEventListener('pagehide', handlePipClose);
        pip.addEventListener('unload', handlePipClose);
        
        setPipWindow(pip);
      } else {
        alert('Document Picture-in-Picture is not supported in this browser. Try Chrome 116+');
      }
    } catch (error) {
      console.error('Failed to open PiP window:', error);
    }
  }, []);

  // Close Document PiP window
  const closeDocumentPiP = useCallback(() => {
    logger.log('Closing PiP window manually');
    
    // Reset drag state to prevent stuck dragging
    isDragging.current = false;
    setLockedDimensions(null);
    
    if (pipWindow && !pipWindow.closed) {
      pipWindow.close();
    }
    setPipWindow(null);
  }, [pipWindow]);

  // Cleanup PiP window on unmount
  useEffect(() => {
    return () => {
      if (pipWindow && !pipWindow.closed) {
        pipWindow.close();
      }
    };
  }, [pipWindow]);

  // Show if screen sharing OR manually enabled
  const persistedEnabled = typeof window !== 'undefined' && sessionStorage.getItem(STORAGE_KEY) === 'true';
  const shouldShow = (isScreenSharing || isManuallyEnabled || manualEnableRef.current || persistedEnabled);

  // Show toggle button if monitor is not shown
  if (!shouldShow && !isScreenSharing) {
    const toggleButton = (
      <div
        style={{
          position: 'fixed',
          top: '80px',
          right: '20px',
          zIndex: 9000,
          background: disabled ? 'rgba(17, 24, 39, 0.5)' : 'rgba(17, 24, 39, 0.95)',
          backdropFilter: 'blur(12px)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '12px 16px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          opacity: disabled ? 0.6 : 1
        }}
        onClick={disabled ? undefined : handleManualEnable}
        onMouseEnter={(e) => {
          if (!disabled) {
            e.currentTarget.style.background = 'rgba(17, 24, 39, 1)';
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled) {
            e.currentTarget.style.background = 'rgba(17, 24, 39, 0.95)';
          }
        }}
        title={disabled ? "This feature requires an upgrade" : "Show Student Monitor"}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: 'white',
          fontSize: '14px',
          fontWeight: '500'
        }}>
          <span>👥</span>
          <span>Show Student Monitor{students.length > 0 ? ` (${students.length})` : ''}</span>
          {showProBadge && (
            <span style={{
              padding: '2px 8px',
              background: 'linear-gradient(to right, #a855f7, #ec4899)',
              color: 'white',
              fontSize: '10px',
              fontWeight: 'bold',
              borderRadius: '4px',
              marginLeft: '4px'
            }}>
              PRO
            </span>
          )}
        </div>
      </div>
    );
    return mounted && typeof document !== 'undefined' ? createPortal(toggleButton, document.body) : null;
  }

  // Don't show if conditions not met or feature is disabled
  if (!shouldShow || disabled) {
    return null;
  }

  // Calculate grid columns based on student count
  const getGridColumns = () => {
    if (students.length <= 2) return 1;
    if (students.length <= 4) return 2;
    if (students.length <= 9) return 3;
    return 4;
  };

  if (isMinimized) {
    const minimizedContainer = (
      <div
        ref={containerRef}
        className={styles.container}
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          width: '200px',
          height: '40px',
          cursor: 'pointer',
          zIndex: 999999,
          ...(lockedDimensions && {
            width: `${lockedDimensions.width}px`,
            height: `${lockedDimensions.height}px`
          })
        }}
        onClick={(e) => {
          e.stopPropagation();
          setIsMinimized(false);
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(17, 24, 39, 1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(17, 24, 39, 0.95)';
        }}
        title="Click to expand Student Monitor"
      >
        <div 
          className={styles.minimizedBar}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            height: '100%',
            width: '100%'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className={styles.minimizedIcon}>👥</span>
            <span className={styles.minimizedText}>
              {students.length > 0 
                ? `${students.length} Student${students.length !== 1 ? 's' : ''}`
                : 'Student Monitor'}
            </span>
          </div>
          <button
            className={styles.expandButton}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(false);
            }}
            title="Expand"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: '16px',
              padding: '4px'
            }}
          >
            ⬆️
          </button>
        </div>
      </div>
    );
    return mounted && typeof document !== 'undefined' ? createPortal(minimizedContainer, document.body) : null;
  }

  const mainContainer = (
    <div
      ref={containerRef}
      className={styles.container}
      style={{
        // Use transform like PictureInPicture - base position set in CSS
        transform: `translate(${position.x}px, ${position.y}px)`,
        // Lock dimensions during drag to prevent resizing
        ...(lockedDimensions && {
          width: `${lockedDimensions.width}px`,
          height: `${lockedDimensions.height}px`
        })
      }}
    >
      {/* Header with drag handle */}
      <div className={styles.header} onMouseDown={handleMouseDown}>
        <div className={styles.dragHandle}>
          <span className={styles.dragIcon}>⋮⋮</span>
          <span className={styles.title}>
            Student Monitor{students.length > 0 ? ` (${students.length})` : ''}
            {isScreenSharing && <span style={{ fontSize: '10px', marginLeft: '6px', opacity: 0.7 }}>📺</span>}
          </span>
        </div>
        <div className={styles.headerButtons}>
          {!pipWindow && (
            <button
              className={styles.minimizeButton}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.stopPropagation();
                openDocumentPiP();
              }}
              title="Open in Picture-in-Picture window (can move outside browser)"
              style={{ fontSize: '14px' }}
            >
              📺
            </button>
          )}
          {pipWindow && (
            <button
              className={styles.minimizeButton}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.stopPropagation();
                closeDocumentPiP();
              }}
              title="Close Picture-in-Picture window"
              style={{ fontSize: '14px', background: 'rgba(59, 130, 246, 0.3)' }}
            >
              📺
            </button>
          )}
          {!isScreenSharing && (
            <button
              className={styles.minimizeButton}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.stopPropagation();
                manualEnableRef.current = false;
                setIsManuallyEnabled(false);
                sessionStorage.removeItem(STORAGE_KEY);
              }}
              title="Close"
              style={{ fontSize: '14px' }}
            >
              ✕
            </button>
          )}
          <button
            className={styles.minimizeButton}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(true);
            }}
            title="Minimize"
          >
            ➖
          </button>
        </div>
      </div>

      {/* Student grid */}
      {students.length > 0 ? (
        <div
          className={styles.studentsGrid}
          style={{
            gridTemplateColumns: `repeat(${getGridColumns()}, 1fr)`
          }}
        >
          {students.map((student) => {
            const cameraTrack = student.getTrackPublication(Track.Source.Camera);
            const audioTrack = student.getTrackPublication(Track.Source.Microphone);
            const isMuted = !audioTrack?.isEnabled || audioTrack?.isMuted;

            return (
              <div key={student.sid} className={styles.studentCard}>
                {cameraTrack?.track ? (
                  <div className={styles.videoContainer}>
                    <VideoTrack
                      trackRef={{
                        participant: student,
                        publication: cameraTrack,
                        source: Track.Source.Camera
                      }}
                      className={styles.studentVideo}
                    />
                    {isMuted && (
                      <div className={styles.muteIndicator} title="Muted">
                        🔇
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={styles.placeholder}>
                    <div className={styles.placeholderInitial}>
                      {student.identity.charAt(0).toUpperCase()}
                    </div>
                    {isMuted && (
                      <div className={styles.muteIndicator} title="Muted">
                        🔇
                      </div>
                    )}
                  </div>
                )}
                <div className={styles.studentName} title={student.identity}>
                  {student.identity.length > 12
                    ? `${student.identity.substring(0, 12)}...`
                    : student.identity}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{
          padding: '40px 20px',
          textAlign: 'center',
          color: 'rgba(255, 255, 255, 0.6)',
          fontSize: '14px'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>👥</div>
          <div>No students with cameras active</div>
        </div>
      )}
    </div>
  );

  // Render via portal to document.body to escape all parent constraints
  // This ensures it's completely independent of any parent overflow/positioning constraints
  if (!mounted || typeof document === 'undefined') {
    logger.debug('StudentMonitor: Not mounted or document undefined');
    return null;
  }

  // If PiP window is open and valid, render to PiP window instead
  if (pipWindow && !pipWindow.closed && pipWindow.document && pipWindow.document.body) {
    logger.debug('StudentMonitor: Rendering to PiP window');
    return createPortal(mainContainer, pipWindow.document.body);
  }

  // Verify portal target exists
  const portalTarget = document.body;
  if (!portalTarget) {
    logger.error('Student Monitor PiP: document.body not available for portal');
    return null;
  }

  logger.debug('StudentMonitor: Rendering to main document.body');
  return createPortal(mainContainer, portalTarget);
}

