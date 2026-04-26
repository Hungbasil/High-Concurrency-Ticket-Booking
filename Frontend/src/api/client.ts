import  axios, { type AxiosInstance, AxiosError } from 'axios';
import type {
  Event,
  EventStats,
  Seat,
  HoldRequest,
  HoldResponse,
  CheckoutRequest,
  ApiResponse,
} from '../types/index.js';

/**
 * API Client Adapter for High-Concurrency Ticket Booking Backend
 * 
 * Maps backend endpoints and handles request/response transformation
 * Update BASE_URL and WS_URL when backend is deployed
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 8000, // ✅ OPTIMIZED: Reduced from 10s to 8s for faster failure detection
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests if available
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors globally
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * Events API
 */
export const eventsApi = {
  /**
   * POST /api/events
   * Create a new event
   */
  createEvent: async (data: { title: string; start_time: string }) => {
    const response = await apiClient.post<ApiResponse<Event>>('/events', data);
    return response.data;
  },

  /**
   * GET /api/events/:id/stats
   * Get event statistics (sold count, available count, revenue)
   */
  getEventStats: async (eventId: string) => {
    const response = await apiClient.get<ApiResponse<EventStats>>(
      `/events/${eventId}/stats`
    );
    return response.data;
  },

  /**
   * GET /api/events/:id/seats
   * Get all seats for an event with their current status
   * Returns array of seats with id, seat_code, price, status
   */
  getEventSeats: async (eventId: string) => {
    const response = await apiClient.get<ApiResponse<Seat[]>>(
      `/events/${eventId}/seats`
    );
    return response.data;
  },

  /**
   * GET /api/events/:id
   * Get event details (if backend provides this endpoint)
   */
  getEvent: async (eventId: string) => {
    const response = await apiClient.get<ApiResponse<Event>>(
      `/events/${eventId}`
    );
    return response.data;
  },

  /**
   * GET /api/events
   * Get all events (if backend provides this endpoint)
   */
  getAllEvents: async (params?: { page?: number; limit?: number }) => {
    const response = await apiClient.get<ApiResponse<Event[]>>('/events', {
      params,
    });
    return response.data;
  },
};

/**
 * Reservations API
 */
export const reservationsApi = {
  /**
   * POST /api/reservations/hold
   * Hold a seat temporarily (5 minutes default)
   * Body: { userId, eventId, seatCode }
   * Returns: { message, reservationId, expiresAt }
   */
  holdSeat: async (data: HoldRequest) => {
    const response = await apiClient.post<HoldResponse>(
      '/reservations/hold',
      data
    );
    return response.data;
  },

  /**
   * POST /api/reservations/checkout
   * Complete payment and confirm reservation
   * Body: { userId, reservationId, eventId, seatCode }
   * Returns: { message }
   */
  checkout: async (data: CheckoutRequest) => {
    const response = await apiClient.post<ApiResponse>(
      '/reservations/checkout',
      data
    );
    return response.data;
  },

  /**
   * GET /api/reservations
   * Get user's reservations/bookings (if backend provides this)
   */
  getUserReservations: async (userId: string) => {
    const response = await apiClient.get<ApiResponse>(
      `/reservations?userId=${userId}`
    );
    return response.data;
  },
};

/**
 * Users/Authentication API
 */
export const usersApi = {
  /**
   * POST /api/users/register
   * Register a new user
   * Body: { email, password, fullName }
   * Returns: { user, token }
   */
  register: async (data: { email: string; password: string; fullName: string }) => {
    const response = await apiClient.post<ApiResponse<{ user: any; token: string }>>(
      '/users/register',
      data
    );
    return response.data;
  },

  /**
   * POST /api/users/login
   * Login user
   * Body: { email, password }
   * Returns: { user, token }
   */
  login: async (data: { email: string; password: string }) => {
    const response = await apiClient.post<ApiResponse<{ user: any; token: string }>>(
      '/users/login',
      data
    );
    return response.data;
  },

  /**
   * GET /api/users/me
   * Get current user profile (requires auth token)
   * Returns: { user }
   */
  getCurrentUser: async () => {
    const response = await apiClient.get<ApiResponse<any>>('/users/me');
    return response.data;
  },
};

/**
 * WebSocket URL for real-time seat updates
 * Usage: const socket = io(WS_URL, { transports: ['websocket'] });
 * 
 * Events to listen for:
 * - 'seatStatusChanged': { eventId, seatCode, status, holdId?, expiresAt? }
 */
export const getWebSocketUrl = () => WS_URL;

/**
 * Error handling utility
 */
export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    if (error.response?.data?.error?.message) {
      return error.response.data.error.message;
    }
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

export default apiClient;
