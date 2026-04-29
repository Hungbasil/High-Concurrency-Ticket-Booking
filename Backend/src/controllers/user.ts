import type { Request, Response } from 'express';
import pool from '../config/db.js';
import { AppError } from '../utils/app-error.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Enforce JWT_SECRET from environment
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('❌ JWT_SECRET environment variable is required!');
}
const JWT_EXPIRE = '7d';

// Hash password with bcrypt
const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12);
};

// Verify password with bcrypt
const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// Generate JWT token
const generateToken = (userId: string): string => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRE });
};

/**
 * POST /api/users/register
 * Register a new user
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  const { email, password, fullName } = req.body;

  try {
    // Validate input
    if (!email || !password || !fullName) {
      throw new AppError(
        'Email, mật khẩu và tên người dùng là bắt buộc',
        400,
        'MISSING_FIELDS'
      );
    }

    // Password must be at least 8 characters and contain uppercase, number
    if (password.length < 8) {
      throw new AppError(
        'Mật khẩu phải có ít nhất 8 ký tự',
        400,
        'WEAK_PASSWORD'
      );
    }
    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      throw new AppError(
        'Mật khẩu phải chứa ít nhất 1 chữ hoa và 1 chữ số',
        400,
        'WEAK_PASSWORD'
      );
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Check if user already exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        await client.query('ROLLBACK');
        throw new AppError(await 
          'Email này đã được đăng ký',
          409,
          'USER_EXISTS'
        );
      }

      // Hash password and create user
      const passwordHash = hashPassword(password);
      const userRes = await client.query(
        `INSERT INTO users (full_name, email, password_hash, created_at)
         VALUES ($1, $2, $3, NOW())
         RETURNING id, email, full_name, created_at`,
        [fullName, email, passwordHash]
      );

      await client.query('COMMIT');

      const user = userRes.rows[0];
      const token = generateToken(user.id);

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.full_name,
            created_at: user.created_at,
          },
          token,
        },
        message: 'Đăng ký thành công!',
      });
    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: { code: error.code, message: error.message },
      });
      return;
    }

    console.error('🔴 Lỗi đăng ký:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Lỗi máy chủ nội bộ' },
    });
  }
};

/**
 * POST /api/users/login
 * Login user
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  try {
    // Validate input
    if (!email || !password) {
      throw new AppError(
        'Email và mật khẩu là bắt buộc',
        400,
        'MISSING_FIELDS'
      );
    }

    const client = await pool.connect();

    try {
      // Find user
      const userRes = await client.query(
        `SELECT id, email, full_name, password_hash, created_at 
         FROM users 
         WHERE email = $1`,
        [email]
      );

      if (userRes.rows.length === 0) {
        throw new AppError(
          'Email hoặc mật khẩu không chính xác',
          401,
          'INVALID_CREDENTIALS'
        );
      }

      const user = userRes.rows[0];

      // Verify password
      const isPasswordValid = await verifyPassword(password, user.password_hash);
      if (!isPasswordValid) {
        throw new AppError(
          'Email hoặc mật khẩu không chính xác',
          401,
          'INVALID_CREDENTIALS'
        );
      }

      const token = generateToken(user.id);

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.full_name,
            created_at: user.created_at,
          },
          token,
        },
        message: 'Đăng nhập thành công!',
      });
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: { code: error.code, message: error.message },
      });
      return;
    }

    console.error('🔴 Lỗi đăng nhập:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Lỗi máy chủ nội bộ' },
    });
  }
};

/**
 * GET /api/users/me
 * Get current user profile (requires auth token)
 */
export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId; // Set by auth middleware

    if (!userId) {
      throw new AppError('Không được xác thực', 401, 'UNAUTHORIZED');
    }

    const client = await pool.connect();

    try {
      const userRes = await client.query(
        `SELECT id, email, full_name, created_at 
         FROM users 
         WHERE id = $1`,
        [userId]
      );

      if (userRes.rows.length === 0) {
        throw new AppError('Không tìm thấy người dùng', 404, 'USER_NOT_FOUND');
      }

      const user = userRes.rows[0];

      res.status(200).json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.full_name,
          created_at: user.created_at,
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: { code: error.code, message: error.message },
      });
      return;
    }

    console.error('🔴 Lỗi lấy thông tin user:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Lỗi máy chủ nội bộ' },
    });
  }
};
