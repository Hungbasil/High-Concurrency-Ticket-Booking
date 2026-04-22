import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: parseInt(process.env.PG_PORT || '5432'),
  max: 20, 
  idleTimeoutMillis: 30000
});

pool.on('error', (err) => {
  console.error(' Lỗi kết nối PostgreSQL đột xuất:', err);
  process.exit(-1);
});

export default pool;