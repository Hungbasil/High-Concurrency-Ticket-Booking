import { Router } from 'express';
import { createEvent, getEventStats } from '../controllers/event.js';


const router = Router();


router.post('/', createEvent);
router.get('/:id/stats', getEventStats);
export default router;
