import { http, HttpResponse } from 'msw';
import type { ApiResponse, Event, Seat, HoldResponse } from '../types/index.js';

interface HoldRequestBody {
  userId: string;
  eventId: string;
  seatCode: string;
}

interface CheckoutRequestBody {
  userId: string;
  reservationId: string;
  eventId: string;
  seatCode: string;
}

const BASE_URL = 'http://localhost:3000/api';

// Mock data
const mockEvents: Event[] = [
  {
    id: 'event-1',
    title: 'Taylor Swift - Eras Tour',
    start_time: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'UPCOMING',
    created_at: new Date().toISOString(),
    total_seats: 10000,
    available_seats: 8500,
    price_range: { min: 500000, max: 5000000 },
  },
  {
    id: 'event-2',
    title: 'The Weeknd - After Hours Tour',
    start_time: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'UPCOMING',
    created_at: new Date().toISOString(),
    total_seats: 20000,
    available_seats: 15000,
    price_range: { min: 1000000, max: 8000000 },
  },
  {
    id: 'event-3',
    title: 'BTS Permission to Dance Concert',
    start_time: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'UPCOMING',
    created_at: new Date().toISOString(),
    total_seats: 50000,
    available_seats: 45000,
    price_range: { min: 800000, max: 3000000 },
  },
];

// Generate mock seats for an event
const generateMockSeats = (eventId: string): Seat[] => {
  const seats: Seat[] = [];
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  const seatsPerRow = 20;

  let seatIndex = 0;
  for (const row of rows) {
    for (let i = 1; i <= seatsPerRow; i++) {
      const seatCode = `${row}${i}`;
      const randomStatus = Math.random();
      let status: 'AVAILABLE' | 'HOLD' | 'SOLD' = 'AVAILABLE';

      if (randomStatus > 0.8) status = 'SOLD';
      else if (randomStatus > 0.6) status = 'HOLD';

      seats.push({
        id: `seat-${eventId}-${seatIndex}`,
        seat_code: seatCode,
        price: 100000 + Math.random() * 900000,
        status,
        event_id: eventId,
      });
      seatIndex++;
    }
  }

  return seats;
};

// Store for holds (in-memory, resets on page reload)
const holds = new Map<string, { userId: string; expiresAt: number }>();

/**
 * MSW Request Handlers
 */
export const handlers = [
  // GET /api/events
  http.get(`${BASE_URL}/events`, () => {
    return HttpResponse.json<ApiResponse<Event[]>>({
      success: true,
      data: mockEvents,
    });
  }),

  // GET /api/events/:id
  http.get(`${BASE_URL}/events/:id`, ({ params }: { params: Record<string, string> }) => {
    const event = mockEvents.find((e) => e.id === params.id);

    if (!event) {
      return HttpResponse.json(
        { success: false, message: 'Event not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json<ApiResponse<Event>>({
      success: true,
      data: event,
    });
  }),

  // GET /api/events/:id/seats
  http.get(`${BASE_URL}/events/:id/seats`, ({ params }: { params: Record<string, string> }) => {
    const seats = generateMockSeats(params.id as string);

    return HttpResponse.json<ApiResponse<Seat[]>>({
      success: true,
      data: seats,
    });
  }),

  // GET /api/events/:id/stats
  http.get(`${BASE_URL}/events/:id/stats`, ({ params }: { params: Record<string, string> }) => {
    const seats = generateMockSeats(params.id as string);
    const soldCount = seats.filter((s) => s.status === 'SOLD').length;
    const availableCount = seats.filter((s) => s.status === 'AVAILABLE').length;
    const totalRevenue = seats
      .filter((s) => s.status === 'SOLD')
      .reduce((sum, s) => sum + s.price, 0);

    return HttpResponse.json({
      success: true,
      data: {
        eventId: params.id,
        soldCount,
        availableCount,
        totalRevenue,
      },
    });
  }),

  // POST /api/reservations/hold
  http.post(`${BASE_URL}/reservations/hold`, async ({ request }: { request: Request }) => {
    const body = (await request.json()) as HoldRequestBody;
    const { userId, eventId, seatCode } = body;

    if (!userId || !eventId || !seatCode) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Missing required fields',
          },
        },
        { status: 400 }
      );
    }

    // Simulate occasional conflicts (9.9% chance)
    if (Math.random() < 0.099) {
      return HttpResponse.json(
        { message: 'Ghế đã có người chọn hoặc đang được giữ!' },
        { status: 409 }
      );
    }

    const holdKey = `${eventId}-${seatCode}`;
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    holds.set(holdKey, { userId, expiresAt });

    return HttpResponse.json<HoldResponse>({
      message: 'Giữ ghế thành công! Bạn có 5 phút để thanh toán.',
      reservationId: `res-${Date.now()}`,
      expiresAt: new Date(expiresAt).toISOString(),
    });
  }),

  // POST /api/reservations/checkout
  http.post(`${BASE_URL}/reservations/checkout`, async ({ request }: { request: Request }) => {
    const body = (await request.json()) as CheckoutRequestBody;
    const { userId, reservationId, eventId, seatCode } = body;

    if (!userId || !reservationId || !eventId || !seatCode) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Missing required fields',
          },
        },
        { status: 400 }
      );
    }

    // Simulate occasional checkout failures (5% chance)
    if (Math.random() < 0.05) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'PAYMENT_FAILED',
            message: 'Thanh toán thất bại. Vui lòng thử lại.',
          },
        },
        { status: 500 }
      );
    }

    const holdKey = `${eventId}-${seatCode}`;
    holds.delete(holdKey);

    return HttpResponse.json({
      success: true,
      message: '✅ Thanh toán thành công!',
    });
  }),
];

/**
 * Alternative: Real API fallthrough
 * Uncomment to use real backend API with MSW as fallback only
 */
/*
export const handlers = [
  http.all('*', ({ request }) => {
    // Let all requests go through to the real API
    return HttpResponse.passthrough();
  }),
];
*/
