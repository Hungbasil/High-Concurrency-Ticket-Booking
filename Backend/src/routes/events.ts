import { Router } from 'express';
import { createEvent, getEventStats, getEventSeats, getAllEvents, getEvent } from '../controllers/event.js';

const router = Router();

router.get('/', getAllEvents);
router.post('/', createEvent);
router.get('/:id', getEvent);
router.get('/:id/stats', getEventStats);
router.get('/:id/seats', getEventSeats);

export default router;
