
import { Router } from 'express';
import { holdSeat, checkout, getUserBookings } from '../controllers/reservation.js';
import { authMiddleware } from '../utils/auth-middleware.js';

const router = Router();

router.post('/hold', holdSeat);
router.post('/checkout', checkout);

/**
 * GET /api/reservations/user/me
 * Get user's bookings (requires auth)
 */
router.get('/user/me', authMiddleware, getUserBookings);

export default router;