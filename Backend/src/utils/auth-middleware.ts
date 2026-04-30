import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Enforce JWT_SECRET from environment
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('❌ JWT_SECRET environment variable is required!');
}

/**
 * Middleware to verify JWT token
 * Sets userId in request object if token is valid
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const token = req.headers.authorization?.split(' ')[1]; // Bearer <token>

    if (!token) {
      res.status(401).json({
        success: false,
        error: { code: 'NO_TOKEN', message: 'Token không tìm thấy' },
      });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    (req as any).userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Token không hợp lệ hoặc đã hết hạn' },
    });
  }
};
