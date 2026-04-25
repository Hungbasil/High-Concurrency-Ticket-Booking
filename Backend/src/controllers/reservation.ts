
import type { Request, Response } from 'express';
import redisClient from '../config/redis.js';
import pool from '../config/db.js';
import { io } from '../index.js';

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

      // Kiểm tra lần cuối xem ghế có thật sự đang trống trong DB không
      const seatRes = await client.query(
        'SELECT id FROM seats WHERE event_id = $1 AND seat_code = $2 AND status = $3',
        [eventId, seatCode, 'AVAILABLE']
      );

      if (seatRes.rows.length === 0) {
         await redisClient.del(lockKey);
         await client.query('ROLLBACK');
         res.status(400).json({ message: 'Ghế không tồn tại hoặc đã bán!' });
         return;
      }

      const seatId = seatRes.rows[0].id;

      // Cập nhật trạng thái ghế thành HOLD (Đang giữ)
      await client.query('UPDATE seats SET status = $1 WHERE id = $2', ['HOLD', seatId]);

      // Convert temp-user to NULL for database, or use userId if it's a valid UUID
      const finalUserId = userId === 'temp-user' || !userId || userId === 'null' ? null : userId;

      const reservationRes = await client.query(`
        INSERT INTO reservations (user_id, seat_id, status, expires_at)
        VALUES ($1, $2, 'PENDING', NOW() + INTERVAL '5 minutes')
        RETURNING id, expires_at
      `, [finalUserId, seatId]);

      await client.query('COMMIT'); // Xác nhận toàn bộ thay đổi
      
      // Broadcast sự kiện ghế thay đổi trạng thái
      io.emit('seatStatusChanged', {
        eventId,
        seatCode,
        status: 'HOLD'
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
    await client.query(`UPDATE reservations SET status = 'PAID' WHERE id = $1`, [reservationId]);

    await client.query(`UPDATE seats SET status = 'SOLD' WHERE id = $1`, [seatId]);

    await client.query('COMMIT');
    
    // Broadcast sự kiện ghế thay đổi trạng thái
    io.emit('seatStatusChanged', {
      eventId,
      seatCode,
      status: 'SOLD'
    });

    const lockKey = `lock:event:${eventId}:seat:${seatCode}`;
    await redisClient.del(lockKey);

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
    console.error('🔴 Lỗi lấy danh sách vé:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Lỗi máy chủ nội bộ' },
    });
  }
};