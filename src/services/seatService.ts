
import pool from '../config/db.js';

export const generateSeatsInBackground = async (eventId: string): Promise<void> => {
  // Lấy một kết nối mới hoàn toàn độc lập với API Controller
  const client = await pool.connect(); 
  try {
    console.log(`[Background Job] ⏳ Bắt đầu tạo ghế cho sự kiện: ${eventId}...`);
    
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y'];
    let query = 'INSERT INTO seats (event_id, seat_code, price) VALUES ';
    let values: any[] = [];
    let counter = 1;

    for (let r = 0; r < 25; r++) {
      for (let c = 1; c <= 200; c++) {
        const seatCode = `${rows[r]}${c}`;
        const price = r < 5 ? 3000000 : 1000000;
        
        query += `($${counter}, $${counter + 1}, $${counter + 2}),`;
        values.push(eventId, seatCode, price);
        counter += 3;
      }
    }

    query = query.slice(0, -1);
    await client.query(query, values);

    console.log(`[Background Job]  Đã kê xong ghế cho sự kiện: ${eventId}!`);
  } catch (error) {
    console.error(`[Background Job]  Lỗi khi tạo ghế cho sự kiện ${eventId}:`, error);
  } finally {
    client.release();
  }
};