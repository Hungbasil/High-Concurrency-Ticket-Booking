import { Router } from 'express';
import { register, login, getCurrentUser } from '../controllers/user.js';
import { authMiddleware } from '../utils/auth-middleware.js';

const router = Router();

/**
 * POST /api/users/register
 * Register new user
 * Body: { email, password, fullName }
 * Returns: { user, token }
 */
router.post('/register', register);

/**
 * POST /api/users/login
 * Login user
 * Body: { email, password }
 * Returns: { user, token }
 */
router.post('/login', login);

/**
 * GET /api/users/me
 * Get current user profile (requires auth)
 * Returns: { user }
 */
router.get('/me', authMiddleware, getCurrentUser);

export default router;
