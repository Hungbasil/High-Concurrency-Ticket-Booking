import pool from '../config/db.js';

/**
 * Create database indexes for performance optimization
 * Run this script once to speed up seat lookups
 */
const optimizeDatabase = async () => {
  const client = await pool.connect();
  try {
    console.log('⏳ Creating database indexes for performance optimization...');

    // Index for seat lookups by event_id and seat_code
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_seats_event_code 
      ON seats(event_id, seat_code)
    `);
    console.log('✅ Created index: idx_seats_event_code');

    // Index for seat status queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_seats_event_status 
      ON seats(event_id, status)
    `);
    console.log('✅ Created index: idx_seats_event_status');

    // Index for reservation lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_reservations_user_status 
      ON reservations(user_id, status)
    `);
    console.log('✅ Created index: idx_reservations_user_status');

    // Index for reservation expiry checks
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_reservations_expires_at 
      ON reservations(expires_at)
    `);
    console.log('✅ Created index: idx_reservations_expires_at');

    console.log('🎉 Database optimization complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error optimizing database:', error);
    process.exit(1);
  } finally {
    client.release();
  }
};

optimizeDatabase();
