import type { Request, Response } from 'express';
import pool from '../config/db.js';
import { AppError } from '../utils/app-error.js';

export const createEvent = async (req: Request, res: Response): Promise<void> => {
  const { title, start_time } = req.body;

  try {

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      throw new AppError('Title là bắt buộc và phải là chuỗi hợp lệ', 400, 'INVALID_TITLE');
    }

    if (!start_time || typeof start_time !== 'string') {
      throw new AppError('Start_time là bắt buộc và phải là chuỗi hợp lệ', 400, 'INVALID_START_TIME');
    }
    const startTimeDate = new Date(start_time);
    if (isNaN(startTimeDate.getTime())) {
      throw new AppError('Start_time phải là định dạng ISO 8601 hợp lệ', 400, 'INVALID_DATE_FORMAT');
    }

    if (startTimeDate <= new Date()) {
      throw new AppError('Start_time phải là trong tương lai', 400, 'PAST_DATE');
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO events (title, start_time, status, created_at)
         VALUES ($1, $2, $3, NOW())
         RETURNING id, title, start_time, status, created_at`,
        [title.trim(), start_time, 'UPCOMING']
      );
      await client.query('COMMIT');

      const event = result.rows[0];

      res.status(201).json({
        success: true,
        data: {
          id: event.id,
          title: event.title,
          start_time: event.start_time,
          status: event.status,
          created_at: event.created_at
        },
        message: 'Sự kiện được tạo thành công!'
      });
    } catch (dbError) {
      // Rollback nếu có lỗi
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code,
          message: error.message
        }
      });
      return;
    }

    console.error(' Lỗi tạo sự kiện:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Lỗi máy chủ nội bộ khi tạo sự kiện'
      }
    });
  }
};
