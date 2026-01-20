// db.js
const { Pool } = require('pg');
require('dotenv').config();

// Check karein ke hum Production (Render) par hain ya Local par
const isProduction = process.env.NODE_ENV === 'production';

// Connection String (Render par ye Environment Variable se milega)
const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  // Agar Production hai to Connection String use karo, warna undefined
  connectionString: isProduction ? connectionString : undefined,
  
  // Neon.tech k liye SSL zaroori hai (Production only)
  ssl: isProduction ? { rejectUnauthorized: false } : false,

  // Ye settings sirf Local (Development) k liye hain
  user: isProduction ? undefined : process.env.DB_USER,
  password: isProduction ? undefined : process.env.DB_PASSWORD,
  host: isProduction ? undefined : process.env.DB_HOST,
  port: isProduction ? undefined : process.env.DB_PORT,
  database: isProduction ? undefined : process.env.DB_NAME,
});

// Connection check karne ke liye
pool.connect((err) => {
  if (err) {
    console.error('Database connection error:', err.stack);
  } else {
    console.log(isProduction ? '✅ Connected to Neon Database!' : '✅ Connected to Local Database!');
  }
});

module.exports = pool;