import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsApi, reservationsApi, getErrorMessage } from '../api/client.js';
import { useBookingStore } from '../store/useBookingStore.js';

/**
 * Hook to fetch event seats
 */
export const useEventSeats = (eventId: string | null, enabled = true) => {
  return useQuery({
    queryKey: ['seats', eventId],
    queryFn: () => {
      if (!eventId) throw new Error('Event ID is required');
      return eventsApi.getEventSeats(eventId);
    },
    enabled: enabled && !!eventId,
    staleTime: 10000, // ✅ OPTIMIZED: 10 seconds (was 5s) to reduce refetches
    gcTime: 15000, // ✅ OPTIMIZED: Keep in cache longer
    retry: 1, // ✅ OPTIMIZED: Reduce retries
  });
};

/**
 * Hook to fetch event stats
 */
export const useEventStats = (eventId: string | null, enabled = true) => {
  return useQuery({
    queryKey: ['eventStats', eventId],
    queryFn: () => {
      if (!eventId) throw new Error('Event ID is required');
      return eventsApi.getEventStats(eventId);
    },
    enabled: enabled && !!eventId,
    staleTime: 10000, // 10 seconds
    gcTime: 20000,
    retry: 1,
  });
};

/**
 * Hook to fetch all events
 */
export const useEvents = (enabled = true) => {
  return useQuery({
    queryKey: ['events'],
    queryFn: () => eventsApi.getAllEvents(),
    enabled,
    staleTime: 30000, // 30 seconds
    gcTime: 60000, // 1 minute
  });
};

/**
 * Hook to fetch a single event
 */
export const useEvent = (eventId: string | null, enabled = true) => {
  return useQuery({
    queryKey: ['event', eventId],
    queryFn: () => {
      if (!eventId) throw new Error('Event ID is required');
      return eventsApi.getEvent(eventId);
    },
    enabled: enabled && !!eventId,
    staleTime: 30000,
    gcTime: 60000,
  });
};

/**
 * Hook to hold a seat
 */
export const useHoldSeat = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useBookingStore();

  return useMutation({
    mutationFn: reservationsApi.holdSeat,
    retry: 1, // ✅ Reduce retries to avoid long wait times
    onSuccess: (data) => {
      // ✅ OPTIMIZED: Don't refetch all seats - let WebSocket handle updates
      // Just update the local cache for the held seat
      queryClient.setQueryData(['seats'], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          data: oldData.data?.map((seat: any) =>
            seat.seat_code === data.seatCode
              ? { ...seat, status: 'HOLD' }
              : seat
          ),
        };
      });
      showNotification('✅ Ghế được giữ thành công! Bạn có 5 phút để thanh toán.', 'success');
      return data;
    },
    onError: (error) => {
      const message = getErrorMessage(error);
      showNotification(message, 'error');
    },
  });
};

/**
 * Hook to checkout/complete reservation
 */
export const useCheckout = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useBookingStore();

  return useMutation({
    mutationFn: reservationsApi.checkout,
    onSuccess: () => {
      // ✅ OPTIMIZED: Update cache instead of refetching
      queryClient.setQueryData(['seats'], (oldData: any) => {
        if (!oldData) return oldData;
        return oldData; // Keep the existing data, WebSocket will notify others
      });
      // Invalidate stats only (small query)
      queryClient.invalidateQueries({ queryKey: ['eventStats'] });
      showNotification('✅ Thanh toán thành công!', 'success');
    },
    onError: (error) => {
      const message = getErrorMessage(error);
      showNotification(message, 'error');
    },
  });
};

/**
 * Hook to manage seat selection with hold countdown
 */
export const useSeatSelection = (eventId: string) => {
  const { selectSeat, deselectSeat, getSelectedSeats, currentUser } = useBookingStore();
  const holdSeatMutation = useHoldSeat();

  const handleSelectSeat = async (_seatCode: string): Promise<void> => {
    const userId = currentUser?.id || 'temp-user';

    try {
      const response = await holdSeatMutation.mutateAsync({
        userId,
        eventId,
        seatCode: _seatCode,
      });

      // Add to cart and selections
      selectSeat(eventId, _seatCode, response.reservationId, response.expiresAt);
    } catch (error) {
      console.error('Failed to hold seat:', error);
      throw error;
    }
  };

  const handleDeselectSeat = (seatCode: string) => {
    deselectSeat(eventId, seatCode);
  };

  const selectedSeats = getSelectedSeats(eventId);

  return {
    handleSelectSeat,
    handleDeselectSeat,
    selectedSeats,
    isHolding: holdSeatMutation.isPending,
  };
};
