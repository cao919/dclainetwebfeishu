import mysql from 'mysql2/promise';
import pg from 'pg';
import { config } from './index.js';

let pool = null;

export async function createConnection() {
  const dbConfig = config.database;

  if (dbConfig.type === 'postgres') {
    // PostgreSQL连接
    pool = new pg.Pool({
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      user: dbConfig.user,
      password: dbConfig.password,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    try {
      const client = await pool.connect();
      client.release();
      console.log(`✓ PostgreSQL connected to ${dbConfig.database}`);
      return pool;
    } catch (error) {
      console.error('✗ PostgreSQL connection failed:', error.message);
      throw error;
    }
  } else {
    // MySQL连接
    pool = mysql.createPool({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    try {
      const connection = await pool.getConnection();
      connection.release();
      console.log(`✓ MySQL connected to ${dbConfig.database}`);
      return pool;
    } catch (error) {
      console.error('✗ MySQL connection failed:', error.message);
      throw error;
    }
  }
}

export function getPool() {
  return pool;
}

export async function query(sql, params = []) {
  const dbConfig = config.database;

  if (dbConfig.type === 'postgres') {
    // PostgreSQL使用参数化查询（$1, $2...）
    // 需要将MySQL风格的?转换为PostgreSQL风格
    let paramIndex = 0;
    const pgSql = sql.replace(/\?/g, () => `$${++paramIndex}`);
    const result = await pool.query(pgSql, params);
    return result.rows;
  } else {
    // MySQL
    const [rows] = await pool.query(sql, params);
    return rows;
  }
}

export async function closeConnection() {
  if (pool) {
    if (config.database.type === 'postgres') {
      await pool.end();
    } else {
      await pool.end();
    }
    console.log('Database connection closed');
  }
}
