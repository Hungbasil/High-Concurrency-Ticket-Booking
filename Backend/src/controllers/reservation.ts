
import type { Request, Response } from 'express';
import redisClient from '../config/redis.js';
import pool from '../config/db.js';
import { io } from '../index.js';
import axios from 'axios';

export const holdSeat = async (req: Request, res: Response): Promise<void> => {
  const { userId, eventId, seatCode } = req.body;

  try {

    const lockKey = `lock:event:${eventId}:seat:${seatCode}`;
    const isLocked = await redisClient.set(lockKey, userId, {
      NX: true,
      EX: 300 
    });

    // Nếu trả về false (null) -> 9.999 người đến sau sẽ lọt vào đây và bị đuổi về
    if (!isLocked) {
      res.status(409).json({ message: 'Ghế đã có người chọn hoặc đang được giữ!' });
      return;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const updateRes = await client.query(`
        UPDATE seats SET status = $1 
        WHERE event_id = $2 AND seat_code = $3 AND status = $4
        RETURNING id
      `, ['HOLD', eventId, seatCode, 'AVAILABLE']);

      if (updateRes.rows.length === 0) {
        await redisClient.del(lockKey);
        await client.query('ROLLBACK');
        res.status(400).json({ message: 'Ghế không tồn tại hoặc đã bán!' });
        return;
      }

      const seatId = updateRes.rows[0].id;

      // Convert temp-user to NULL for database, or use userId if it's a valid UUID
      const finalUserId = userId === 'temp-user' || !userId || userId === 'null' ? null : userId;

      const reservationRes = await client.query(`
        INSERT INTO reservations (user_id, seat_id, status, expires_at)
        VALUES ($1, $2, 'PENDING', NOW() + INTERVAL '5 minutes')
        RETURNING id, expires_at
      `, [finalUserId, seatId]);

      await client.query('COMMIT');
      setImmediate(() => {
        io.emit('seatStatusChanged', {
          eventId,
          seatCode,
          status: 'HOLD'
        });
      });
      
      res.status(200).json({
        message: 'Giữ ghế thành công! Bạn có 5 phút để thanh toán.',
        reservationId: reservationRes.rows[0].id,
        expiresAt: reservationRes.rows[0].expires_at
      });

    } catch (dbError) {
      await client.query('ROLLBACK');
      await redisClient.del(lockKey); 
      throw dbError;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error(' Lỗi hệ thống:', error);
    res.status(500).json({ message: 'Lỗi server nội bộ' });
  }
};

// Controller xử lý thanh toán sau khi giữ ghế thành công (giả lập)
export const checkout = async (req: Request, res: Response): Promise<void> => {
  const { userId, reservationId, eventId, seatCode } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Convert temp-user to NULL for database, or use userId if it's a valid UUID
    const finalUserId = userId === 'temp-user' || !userId || userId === 'null' ? null : userId;

    // ✅ OPTIMIZED: Get seat_id and check reservation in one query
    const resCheck = await client.query(`
      SELECT seat_id FROM reservations 
      WHERE id = $1 AND (user_id = $2 OR (user_id IS NULL AND $2 IS NULL)) AND status = 'PENDING' AND expires_at > NOW()
    `, [reservationId, finalUserId]);

    if (resCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(400).json({ message: 'Đơn hàng không tồn tại, đã thanh toán hoặc quá hạn 5 phút!' });
      return;
    }

    const seatId = resCheck.rows[0].seat_id;
    
    // ✅ OPTIMIZED: Execute both updates concurrently (in parallel within transaction)
    await Promise.all([
      client.query(`UPDATE reservations SET status = 'PAID' WHERE id = $1`, [reservationId]),
      client.query(`UPDATE seats SET status = 'SOLD' WHERE id = $1`, [seatId])
    ]);

    await client.query('COMMIT');
    
    // ✅ OPTIMIZED: Emit event and clear lock asynchronously (non-blocking)
    setImmediate(async () => {
      io.emit('seatStatusChanged', {
        eventId,
        seatCode,
        status: 'SOLD'
      });
      const lockKey = `lock:event:${eventId}:seat:${seatCode}`;
      await redisClient.del(lockKey);
    });

    res.status(200).json({ message: '✅ Thanh toán thành công!' });

  } catch (error) {
    await client.query('ROLLBACK'); 
    console.error(' Lỗi thanh toán:', error);
    res.status(500).json({ message: 'Lỗi server khi thanh toán' });
  } finally {
    client.release();
  }
};

/**
 * GET /api/reservations/user/me
 * Get all bookings for the current user
 */
export const getUserBookings = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Không được xác thực' },
      });
      return;
    }

    const client = await pool.connect();

    try {
      const bookingsRes = await client.query(
        `SELECT 
          r.id as reservation_id,
          r.status,
          r.created_at,
          s.seat_code,
          s.price,
          e.id as event_id,
          e.title,
          e.start_time
        FROM reservations r
        JOIN seats s ON r.seat_id = s.id
        JOIN events e ON s.event_id = e.id
        WHERE r.user_id = $1 AND r.status = 'PAID'
        ORDER BY r.created_at DESC`,
        [userId]
      );

      res.status(200).json({
        success: true,
        data: bookingsRes.rows,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(' Lỗi lấy danh sách vé:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Lỗi máy chủ nội bộ' },
    });
  }
};

/**
 * POST /api/reservations/ai/auto-book
 * AI tự động đặt vé theo yêu cầu người dùng
 * Request: { eventId, userId, prompt }
 * Ví dụ: "Hãy giúp tôi đặt 3 vé ghế tốt nhất cho sự kiện này"
 */
