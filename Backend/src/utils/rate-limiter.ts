import type { Request, Response, NextFunction } from 'express';
import { redisClient } from '../config/redis.js';
import { CustomError } from './error-handler.js';

export interface RateLimitOptions {
  windowMs: number; // time window in milliseconds
  maxRequests: number; // max requests per window
  message?: string;
  keyPrefix?: string;
}

export const createRateLimiter = (options: RateLimitOptions) => {
  const {
    windowMs,
    maxRequests,
    message = 'Quá nhiều requests. Vui lòng thử lại sau.',
    keyPrefix = 'ratelimit:'
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = `${keyPrefix}${req.ip}`;
      const current = await redisClient.incr(key);

      if (current === 1) {
        await redisClient.expire(key, Math.ceil(windowMs / 1000));
      }

      if (current > maxRequests) {
        throw new CustomError(message, 429, 'RATE_LIMIT_EXCEEDED');
      }

      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - current));
      next();
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      // If Redis is down, allow request to pass
      console.warn('⚠️ Rate limiter error, allowing request:', error);
      next();
    }
  };
};

// Default limiters
export const generalLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
  keyPrefix: 'ratelimit:general:'
});

export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  message: 'Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 15 phút.',
  keyPrefix: 'ratelimit:auth:'
});

export const bookingLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,
  message: 'Quá nhiều yêu cầu đặt vé. Vui lòng chờ một chút.',
  keyPrefix: 'ratelimit:booking:'
});
