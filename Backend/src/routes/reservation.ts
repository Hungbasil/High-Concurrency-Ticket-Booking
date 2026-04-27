
import { Router } from 'express';
import { holdSeat, checkout, getUserBookings, autoBookWithAI } from '../controllers/reservation.js';
import { authMiddleware } from '../utils/auth-middleware.js';

const router = Router();

router.post('/hold', holdSeat);
router.post('/checkout', checkout);
router.post('/ai/auto-book', autoBookWithAI);

/**
 * GET /api/reservations/user/me
 * Get user's bookings (requires auth)
 */
router.get('/user/me', authMiddleware, getUserBookings);

export default router;