export const autoBookWithAI = async (req: Request, res: Response): Promise<void> => {
  const { eventId, userId, prompt } = req.body;
  const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434/api/chat';

  try {
    if (!eventId || !userId || !prompt) {
      res.status(400).json({
        success: false,
        error: { code: 'MISSING_PARAMS', message: 'eventId, userId, và prompt là bắt buộc' }
      });
      return;
    }

    console.log(` AI Auto-Book: ${prompt} (eventId: ${eventId})`);

    // Lấy danh sách ghế available
    const seatsRes = await pool.query(
      `SELECT id, seat_code, price, status FROM seats 
       WHERE event_id = $1 AND status = 'AVAILABLE'
       ORDER BY seat_code ASC
       LIMIT 20`,
      [eventId]
    );

    const availableSeats = seatsRes.rows;

    if (availableSeats.length === 0) {
      res.status(400).json({
        success: false,
        error: { code: 'NO_SEATS', message: 'Không còn ghế trống' }
      });
      return;
    }

    // Gọi Ollama AI để quyết định đặt bao nhiêu vé
    const aiPrompt = `Dựa trên yêu cầu: "${prompt}"
    Danh sách ghế available: ${availableSeats.map(s => s.seat_code).join(', ')}
    
    Hãy chọn một số ghế tốt nhất (ưu tiên ghế ở giữa như A5-A10, B5-B10). 
    Trả lời chỉ danh sách mã ghế cách nhau bằng dấu phẩy, ví dụ: A5,A6,B5`;

    const aiResponse = await axios.post(OLLAMA_URL, {
      model: 'mistral',
      messages: [{ role: 'user', content: aiPrompt }],
      stream: false,
      timeout: 30000
    });

    const selectedSeatsStr = aiResponse.data.message.content;
    const selectedCodes = selectedSeatsStr.split(',').map((s: string) => s.trim().toUpperCase()).filter((s: string) => s.length > 0);

    console.log(`🤖 AI đã chọn ghế: ${selectedCodes.join(', ')}`);
    const seatsToBook = availableSeats.filter(seat => 
      selectedCodes.includes(seat.seat_code)
    ).slice(0, 5);

    if (seatsToBook.length === 0) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_SEATS', message: 'AI không chọn được ghế hợp lệ' }
      });
      return;
    }

    // Tự động hold + checkout các ghế
    const bookedSeats = [];
    const client = await pool.connect();

    try {
      for (const seat of seatsToBook) {
        try {
          await client.query('BEGIN');

          // Lock seat in Redis
          const lockKey = `lock:event:${eventId}:seat:${seat.seat_code}`;
          const isLocked = await redisClient.set(lockKey, userId, { NX: true, EX: 300 });

          if (!isLocked) {
            continue; // Skip if someone else grabbed it
          }

          // Hold seat
          const updateRes = await client.query(
            `UPDATE seats SET status = $1 
             WHERE event_id = $2 AND seat_code = $3 AND status = $4
             RETURNING id`,
            ['HOLD', eventId, seat.seat_code, 'AVAILABLE']
          );

          if (updateRes.rows.length === 0) {
            await redisClient.del(lockKey);
            await client.query('ROLLBACK');
            continue;
          }

          const seatId = updateRes.rows[0].id;

          // Create reservation
          const reservationRes = await client.query(
            `INSERT INTO reservations (user_id, seat_id, status, expires_at)
             VALUES ($1, $2, 'PENDING', NOW() + INTERVAL '5 minutes')
             RETURNING id, expires_at`,
            [userId, seatId]
          );

          const reservationId = reservationRes.rows[0].id;

          // Immediately checkout
          const seatCheckRes = await client.query(
            `SELECT seat_id FROM reservations 
             WHERE id = $1 AND user_id = $2 AND status = 'PENDING' AND expires_at > NOW()`,
            [reservationId, userId]
          );

          if (seatCheckRes.rows.length > 0) {
            await Promise.all([
              client.query(`UPDATE reservations SET status = 'PAID' WHERE id = $1`, [reservationId]),
              client.query(`UPDATE seats SET status = 'SOLD' WHERE id = $1`, [seatId])
            ]);

            bookedSeats.push({
              seatCode: seat.seat_code,
              price: seat.price,
              reservationId
            });

            // Emit event
            setImmediate(async () => {
              io.emit('seatStatusChanged', {
                eventId,
                seatCode: seat.seat_code,
                status: 'SOLD'
              });
              await redisClient.del(lockKey);
            });
          }

          await client.query('COMMIT');
        } catch (seatError) {
          await client.query('ROLLBACK');
          console.error(` Lỗi đặt ghế ${seat.seat_code}:`, seatError);
        }
      }

      if (bookedSeats.length > 0) {
        const totalPrice = bookedSeats.reduce((sum, s) => sum + s.price, 0);
        res.status(200).json({
          success: true,
          data: {
            bookedSeats,
            totalPrice,
            aiMessage: `Đặt thành công ${bookedSeats.length} vé: ${bookedSeats.map(s => s.seatCode).join(', ')}`
          },
          message: ` Đặt thành công ${bookedSeats.length} vé`
        });
      } else {
        res.status(400).json({
          success: false,
          error: { code: 'BOOKING_FAILED', message: 'Không thể đặt bất kỳ vé nào' }
        });
      }
    } finally {
      client.release();
    }

  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(' Lỗi gọi Ollama:', error.message);
      res.status(503).json({
        success: false,
        error: {
          code: 'OLLAMA_ERROR',
          message: 'Không thể kết nối tới Ollama. Vui lòng chắc chắn Ollama đang chạy'
        }
      });
      return;
    }

    console.error(' Lỗi Auto-Book:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Lỗi máy chủ nội bộ khi auto-book' }
    });
  }
};