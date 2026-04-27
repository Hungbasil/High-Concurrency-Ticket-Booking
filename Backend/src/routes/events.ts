import { Router } from 'express';
import { createEvent, getEventStats, getEventSeats, getAllEvents, getEvent, generateEventWithAI } from '../controllers/event.js';

const router = Router();

router.get('/', getAllEvents);
router.post('/', createEvent);
router.post('/ai/generate', generateEventWithAI);
router.get('/:id', getEvent);
router.get('/:id/stats', getEventStats);
router.get('/:id/seats', getEventSeats);

export default router;
