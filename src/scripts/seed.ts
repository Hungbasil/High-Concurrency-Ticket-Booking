import pool from '../config/db.js';

const seedData = async () => {
  const client = await pool.connect();
  try {
    console.log('⏳ Đang dọn dẹp dữ liệu cũ...');
    await client.query('DELETE FROM reservations');
    await client.query('DELETE FROM seats');
    await client.query('DELETE FROM events');

    console.log('🎵 Đang tạo Sự kiện Concert...');
    const eventRes = await client.query(`
      INSERT INTO events (title, start_time, status)
      VALUES ('Sky Tour 2026 - M-TP', NOW() + INTERVAL '10 days', 'ON_SALE')
      RETURNING id;
    `);
    const eventId = eventRes.rows[0].id;

    console.log(`🪑 Đang tạo 5000 ghế ngồi cho sự kiện (ID: ${eventId})...`);
    
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

    console.log(' Đã tạo thành công 1 Sự kiện và 5000 ghế ngồi!');
    process.exit(0);
  } catch (error) {
    console.error(' Lỗi khi seed dữ liệu:', error);
    process.exit(1);
  } finally {
    client.release();
  }
};

seedData();