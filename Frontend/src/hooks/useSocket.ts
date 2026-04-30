import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { getWebSocketUrl } from '../api/client.js';
import type { SeatUpdate } from '../types/index.js';

type SeatUpdateListener = (update: SeatUpdate) => void;

let globalSocket: Socket | null = null;
let connectionCount = 0; // Track how many hooks are using the connection

/**
 * Initialize and manage WebSocket connection for real-time seat updates
 * Ensures only one connection is created and shared across the app
 * Properly cleans up on component unmount
 */
export const useSocket = () => {
  const socketRef = useRef<Socket | null>(globalSocket);
  const listenersRef = useRef<Set<SeatUpdateListener>>(new Set());

  useEffect(() => {
    connectionCount++;

    // If connection already exists, use it
    if (globalSocket && globalSocket.connected) {
      socketRef.current = globalSocket;
      return () => {
        connectionCount--;
        // Only disconnect if no components are using it
        if (connectionCount === 0 && globalSocket) {
          globalSocket.disconnect();
          globalSocket = null;
        }
      };
    }

    try {
      const wsUrl = getWebSocketUrl();
      const socket = io(wsUrl, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      });

      socket.on('connect', () => {
        console.log('✅ WebSocket connected:', socket.id);
      });

      socket.on('disconnect', () => {
        console.log('❌ WebSocket disconnected');
      });

      socket.on('seatStatusChanged', (data: SeatUpdate) => {
        console.log('🔄 Seat status changed:', data);
        // Notify all listeners for this socket instance
        listenersRef.current.forEach((listener) => listener(data));
      });

      socket.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
      });

      globalSocket = socket;
      socketRef.current = socket;
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
    }

    // Cleanup on unmount
    return () => {
      connectionCount--;
      // Only disconnect if no components are using it
      if (connectionCount === 0 && globalSocket) {
        globalSocket.disconnect();
        globalSocket = null;
      }
    };
  }, []);

  const subscribe = useCallback((listener: SeatUpdateListener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  return {
    socket: socketRef.current,
    subscribe,
  };
};

/**
 * Subscribe to seat updates for a specific event
 */
export const useSeatUpdates = (eventId: string, onUpdate: SeatUpdateListener) => {
  const { subscribe } = useSocket();
  const memoizedCallback = useCallback((update: SeatUpdate) => {
    if (update.eventId === eventId) {
      onUpdate(update);
    }
  }, [eventId, onUpdate]);

  useEffect(() => {
    const unsubscribe = subscribe(memoizedCallback);
    return unsubscribe;
  }, [subscribe, memoizedCallback]);
};

/**
 * Emit a custom event through WebSocket (if needed for future features)
 */
export const useSocketEmit = () => {
  const { socket } = useSocket();

  const emit = useCallback(
    (event: string, data: Record<string, unknown>) => {
      if (socket?.connected) {
        socket.emit(event, data);
      }
    },
    [socket]
  );

  return { emit };
};
