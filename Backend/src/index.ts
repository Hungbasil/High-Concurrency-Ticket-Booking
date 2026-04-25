import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import pool from './config/db.js';
import { connectRedis } from './config/redis.js';
import reservationRoutes from './routes/reservation.js';
import eventsRoutes from './routes/events.js';
import usersRoutes from './routes/users.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
export const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/api/reservations', reservationRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/users', usersRoutes);

// Lắng nghe kết nối Socket.IO
io.on('connection', (socket: any) => {
  console.log(`🔌 Client kết nối: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`🔌 Client ngắt kết nối: ${socket.id}`);
  });
});

app.get('/', (req, res) => {
  res.send('Hệ thống Đặt Vé High-Concurrency đang hoạt động!');
});

// Hàm khởi động an toàn
const startServer = async () => {
  try {
    await connectRedis();
    const client = await pool.connect();
    console.log('🟢 Đã kết nối thành công với PostgreSQL!');
    client.release();
    
    httpServer.listen(port, () => {
      console.log(`🚀 Server đang lắng nghe tại http://localhost:${port}`);
      console.log(`🔌 Socket.IO đang chạy trên ws://localhost:${port}`);
    });
  } catch (error) {
    console.error('🔴 Lỗi khởi động hệ thống:', error);
    process.exit(1);
  }
};

startServer();