import { create } from 'zustand';
import type {
  Cart,
  CartItem,
  SelectionState,
  User,
} from '../types/index.js';

interface BookingStore {
  // Cart state
  cart: Cart;
  addToCart: (item: CartItem) => void;
  removeFromCart: (seatId: string) => void;
  clearCart: () => void;
  updateCartItem: (seatId: string, updates: Partial<CartItem>) => void;

  // Selection state
  selections: { [eventId: string]: SelectionState };
  selectSeat: (eventId: string, seatCode: string, holdId: string, expiresAt: string) => void;
  deselectSeat: (eventId: string, seatCode: string) => void;
  getSelectedSeats: (eventId: string) => string[];
  clearSelection: (eventId: string) => void;

  // User state
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;

  // UI state
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  notification: {
    show: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  };
  showNotification: (
    message: string,
    type?: 'success' | 'error' | 'warning' | 'info'
  ) => void;
  closeNotification: () => void;
}

const calculateCart = (items: CartItem[]): { total: number; tax: number; fees: number } => {
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const tax = subtotal * 0.1; // 10% tax
  const fees = items.length * 5000; // Fixed fee per ticket
  const total = subtotal + tax + fees;

  return { total, tax, fees };
};

export const useBookingStore = create<BookingStore>((set, get) => ({
  // Cart
  cart: {
    items: [],
    total: 0,
    tax: 0,
    fees: 0,
  },

  addToCart: (item: CartItem) => {
    set((state) => {
      const items = [...state.cart.items, item];
      const { total, tax, fees } = calculateCart(items);
      return {
        cart: { items, total, tax, fees },
      };
    });
  },

  removeFromCart: (seatId: string) => {
    set((state) => {
      const items = state.cart.items.filter((item) => item.seatId !== seatId);
      const { total, tax, fees } = calculateCart(items);
      return {
        cart: { items, total, tax, fees },
      };
    });
  },

  clearCart: () => {
    set({
      cart: {
        items: [],
        total: 0,
        tax: 0,
        fees: 0,
      },
    });
  },

  updateCartItem: (seatId: string, updates: Partial<CartItem>) => {
    set((state) => {
      const items = state.cart.items.map((item) =>
        item.seatId === seatId ? { ...item, ...updates } : item
      );
      const { total, tax, fees } = calculateCart(items);
      return {
        cart: { items, total, tax, fees },
      };
    });
  },

  // Selection
  selections: {},

  selectSeat: (eventId: string, seatCode: string, holdId: string, expiresAt: string) => {
    set((state) => {
      const selection = state.selections[eventId] || {
        eventId,
        selectedSeats: [],
        tempHolds: {},
      };

      return {
        selections: {
          ...state.selections,
          [eventId]: {
            ...selection,
            selectedSeats: [...new Set([...selection.selectedSeats, seatCode])],
            tempHolds: {
              ...selection.tempHolds,
              [seatCode]: { holdId, expiresAt },
            },
          },
        },
      };
    });
  },

  deselectSeat: (eventId: string, seatCode: string) => {
    set((state) => {
      const selection = state.selections[eventId];
      if (!selection) return state;

      const selectedSeats = selection.selectedSeats.filter(
        (code) => code !== seatCode
      );
      const tempHolds = { ...selection.tempHolds };
      delete tempHolds[seatCode];

      return {
        selections: {
          ...state.selections,
          [eventId]: {
            ...selection,
            selectedSeats,
            tempHolds,
          },
        },
      };
    });
  },

  getSelectedSeats: (eventId: string) => {
    return get().selections[eventId]?.selectedSeats || [];
  },

  clearSelection: (eventId: string) => {
    set((state) => {
      const rest = { ...state.selections };
      delete rest[eventId];
      return { selections: rest };
    });
  },

  // User
  currentUser: null,
  setCurrentUser: (user: User | null) => {
    set({ currentUser: user });
  },

  // UI
  isLoading: false,
  setIsLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  notification: {
    show: false,
    type: 'info',
    message: '',
  },

  showNotification: (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    set({
      notification: {
        show: true,
        type,
        message,
      },
    });
  },

  closeNotification: () => {
    set({
      notification: {
        show: false,
        type: 'info',
        message: '',
      },
    });
  },
}))
