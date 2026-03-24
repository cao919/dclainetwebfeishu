import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
  },
  database: {
    type: process.env.DB_TYPE || 'mysql', // 'mysql' or 'postgres'
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || (process.env.DB_TYPE === 'postgres' ? 5432 : 3306),
    database: process.env.DB_NAME || 'marketing_ai_agent',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
  }
};
