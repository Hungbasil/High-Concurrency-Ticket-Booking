import { Router } from 'express';
import { createEvent, getEventStats, getEventSeats, getAllEvents, getEvent, generateEventWithAI } from '../controllers/event.js';
import { validateRequest } from '../utils/validation.js';

const router = Router();

// Validation schemas
const createEventSchema = {
  name: {
    type: 'string' as const,
    required: true,
    minLength: 3,
    maxLength: 255
  },
  description: {
    type: 'string' as const,
    required: true,
    minLength: 10,
    maxLength: 2000
  },
  date: {
    type: 'string' as const,
    required: true
  },
  location: {
    type: 'string' as const,
    required: true,
    minLength: 3,
    maxLength: 255
  },
  totalSeats: {
    type: 'number' as const,
    required: true,
    min: 10,
    max: 10000
  }
};

const generateEventSchema = {
  topic: {
    type: 'string' as const,
    required: true,
    minLength: 3,
    maxLength: 200
  }
};

router.get('/', getAllEvents);
router.post('/', validateRequest(createEventSchema), createEvent);
router.post('/ai/generate', validateRequest(generateEventSchema), generateEventWithAI);
router.get('/:id', getEvent);
router.get('/:id/stats', getEventStats);
router.get('/:id/seats', getEventSeats);

export default router;
