'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRoomContext, useLocalParticipant, useParticipants } from '@livekit/components-react';
import toast from 'react-hot-toast';
import styles from '@/styles/Chat.module.css';

type MessageType = 'public' | 'private';

interface ChatMessage {
  id: string;
  sender: string;
  message: string;
  timestamp: number;
  isLocal: boolean;
  messageType: MessageType;
  recipient?: string | null;
}

interface ChatProps {
  isOpen: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
}

export function Chat({ isOpen, onClose, onUnreadCountChange }: ChatProps) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [messageMode, setMessageMode] = useState<MessageType>('public');
  const [selectedRecipient, setSelectedRecipient] = useState<string | null>(null);
  const [showRecipientSelector, setShowRecipientSelector] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recipientSelectorRef = useRef<HTMLDivElement>(null);

  // Get available recipients (all participants except local)
  const availableRecipients = React.useMemo(() => {
    const all = [...participants];
    if (localParticipant) {
      all.push(localParticipant);
    }
    return all.filter(p => p.identity !== localParticipant?.identity);
  }, [participants, localParticipant]);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Focus input when chat opens and reset unread count
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      // Reset unread count when chat is opened
      setUnreadCount(0);
      onUnreadCountChange?.(0);
    }
  }, [isOpen, onUnreadCountChange]);

  // Close recipient selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (recipientSelectorRef.current && !recipientSelectorRef.current.contains(event.target as Node)) {
        setShowRecipientSelector(false);
      }
    };

    if (showRecipientSelector) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showRecipientSelector]);

  // Reset recipient when switching to public mode
  useEffect(() => {
    if (messageMode === 'public') {
      setSelectedRecipient(null);
      setShowRecipientSelector(false);
    }
  }, [messageMode]);

  // Handle room connection state
  useEffect(() => {
    if (room) {
      setIsConnected(room.state === 'connected');
      
      const handleConnectionStateChange = () => {
        setIsConnected(room.state === 'connected');
      };

      room.on('connectionStateChanged', handleConnectionStateChange);
      
      return () => {
        room.off('connectionStateChanged', handleConnectionStateChange);
      };
    }
  }, [room]);

  // Handle incoming chat messages
  useEffect(() => {
    if (!room) return;

    const handleDataReceived = (data: Uint8Array, participant?: any) => {
      try {
        const messageString = new TextDecoder().decode(data);
        const messageData = JSON.parse(messageString);
        
        if (messageData.type === 'chat_message') {
          const messageType: MessageType = messageData.messageType || (messageData.recipient ? 'private' : 'public');
          const recipient = messageData.recipient || null;
          const senderIdentity = messageData.sender || participant?.identity || 'Unknown';
          const isLocal = participant?.identity === localParticipant?.identity;
          
          // Filter private messages - only show if user is sender or recipient
          if (messageType === 'private' && recipient) {
            const isRecipient = recipient === localParticipant?.identity;
            if (!isLocal && !isRecipient) {
              // Not for this user, skip it
              return;
            }
          }
          
          const chatMessage: ChatMessage = {
            id: messageData.id || Date.now().toString(),
            sender: senderIdentity,
            message: messageData.message,
            timestamp: messageData.timestamp || Date.now(),
            isLocal,
            messageType,
            recipient
          };
          
          setMessages(prev => [...prev, chatMessage]);
          
          // Increment unread count for non-local messages when chat is closed
          if (!chatMessage.isLocal && !isOpen) {
            setUnreadCount(prev => {
              const newCount = prev + 1;
              onUnreadCountChange?.(newCount);
              return newCount;
            });
          }
          
          // Show toast notification for all incoming messages (regardless of chat state)
          if (!chatMessage.isLocal) {
            const isPrivate = chatMessage.messageType === 'private';
            toast(
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '4px',
                minWidth: '250px',
                maxWidth: '350px'
              }}>
                <div style={{ 
                  fontWeight: '600', 
                  fontSize: '14px', 
                  color: '#1f2937',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span style={{ fontSize: '12px' }}>{isPrivate ? '🔒' : '💬'}</span>
                  <span>{chatMessage.sender}</span>
                  {isPrivate && <span style={{ fontSize: '11px', color: '#6b7280', marginLeft: '4px' }}>(Private)</span>}
                </div>
                <div style={{ 
                  fontSize: '13px', 
                  color: '#374151',
                  lineHeight: '1.4',
                  wordBreak: 'break-word'
                }}>
                  {chatMessage.message}
                </div>
              </div>, 
              {
                duration: 4000,
                position: 'top-right',
                style: {
                  backgroundColor: isPrivate ? '#fef3c7' : '#ffffff',
                  color: '#1f2937',
                  border: `1px solid ${isPrivate ? '#fbbf24' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                  padding: '12px 16px',
                  maxWidth: '400px',
                },
              }
            );
          }
        }
      } catch (error) {
        console.error('Error parsing chat message:', error);
      }
    };

    room.on('dataReceived', handleDataReceived);
    
    return () => {
      room.off('dataReceived', handleDataReceived);
    };
  }, [room, localParticipant]);

  // Send chat message
  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !room || !localParticipant) return;
    
    // Validate private message has recipient
    if (messageMode === 'private' && !selectedRecipient) {
      toast('Please select a recipient for private message', {
        duration: 2000,
        icon: '⚠️',
        position: 'top-right',
        style: {
          backgroundColor: '#f59e0b',
          color: '#ffffff',
          borderRadius: '8px',
        },
      });
      return;
    }

    const messageData = {
      type: 'chat_message',
      id: Date.now().toString(),
      sender: localParticipant.identity,
      message: newMessage.trim(),
      timestamp: Date.now(),
      messageType: messageMode,
      recipient: messageMode === 'private' ? selectedRecipient : null
    };

    try {
      const encodedData = new TextEncoder().encode(JSON.stringify(messageData));
      await room.localParticipant.publishData(encodedData, { topic: 'chat' });
      
      // Add message to local state immediately for better UX
      const chatMessage: ChatMessage = {
        id: messageData.id,
        sender: messageData.sender,
        message: messageData.message,
        timestamp: messageData.timestamp,
        isLocal: true,
        messageType: messageMode,
        recipient: messageMode === 'private' ? selectedRecipient : null
      };
      
      setMessages(prev => [...prev, chatMessage]);
      setNewMessage('');
      
      // Show confirmation toast for sent message
      toast('Message sent', {
        duration: 2000,
        icon: '✅',
        position: 'top-right',
        style: {
          backgroundColor: '#10b981',
          color: '#ffffff',
          borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          padding: '12px 16px',
          fontWeight: '500',
        },
      });
    } catch (error) {
      console.error('Error sending chat message:', error);
      
      // Show error toast for failed message
      toast('Failed to send message', {
        duration: 3000,
        icon: '❌',
        position: 'top-right',
        style: {
          backgroundColor: '#ef4444',
          color: '#ffffff',
          borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          padding: '12px 16px',
          fontWeight: '500',
        },
      });
    }
  }, [newMessage, room, localParticipant]);

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Format timestamp
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!isOpen) return null;

  return (
    <div className={styles.chatOverlay}>
      <div className={styles.chatPanel}>
        {/* Chat Header */}
        <div className={styles.chatHeader}>
          <h3 className={styles.chatTitle}>
            💬 Chat
            {!isConnected && <span className={styles.disconnectedIndicator}> (Disconnected)</span>}
          </h3>
          <button 
            className={styles.closeButton}
            onClick={onClose}
            title="Close Chat"
          >
            ✕
          </button>
        </div>

        {/* Message Mode Toggle */}
        <div className={styles.modeToggleContainer}>
          <button
            className={`${styles.modeToggle} ${messageMode === 'public' ? styles.modeToggleActive : ''}`}
            onClick={() => setMessageMode('public')}
            title="Send to all participants"
          >
            <span className={styles.modeIcon}>🌐</span>
            <span>All</span>
          </button>
          <button
            className={`${styles.modeToggle} ${messageMode === 'private' ? styles.modeToggleActive : ''}`}
            onClick={() => setMessageMode('private')}
            title="Send private message"
          >
            <span className={styles.modeIcon}>🔒</span>
            <span>Private</span>
          </button>
        </div>

        {/* Recipient Selector (for private mode) */}
        {messageMode === 'private' && (
          <div className={styles.recipientSelectorContainer} ref={recipientSelectorRef}>
            <button
              className={styles.recipientButton}
              onClick={() => setShowRecipientSelector(!showRecipientSelector)}
            >
              <span className={styles.recipientLabel}>
                {selectedRecipient ? `To: ${selectedRecipient}` : 'Select recipient...'}
              </span>
              <span className={styles.recipientArrow}>{showRecipientSelector ? '▲' : '▼'}</span>
            </button>
            {showRecipientSelector && availableRecipients.length > 0 && (
              <div className={styles.recipientDropdown}>
                {availableRecipients.map((participant) => (
                  <button
                    key={participant.identity}
                    className={`${styles.recipientOption} ${selectedRecipient === participant.identity ? styles.recipientOptionSelected : ''}`}
                    onClick={() => {
                      setSelectedRecipient(participant.identity);
                      setShowRecipientSelector(false);
                    }}
                  >
                    <span className={styles.recipientAvatar}>
                      {participant.identity[0]?.toUpperCase() || '?'}
                    </span>
                    <span>{participant.identity}</span>
                    {selectedRecipient === participant.identity && (
                      <span className={styles.recipientCheck}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
            {showRecipientSelector && availableRecipients.length === 0 && (
              <div className={styles.recipientDropdown}>
                <div className={styles.recipientEmpty}>No other participants available</div>
              </div>
            )}
          </div>
        )}

        {/* Messages Area */}
        <div className={styles.messagesContainer}>
          {messages.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => {
              const isPrivate = message.messageType === 'private';
              const recipientName = isPrivate && message.recipient 
                ? (message.recipient === localParticipant?.identity ? 'You' : message.recipient)
                : null;
              
              return (
                <div 
                  key={message.id} 
                  className={`${styles.message} ${message.isLocal ? styles.localMessage : styles.remoteMessage} ${isPrivate ? styles.privateMessage : ''}`}
                >
                  <div className={styles.messageHeader}>
                    <span className={styles.senderName}>
                      {isPrivate && <span className={styles.privateIcon}>🔒</span>}
                      {message.isLocal ? 'You' : message.sender}
                      {isPrivate && message.isLocal && recipientName && (
                        <span className={styles.recipientLabel}> → {recipientName}</span>
                      )}
                      {isPrivate && !message.isLocal && (
                        <span className={styles.recipientLabel}> (Private)</span>
                      )}
                    </span>
                    <span className={styles.timestamp}>
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                  <div className={styles.messageContent}>
                    {message.message}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className={styles.inputContainer}>
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isConnected ? "Type a message..." : "Connecting..."}
            disabled={!isConnected}
            className={styles.messageInput}
            maxLength={500}
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || !isConnected}
            className={styles.sendButton}
            title="Send Message"
          >
            📤
          </button>
        </div>
      </div>
    </div>
  );
}
