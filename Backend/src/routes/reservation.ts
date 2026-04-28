
import { Router } from 'express';
import { holdSeat, checkout, getUserBookings, autoBookWithAI } from '../controllers/reservation.js';
import { authMiddleware } from '../utils/auth-middleware.js';
import { validateRequest } from '../utils/validation.js';

const router = Router();

// Validation schemas
const holdSeatSchema = {
  eventId: {
    type: 'string' as const,
    required: true,
    minLength: 1
  },
  seatCode: {
    type: 'string' as const,
    required: true,
    pattern: /^[A-Z]\d+$/
  }
};

const checkoutSchema = {
  eventId: {
    type: 'string' as const,
    required: true
  },
  reservationIds: {
    type: 'array' as const,
    required: true
  }
};

const autoBookSchema = {
  eventId: {
    type: 'string' as const,
    required: true
  },
  prompt: {
    type: 'string' as const,
    required: true,
    minLength: 3,
    maxLength: 500
  }
};

router.post('/hold', validateRequest(holdSeatSchema), holdSeat);
router.post('/checkout', validateRequest(checkoutSchema), checkout);
router.post('/ai/auto-book', validateRequest(autoBookSchema), autoBookWithAI);

/**
 * GET /api/reservations/user/me
 * Get user's bookings (requires auth)
 */
router.get('/user/me', authMiddleware, getUserBookings);

export default router;