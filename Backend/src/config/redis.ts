import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.error(' Lỗi kết nối Redis:', err));
redisClient.on('connect', () => console.log(' Đã kết nối thành công với Redis!'));

export const connectRedis = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
};

export { redisClient };
export default redisClient;