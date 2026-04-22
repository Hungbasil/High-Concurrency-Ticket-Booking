import { Router } from 'express';
import { createEvent, getEventStats, getEventSeats } from '../controllers/event.js';


const router = Router();


router.post('/', createEvent);
router.get('/:id/stats', getEventStats);
router.get('/:id/seats', getEventSeats);
export default router;
