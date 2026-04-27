import type { Request, Response } from 'express';
import pool from '../config/db.js';
import { AppError } from '../utils/app-error.js';
import { generateSeatsInBackground } from '../services/seatService.js';
import axios from 'axios';
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
      const newEventId = event.id; 

      generateSeatsInBackground(newEventId);

      res.status(201).json({
        success: true,
        data: {
          id: event.id,
          title: event.title,
          start_time: event.start_time,
          status: event.status,
          created_at: event.created_at
        },
        message: 'Tạo sự kiện thành công! Hệ thống đang tự động xếp ghế.'
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
        error: { code: error.code, message: error.message }
      });
      return;
    }

    console.error(' Lỗi tạo sự kiện:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Lỗi máy chủ nội bộ khi tạo sự kiện' }
    });
  }
};


export const getEventStats = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE status = 'SOLD') as sold_count,
        COUNT(*) FILTER (WHERE status = 'AVAILABLE') as available_count,
        COALESCE(SUM(price) FILTER (WHERE status = 'SOLD'), 0) as total_revenue
       FROM seats WHERE event_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Không tìm thấy sự kiện' });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        eventId: id,
        soldCount: parseInt(result.rows[0].sold_count),
        availableCount: parseInt(result.rows[0].available_count),
        totalRevenue: parseFloat(result.rows[0].total_revenue)
      }
    });
  } catch (error) {
    console.error('🔴 Lỗi lấy thống kê:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

/**
 * GET /api/events/:id/seats
 * Lấy danh sách ghế của một sự kiện
 *
 * @param req - Request object với params { id: eventId }
 * @param res - Response object
 *
 * @returns {Object} Danh sách ghế
 *
 * @example
 * GET /api/events/550e8400-e29b-41d4-a716-446655440000/seats
 *
 * Response (200):
 * {
 *   "success": true,
 *   "data": [
 *     { "id": "...", "seat_code": "A1", "price": 100000, "status": "AVAILABLE" },
 *     { "id": "...", "seat_code": "A2", "price": 100000, "status": "HOLD" }
 *   ]
 * }
 */
export const getEventSeats = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    // Validate event ID
    if (!id || typeof id !== 'string') {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_EVENT_ID', message: 'Event ID là bắt buộc' }
      });
      return;
    }

    // Truy vấn danh sách ghế
    const result = await pool.query(
      `SELECT id, seat_code, price, status
       FROM seats
       WHERE event_id = $1
       ORDER BY seat_code ASC`,
      [id]
    );

    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('🔴 Lỗi lấy danh sách ghế:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Lỗi máy chủ nội bộ khi lấy danh sách ghế'
      }
    });
  }
};

/**
 * GET /api/events
 * Lấy danh sách tất cả sự kiện
 */
export const getAllEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT id, title, start_time, status, created_at
       FROM events
       ORDER BY start_time ASC`
    );

    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('🔴 Lỗi lấy danh sách sự kiện:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Lỗi máy chủ nội bộ khi lấy danh sách sự kiện'
      }
    });
  }
};

/**
 * GET /api/events/:id
 * Lấy thông tin chi tiết một sự kiện
 */
export const getEvent = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    if (!id || typeof id !== 'string') {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_EVENT_ID', message: 'Event ID là bắt buộc' }
      });
      return;
    }

    const result = await pool.query(
      `SELECT id, title, start_time, status, created_at
       FROM events
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Không tìm thấy sự kiện' }
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('🔴 Lỗi lấy thông tin sự kiện:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Lỗi máy chủ nội bộ khi lấy thông tin sự kiện'
      }
    });
  }
};

/**
 * POST /api/events/ai/generate
 * Generate event using AI (Ollama)
 * Gửi yêu cầu bằng tiếng Việt để AI tạo sự kiện tự động
 */
export const generateEventWithAI = async (req: Request, res: Response): Promise<void> => {
  const { prompt } = req.body;
  const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434/api/chat';

  try {
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      throw new AppError('Prompt là bắt buộc và phải là chuỗi hợp lệ', 400, 'INVALID_PROMPT');
    }

    // Call Ollama AI
    console.log(`🤖 Gọi Ollama với prompt: ${prompt}`);
    
    const aiResponse = await axios.post(OLLAMA_URL, {
      model: 'mistral',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      stream: false,
      timeout: 60000 // 60 seconds timeout
    });

    const assistantMessage = aiResponse.data.message.content;
    console.log(`🤖 Ollama response: ${assistantMessage}`);

    // Check if AI wants to create an event
    if (assistantMessage.toLowerCase().includes('tạo') && assistantMessage.toLowerCase().includes('sự kiện')) {
      const titleMatch = assistantMessage.match(/["']([^"']+)["']/);
      const title = titleMatch ? titleMatch[1] : 'Sự kiện từ AI';

      // Schedule for next Friday
      const nextFriday = new Date();
      nextFriday.setDate(nextFriday.getDate() + ((5 - nextFriday.getDay() + 7) % 7 || 7));
      nextFriday.setHours(19, 0, 0, 0);

      const startTime = nextFriday.toISOString();

      // Create event in database
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const result = await client.query(
          `INSERT INTO events (title, start_time, status, created_at)
           VALUES ($1, $2, $3, NOW())
           RETURNING id, title, start_time, status, created_at`,
          [title.trim(), startTime, 'UPCOMING']
        );

        await client.query('COMMIT');

        const event = result.rows[0];
        generateSeatsInBackground(event.id);

        res.status(201).json({
          success: true,
          data: {
            id: event.id,
            title: event.title,
            start_time: event.start_time,
            status: event.status,
            created_at: event.created_at,
            aiMessage: assistantMessage
          },
          message: `✅ AI đã tạo sự kiện "${title}" thành công!`
        });
      } catch (dbError) {
        await client.query('ROLLBACK');
        throw dbError;
      } finally {
        client.release();
      }
    } else {
      res.status(200).json({
        success: true,
        data: {
          aiMessage: assistantMessage
        },
        message: '🤖 AI đã xử lý yêu cầu nhưng không tạo sự kiện mới'
      });
    }
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: { code: error.code, message: error.message }
      });
      return;
    }

    if (axios.isAxiosError(error)) {
      console.error('🔴 Lỗi gọi Ollama:', error.message);
      res.status(503).json({
        success: false,
        error: {
          code: 'OLLAMA_ERROR',
          message: 'Không thể kết nối tới Ollama. Vui lòng chắc chắn Ollama đang chạy (http://localhost:11434)'
        }
      });
      return;
    }

    console.error('🔴 Lỗi tạo sự kiện với AI:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Lỗi máy chủ nội bộ khi tạo sự kiện với AI' }
    });
  }
};