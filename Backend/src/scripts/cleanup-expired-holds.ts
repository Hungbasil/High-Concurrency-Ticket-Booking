import pool from '../config/db.js';
import redisClient from '../config/redis.js';
import { io } from '../index.js';

/**
 * Cleanup job: Tự động release ghế đã hết hạn (5 phút)
 * Chạy mỗi 30 giây để check và giải phóng
 */
export const cleanupExpiredHolds = async (): Promise<void> => {
  const client = await pool.connect();
  
  try {
    // Lấy tất cả reservations đã hết hạn nhưng vẫn ở trạng thái PENDING
    const expiredRes = await client.query(`
      SELECT r.id, r.seat_id, s.event_id, s.seat_code
      FROM reservations r
      JOIN seats s ON r.seat_id = s.id
      WHERE r.status = 'PENDING' AND r.expires_at < NOW()
    `);

    if (expiredRes.rows.length === 0) {
      return; // Không có ghế nào hết hạn
    }

    console.log(`[Cleanup] 🧹 Phát hiện ${expiredRes.rows.length} ghế hết hạn. Đang giải phóng...`);

    for (const reservation of expiredRes.rows) {
      const { id: reservationId, seat_id: seatId, event_id: eventId, seat_code: seatCode } = reservation;

      try {
        await client.query('BEGIN');

        // Cập nhật reservation sang trạng thái EXPIRED
        await client.query(
          'UPDATE reservations SET status = $1 WHERE id = $2',
          ['EXPIRED', reservationId]
        );

        // Cập nhật seat trở lại AVAILABLE
        await client.query(
          'UPDATE seats SET status = $1 WHERE id = $2',
          ['AVAILABLE', seatId]
        );

        await client.query('COMMIT');

        // Xóa Redis lock
        const lockKey = `lock:event:${eventId}:seat:${seatCode}`;
        await redisClient.del(lockKey);

        // Phát sự kiện WebSocket để cập nhật UI real-time
        setImmediate(() => {
          io.emit('seatStatusChanged', {
            eventId,
            seatCode,
            status: 'AVAILABLE'
          });
        });

        console.log(`[Cleanup] ✅ Giải phóng ghế: ${seatCode} (Event: ${eventId})`);
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`[Cleanup] ❌ Lỗi giải phóng ghế ${seatCode}:`, error);
      }
    }

    console.log(`[Cleanup] 🎉 Hoàn thành giải phóng ${expiredRes.rows.length} ghế hết hạn`);
  } catch (error) {
    console.error('[Cleanup] 🔴 Lỗi cleanup reservations:', error);
  } finally {
    client.release();
  }
};

/**
 * Khởi động cleanup job - chạy mỗi 30 giây
 */
export const startCleanupJob = (): void => {
  console.log('[Cleanup] 🚀 Khởi động background cleanup job (mỗi 30 giây)');
  
  // Chạy lần đầu ngay lập tức
  cleanupExpiredHolds().catch(console.error);
  
  // Sau đó chạy mỗi 30 giây
  setInterval(() => {
    cleanupExpiredHolds().catch(console.error);
  }, 30000);
};
