import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/db.js';
import { connectRedis } from './config/redis.js';
import reservationRoutes from './routes/reservation.js';
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/api/reservations', reservationRoutes);


app.get('/', (req, res) => {
  res.send('Hệ thống Đặt Vé High-Concurrency đang hoạt động!');
});

// Hàm khởi động an toàn
const startServer = async () => {
  try {
    await connectRedis();
    const client = await pool.connect();
    console.log(' Đã kết nối thành công với PostgreSQL!');
    client.release();
    app.listen(port, () => {
      console.log(` Server đang lắng nghe tại http://localhost:${port}`);
    });
  } catch (error) {
    console.error(' Lỗi khởi động hệ thống:', error);
    process.exit(1);
  }
};

startServer();