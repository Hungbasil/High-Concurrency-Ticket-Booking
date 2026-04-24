import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { getWebSocketUrl } from '../api/client.js';
import type { SeatUpdate } from '../types/index.js';

type SeatUpdateListener = (update: SeatUpdate) => void;

let globalSocket: Socket | null = null;
const listeners: Set<SeatUpdateListener> = new Set();

/**
 * Initialize and manage WebSocket connection for real-time seat updates
 * Ensures only one connection is created and shared across the app
 */
export const useSocket = () => {
  const socketRef = useRef<Socket | null>(globalSocket);

  useEffect(() => {
    // If connection already exists, use it
    if (globalSocket) {
      socketRef.current = globalSocket;
      return;
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
        // Notify all listeners
        listeners.forEach((listener) => listener(data));
      });

      socket.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
      });

      globalSocket = socket;
      socketRef.current = socket;
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
    }

    return () => {
      // Don't disconnect on unmount - keep connection alive for app
    };
  }, []);

  const subscribe = useCallback((listener: SeatUpdateListener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
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

  useEffect(() => {
    const unsubscribe = subscribe((update) => {
      // Filter updates for this event
      if (update.eventId === eventId) {
        onUpdate(update);
      }
    });

    return unsubscribe;
  }, [eventId, subscribe, onUpdate]);
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
