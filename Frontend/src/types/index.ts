// Event Types
export interface Event {
  id: string;
  title: string;
  start_time: string;
  status: 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
  created_at: string;
  total_seats?: number;
  available_seats?: number;
  price_range?: {
    min: number;
    max: number;
  };
}

export interface EventStats {
  eventId: string;
  soldCount: number;
  availableCount: number;
  totalRevenue: number;
}

// Seat Types
export type SeatStatus = 'AVAILABLE' | 'HOLD' | 'SOLD' | 'RESERVED';

export interface Seat {
  id: string;
  seat_code: string;
  price: number;
  status: SeatStatus;
  event_id?: string;
  held_by?: string;
  expires_at?: string;
}

export interface SeatUpdate {
  eventId: string;
  seatCode: string;
  status: SeatStatus;
  holdId?: string;
  expiresAt?: string;
}

// Reservation/Hold Types
export interface Hold {
  id: string;
  user_id: string;
  seat_id: string;
  status: 'PENDING' | 'PAID' | 'CANCELLED' | 'EXPIRED';
  expires_at: string;
  created_at: string;
}

export interface HoldRequest {
  userId: string;
  eventId: string;
  seatCode: string;
}

export interface HoldResponse {
  message: string;
  reservationId: string;
  expiresAt: string;
}

export interface Booking {
  id: string;
  user_id: string;
  event_id: string;
  seats: Seat[];
  total_price: number;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  created_at: string;
  updated_at: string;
}

export interface CheckoutRequest {
  userId: string;
  reservationId: string;
  eventId: string;
  seatCode: string;
}

// User Types
export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
}

// Cart/Booking Flow Types
export interface CartItem {
  seatId: string;
  seatCode: string;
  price: number;
  eventId: string;
  holdId?: string;
  expiresAt?: string;
}

export interface Cart {
  items: CartItem[];
  total: number;
  tax: number;
  fees: number;
}

// UI State Types
export interface SelectionState {
  eventId: string;
  selectedSeats: string[]; // seat codes
  tempHolds: {
    [seatCode: string]: {
      holdId: string;
      expiresAt: string;
    };
  };
}

// Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
}

// Pagination
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}
