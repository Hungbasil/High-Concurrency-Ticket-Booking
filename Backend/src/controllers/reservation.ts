
import type { Request, Response } from 'express';
import redisClient from '../config/redis.js';
import pool from '../config/db.js';
import { io } from '../index.js';
import axios from 'axios';

export const holdSeat = async (req: Request, res: Response): Promise<void> => {
  const { eventId, seatCode } = req.body;
  // Get userId from JWT token (in request), not from request body
  const userId = (req as any).userId || null;

  try {
    // Validate input
    if (!eventId || !seatCode) {
      res.status(400).json({ message: 'eventId và seatCode là bắt buộc' });
      return;
    }

    const lockKey = `lock:event:${eventId}:seat:${seatCode}`;
    const isLocked = await redisClient.set(lockKey, userId || 'temp-user', {
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

      const reservationRes = await client.query(`
        INSERT INTO reservations (user_id, seat_id, status, expires_at)
        VALUES ($1, $2, 'PENDING', NOW() + INTERVAL '5 minutes')
        RETURNING id, expires_at
      `, [userId, seatId]);

      await client.query('COMMIT');
      
      // Emit socket event asynchronously without blocking response
      setImmediate(async () => {
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
  const { reservationId, eventId, seatCode } = req.body;
  // Get userId from JWT token, not from request body
  const userId = (req as any).userId || null;

  // Validate input
  if (!reservationId || !eventId || !seatCode) {
    res.status(400).json({ message: 'reservationId, eventId và seatCode là bắt buộc' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ✅ OPTIMIZED: Get seat_id and check reservation in one query
    const resCheck = await client.query(`
      SELECT seat_id FROM reservations 
      WHERE id = $1 AND (user_id = $2 OR (user_id IS NULL AND $2 IS NULL)) AND status = 'PENDING' AND expires_at > NOW()
    `, [reservationId, userId]);

    if (resCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(400).json({ message: 'Đơn hàng không tồn tại, đã thanh toán hoặc quá hạn 5 phút!' });
      return;
    }

    const seatId = resCheck.rows[0].seat_id;
    
    // ✅ OPTIMIZED: Execute both updates concurrently (in parallel within transaction)
    const [updateRes1, updateRes2] = await Promise.all([
      client.query(`UPDATE reservations SET status = 'PAID' WHERE id = $1`, [reservationId]),
      client.query(`UPDATE seats SET status = 'SOLD' WHERE id = $1`, [seatId])
    ]);

    await client.query('COMMIT');
    
    // ✅ OPTIMIZED: Emit event and clear lock asynchronously (non-blocking)
    setImmediate(async () => {
      try {
        io.emit('seatStatusChanged', {
          eventId,
          seatCode,
          status: 'SOLD'
        });
        const lockKey = `lock:event:${eventId}:seat:${seatCode}`;
        await redisClient.del(lockKey);
      } catch (err) {
        console.error('[Checkout] ❌ Lỗi phát sự kiện:', err);
      }
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

    console.log(`🤖 AI Auto-Select: ${prompt} (eventId: ${eventId})`);

    // Extract số lượng ghế từ prompt (ví dụ: "3 vé", "2 ghế", etc)
    const numberMatch = prompt.match(/\d+/);
    const maxSeats = numberMatch ? Math.min(parseInt(numberMatch[0]), 5) : 3; // Tối đa 5 vé

    // Extract dãy ghế từ prompt (ví dụ: "dãy K", "row K", "hàng K", etc)
    const rowMatch = prompt.match(/(?:dãy|hàng|row|row\s*)\s*([A-Z])/i);
    const requestedRow = rowMatch ? rowMatch[1].toUpperCase() : null;

    // Extract ghế cụ thể từ prompt (ví dụ: "F10", "F11", "F10 và F11", etc)
    const specificSeatsMatch = prompt.match(/([A-Z]\d+)/g);
    const requestedSeats = specificSeatsMatch ? specificSeatsMatch.map((s: string) => s.toUpperCase()) : [];

    console.log(`📊 AI sẽ chọn tối đa ${maxSeats} vé${requestedRow ? ` từ dãy ${requestedRow}` : ''}${requestedSeats.length > 0 ? ` (yêu cầu: ${requestedSeats.join(', ')})` : ''}`);

    // Lấy danh sách ghế available
    let seatsQuery = `SELECT id, seat_code, price, status FROM seats 
       WHERE event_id = $1 AND status = 'AVAILABLE'`;
    const queryParams: any[] = [eventId];
    
    // Nếu yêu cầu dãy cụ thể, filter theo dãy
    if (requestedRow) {
      seatsQuery += ` AND seat_code LIKE $2`;
      queryParams.push(`${requestedRow}%`);
    }
    
    seatsQuery += ` ORDER BY seat_code ASC`;

    const seatsRes = await pool.query(seatsQuery, queryParams);
    const availableSeats = seatsRes.rows;

    if (availableSeats.length === 0) {
      res.status(400).json({
        success: false,
        error: { code: 'NO_SEATS', message: requestedRow ? `Không còn ghế trống ở dãy ${requestedRow}` : 'Không còn ghế trống' }
      });
      return;
    }

    // Gọi Ollama AI để chọn ghế (giới hạn số lượng)
    const aiPrompt = `Chọn ${maxSeats} ghế từ: ${availableSeats.map(s => s.seat_code).join(',')}. Trả lời: A1,A2,A3`;


    const smartFallback = (): string[] => {
      // Nếu người dùng yêu cầu ghế cụ thể, kiểm tra xem ghế đó có available không
      if (requestedSeats.length > 0) {
        const availableRequested = availableSeats.filter(s => 
          requestedSeats.includes(s.seat_code)
        ).map((s) => s.seat_code);

        if (availableRequested.length > 0) {
          console.log(`✅ Tìm thấy ghế được yêu cầu: ${availableRequested.join(', ')}`);
          return availableRequested.slice(0, maxSeats);
        } else {
          console.warn(`⚠️ Ghế được yêu cầu (${requestedSeats.join(', ')}) không available, dùng smart selection`);
        }
      }

      // Chọn nhóm ghế liên tiếp tốt nhất ở giữa sân
      const seatsByRow = new Map<string, any[]>();
      
      // Nhóm ghế theo dãy (A, B, C, ...)
      availableSeats.forEach((seat: any) => {
        const match = seat.seat_code.match(/^([A-Z])(\d+)$/);
        if (match) {
          const row = match[1];
          const num = parseInt(match[2]);
          if (!seatsByRow.has(row)) seatsByRow.set(row, []);
          seatsByRow.get(row)!.push({ ...seat, num });
        }
      });

      let bestGroup: any[] = [];
      let bestScore = -Infinity;

      // Tìm nhóm ghế liên tiếp tốt nhất
      seatsByRow.forEach((seatsInRow) => {
        seatsInRow.sort((a, b) => a.num - b.num);

        // Tìm tất cả các nhóm liên tiếp có ít nhất maxSeats ghế
        for (let i = 0; i <= seatsInRow.length - maxSeats; i++) {
          const group = seatsInRow.slice(i, i + maxSeats);
          
          // Kiểm tra liên tiếp
          let isConsecutive = true;
          for (let j = 1; j < group.length; j++) {
            if (group[j].num !== group[j - 1].num + 1) {
              isConsecutive = false;
              break;
            }
          }

          if (isConsecutive) {
            // Score = ưu tiên ghế ở giữa (số gần 6 tốt hơn)
            const avgNum = group.reduce((sum, s) => sum + s.num, 0) / group.length;
            const score = -Math.abs(avgNum - 6); // Âm để sort từ cao xuống thấp
            
            if (score > bestScore) {
              bestScore = score;
              bestGroup = group;
            }
          }
        }
      });

      // Nếu tìm được nhóm liên tiếp, dùng nó; không thì lấy ghế đầu tiên
      if (bestGroup.length > 0) {
        return bestGroup.map(s => s.seat_code);
      }

        // Fallback cuối: lấy ghế gần giữa nhất từ tất cả available
      return availableSeats
        .filter((s: any) => /^[A-Z]\d+$/.test(s.seat_code))
        .sort((a: any, b: any) => {
          const aNum = parseInt(a.seat_code.match(/\d+/)![0]);
          const bNum = parseInt(b.seat_code.match(/\d+/)![0]);
          return Math.abs(aNum - 6) - Math.abs(bNum - 6);
        })
        .slice(0, maxSeats)
        .map((s: any) => s.seat_code);
    };

    let selectedCodes: string[] = [];
    
    // Nếu người dùng yêu cầu ghế cụ thể, kiểm tra xem ghế đó có available không
    if (requestedSeats.length > 0) {
      console.log(`📍 Kiểm tra ghế được yêu cầu: ${requestedSeats.join(', ')}`);
      
      const availableRequested = availableSeats.filter(s => 
        requestedSeats.includes(s.seat_code)
      ).map(s => s.seat_code);

      if (availableRequested.length === requestedSeats.length) {
        // Tất cả ghế được yêu cầu đều available
        selectedCodes = availableRequested;
        console.log(`✅ Tất cả ghế được yêu cầu đều available: ${selectedCodes.join(', ')}`);
      } else {
        // Một số ghế không available
        const notFound = requestedSeats.filter((s: string) => !availableRequested.includes(s));
        console.error(`❌ Ghế ${notFound.join(', ')} không available`);
        
        res.status(400).json({
          success: false,
          error: { 
            code: 'SEATS_NOT_AVAILABLE', 
            message: `Ghế ${notFound.join(', ')} không còn. Vui lòng chọn ghế khác.`
          }
        });
        return;
      }
    } else {
      // gọi Ollama hoặc fallback
      try {
        console.log(`🤖 Gọi Ollama để chọn ${maxSeats} ghế...`);
      
        const ollamaGenerateUrl = OLLAMA_URL.replace('/api/chat', '/api/generate');
        console.log(`   URL: ${ollamaGenerateUrl}`);
        
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout 15s')), 15000)
        );
        
        const aiResponse = await Promise.race<any>([
          axios.post(ollamaGenerateUrl, {
            model: 'mistral', 
            prompt: aiPrompt,
            stream: false,
            timeout: 15000
          }),
          timeoutPromise
        ]);

        const responseText = aiResponse.data.response || aiResponse.data.result || '';
        console.log(`✅ Ollama response: "${responseText}"`);

        selectedCodes = responseText
          .split(/[,\s]+/)
          .map((s: string) => s.trim().toUpperCase())
          .filter((s: string) => /^[A-Z]\d+$/.test(s))
          .slice(0, maxSeats);
          
        if (selectedCodes.length === 0) {
          throw new Error('AI không trích xuất được mã ghế');
        }
        
        console.log(`✅ AI chọn: ${selectedCodes.join(', ')}`);
      } catch (ollamaError) {
        console.warn(` Ollama error, fallback:`, ollamaError instanceof Error ? ollamaError.message : ollamaError);
        selectedCodes = smartFallback();
        console.log(`✅ Fallback chọn: ${selectedCodes.join(', ')}`);
      }
    }

    console.log(`✅ AI đã chọn ghế: ${selectedCodes.join(', ')}`);

    const seatsToBook = availableSeats.filter(seat => 
      selectedCodes.includes(seat.seat_code)
    );

    if (seatsToBook.length === 0) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_SEATS', message: 'AI không chọn được ghế hợp lệ' }
      });
      return;
    }

    // Chỉ HOLD không thanh toán
    const heldSeats = [];
    const client = await pool.connect();

    try {
      for (const seat of seatsToBook) {
        try {
          await client.query('BEGIN');

          // Lock seat in Redis
          const lockKey = `lock:event:${eventId}:seat:${seat.seat_code}`;
          const isLocked = await redisClient.set(lockKey, userId, { NX: true, EX: 300 });

          if (!isLocked) {
            console.log(`⚠️ Ghế ${seat.seat_code} đã bị khóa, bỏ qua`);
            await client.query('ROLLBACK');
            continue;
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
            console.log(`⚠️ Ghế ${seat.seat_code} không tồn tại hoặc đã bán`);
            continue;
          }

          const seatId = updateRes.rows[0].id;

          // Create reservation với status PENDING (không PAID)
          const reservationRes = await client.query(
            `INSERT INTO reservations (user_id, seat_id, status, expires_at)
             VALUES ($1, $2, 'PENDING', NOW() + INTERVAL '5 minutes')
             RETURNING id, expires_at`,
            [userId, seatId]
          );

          const reservationId = reservationRes.rows[0].id;
          const expiresAt = reservationRes.rows[0].expires_at;

          heldSeats.push({
            seatId: seat.id,
            seatCode: seat.seat_code,
            price: seat.price,
            reservationId,
            expiresAt
          });

          // Emit event cho Socket.IO
          setImmediate(() => {
            io.emit('seatStatusChanged', {
              eventId,
              seatCode: seat.seat_code,
              status: 'HOLD'
            });
          });

          await client.query('COMMIT');
        } catch (seatError) {
          await client.query('ROLLBACK');
          console.error(`❌ Lỗi hold ghế ${seat.seat_code}:`, seatError);
        }
      }

      if (heldSeats.length > 0) {
        const totalPrice = heldSeats.reduce((sum, s) => sum + s.price, 0);
        res.status(200).json({
          success: true,
          data: {
            heldSeats,
            totalPrice,
            aiMessage: `✅ AI đã chọn ${heldSeats.length} vé: ${heldSeats.map(s => s.seatCode).join(', ')}. Những vé này đã được giữ lại, hãy thêm vào giỏ hàng và thanh toán!`
          },
          message: `✅ AI đã chọn thành công ${heldSeats.length} vé. Vui lòng kiểm tra giỏ hàng để thanh toán.`
        });
      } else {
        res.status(400).json({
          success: false,
          error: { code: 'BOOKING_FAILED', message: 'Không thể hold bất kỳ vé nào' }
        });
      }
    } finally {
      client.release();
    }

  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('🔴 Lỗi gọi Ollama:', error.message);
      res.status(503).json({
        success: false,
        error: {
          code: 'OLLAMA_ERROR',
          message: 'Không thể kết nối tới Ollama. Vui lòng chắc chắn Ollama đang chạy'
        }
      });
      return;
    }

    console.error('🔴 Lỗi Auto-Select:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Lỗi máy chủ nội bộ khi AI chọn ghế' }
    });
  }
};