
import { Router } from 'express';
import { holdSeat, checkout } from '../controllers/reservation.js';

const router = Router();
router.post('/hold', holdSeat);
router.post('/checkout', checkout);

export default router;