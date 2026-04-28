import { Router } from 'express';
import { register, login, getCurrentUser } from '../controllers/user.js';
import { authMiddleware } from '../utils/auth-middleware.js';
import { validateRequest } from '../utils/validation.js';

const router = Router();

// Validation schemas
const registerSchema = {
  email: {
    type: 'string' as const,
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    maxLength: 255
  },
  password: {
    type: 'string' as const,
    required: true,
    minLength: 6,
    maxLength: 128
  },
  fullName: {
    type: 'string' as const,
    required: true,
    minLength: 2,
    maxLength: 100
  }
};

const loginSchema = {
  email: {
    type: 'string' as const,
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  password: {
    type: 'string' as const,
    required: true,
    minLength: 6
  }
};

/**
 * POST /api/users/register
 * Register new user
 * Body: { email, password, fullName }
 * Returns: { user, token }
 */
router.post('/register', validateRequest(registerSchema), register);

/**
 * POST /api/users/login
 * Login user
 * Body: { email, password }
 * Returns: { user, token }
 */
router.post('/login', validateRequest(loginSchema), login);

/**
 * GET /api/users/me
 * Get current user profile (requires auth)
 * Returns: { user }
 */
router.get('/me', authMiddleware, getCurrentUser);

export default router;
