import { useReducer, useCallback, useRef } from 'react';
import { DisconnectReason } from 'livekit-client';
import { logger } from '../utils/logger';

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

export interface ConnectionStateData {
  state: ConnectionState;
  error: string | null;
  reconnectAttempts: number;
  lastError: Error | null;
}

type ConnectionAction =
  | { type: 'CONNECTING' }
  | { type: 'CONNECTED' }
  | { type: 'DISCONNECTED'; reason?: DisconnectReason }
  | { type: 'ERROR'; error: Error }
  | { type: 'RETRY' }
  | { type: 'RESET' };

const initialState: ConnectionStateData = {
  state: 'idle',
  error: null,
  reconnectAttempts: 0,
  lastError: null,
};

function connectionReducer(
  state: ConnectionStateData,
  action: ConnectionAction
): ConnectionStateData {
  switch (action.type) {
    case 'CONNECTING':
      return {
        ...state,
        state: 'connecting',
        error: null,
      };

    case 'CONNECTED':
      return {
        ...state,
        state: 'connected',
        error: null,
        reconnectAttempts: 0,
        lastError: null,
      };

    case 'DISCONNECTED':
      return {
        ...state,
        state: 'disconnected',
        error: action.reason ? `Disconnected: ${action.reason}` : null,
      };

    case 'ERROR':
      return {
        ...state,
        state: 'error',
        error: action.error.message,
        lastError: action.error,
      };

    case 'RETRY':
      return {
        ...state,
        state: 'connecting',
        reconnectAttempts: state.reconnectAttempts + 1,
        error: null,
      };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

/**
 * Hook to manage connection state with state machine pattern
 * Centralizes connection state management and provides actions
 */
export function useConnectionState() {
  const [state, dispatch] = useReducer(connectionReducer, initialState);
  const maxReconnectAttemptsRef = useRef(5);

  const setConnecting = useCallback(() => {
    dispatch({ type: 'CONNECTING' });
  }, []);

  const setConnected = useCallback(() => {
    dispatch({ type: 'CONNECTED' });
  }, []);

  const setDisconnected = useCallback((reason?: DisconnectReason) => {
    dispatch({ type: 'DISCONNECTED', reason });
  }, []);

  const setError = useCallback((error: Error) => {
    dispatch({ type: 'ERROR', error });
  }, []);

  const retry = useCallback(() => {
    if (state.reconnectAttempts >= maxReconnectAttemptsRef.current) {
      logger.warn('Maximum reconnection attempts reached');
      return false;
    }
    dispatch({ type: 'RETRY' });
    return true;
  }, [state.reconnectAttempts]);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const canRetry = state.reconnectAttempts < maxReconnectAttemptsRef.current;

  return {
    state: state.state,
    error: state.error,
    reconnectAttempts: state.reconnectAttempts,
    lastError: state.lastError,
    canRetry,
    setConnecting,
    setConnected,
    setDisconnected,
    setError,
    retry,
    reset,
  };
}

