import mysql from 'mysql2/promise';
import pg from 'pg';
import { config } from './index.js';

let pool = null;
let memoryDB = null;

// 内存数据库实现
class MemoryDB {
  constructor() {
    this.tasks = [];
    this.stages = [];
    this.creatives = [];
    this.analytics = [];
    this.id = 1;
  }

  async query(sql, params = []) {
    // 简单的SQL解析，仅支持基本的CRUD操作
    const sqlLower = sql.toLowerCase().trim();

    // SELECT
    if (sqlLower.startsWith('select')) {
      // 处理 COUNT(*) 查询
      if (sqlLower.includes('count(*)')) {
        const tableMatch = sqlLower.match(/from\s+(\w+)/);
        if (!tableMatch) return [{ total: 0 }];
        const table = tableMatch[1];
        let data = this[table] || [];

        // 处理WHERE条件
        if (sqlLower.includes('where')) {
          const whereMatch = sqlLower.match(/where\s+(.+?)(?:order|limit|$)/);
          if (whereMatch) {
            const conditions = whereMatch[1].trim();
            const statusMatch = conditions.match(/status\s*=\s*\?/);
            if (statusMatch) {
              data = data.filter(item => item.status === params[0]);
            }
          }
        }

        return [{ total: data.length }];
      }

      const tableMatch = sqlLower.match(/from\s+(\w+)/);
      if (!tableMatch) return [];
      const table = tableMatch[1];
      let data = [...(this[table] || [])];

      // 处理WHERE条件
      if (sqlLower.includes('where')) {
        const whereMatch = sqlLower.match(/where\s+(.+?)(?:order|limit|$)/);
        if (whereMatch) {
          const conditions = whereMatch[1].trim();
          // 简单处理 id = ?
          const idMatch = conditions.match(/id\s*=\s*\?/);
          if (idMatch) {
            return data.filter(item => item.id === params[0]);
          }
          // 处理 task_id = ?
          const taskIdMatch = conditions.match(/task_id\s*=\s*\?/);
          if (taskIdMatch) {
            return data.filter(item => item.task_id === params[0]);
          }
          // 处理 status = ?
          const statusMatch = conditions.match(/status\s*=\s*\?/);
          if (statusMatch) {
            data = data.filter(item => item.status === params[0]);
          }
        }
      }

      // 处理ORDER BY
      if (sqlLower.includes('order by')) {
        const orderMatch = sqlLower.match(/order by\s+(\w+)\s*(desc|asc)?/);
        if (orderMatch) {
          const field = orderMatch[1];
          const desc = orderMatch[2] === 'desc';
          data.sort((a, b) => {
            if (desc) return b[field] > a[field] ? 1 : -1;
            return a[field] > b[field] ? 1 : -1;
          });
        }
      }

      // 处理LIMIT和OFFSET (支持 LIMIT ? OFFSET ? 格式)
      if (sqlLower.includes('limit')) {
        const limitOffsetMatch = sqlLower.match(/limit\s+\?\s+offset\s+\?/);
        if (limitOffsetMatch) {
          // 从params中获取limit和offset的值
          const limitIndex = params.length - 2;
          const offsetIndex = params.length - 1;
          const limit = parseInt(params[limitIndex]);
          const offset = parseInt(params[offsetIndex]);
          // 移除最后两个参数（limit和offset）
          const queryParams = params.slice(0, -2);
          return data.slice(offset, offset + limit);
        }
        
        const limitMatch = sqlLower.match(/limit\s+(\d+)/);
        const offsetMatch = sqlLower.match(/offset\s+(\d+)/);
        if (limitMatch) {
          const limit = parseInt(limitMatch[1]);
          const offset = offsetMatch ? parseInt(offsetMatch[1]) : 0;
          return data.slice(offset, offset + limit);
        }
      }

      return data;
    }

    // INSERT
    if (sqlLower.startsWith('insert')) {
      const tableMatch = sqlLower.match(/into\s+(\w+)/);
      if (!tableMatch) return [{ id: this.id++ }];
      const table = tableMatch[1];

      const keysMatch = sqlLower.match(/\(([^)]+)\)/);
      if (!keysMatch) return [{ id: this.id++ }];

      const keys = keysMatch[1].split(',').map(k => k.trim());
      const item = { id: String(this.id++) };

      keys.forEach((key, index) => {
        item[key] = params[index];
      });

      item._created_at = new Date().toISOString();
      item._updated_at = new Date().toISOString();

      if (!this[table]) this[table] = [];
      this[table].push(item);
      return [item];
    }

    // UPDATE
    if (sqlLower.startsWith('update')) {
      const tableMatch = sqlLower.match(/update\s+(\w+)/);
      if (!tableMatch) return [];
      const table = tableMatch[1];

      const idMatch = sqlLower.match(/where\s+id\s*=\s*\?/);
      if (idMatch) {
        const id = params[params.length - 1];
        const data = this[table] || [];
        const item = data.find(i => i.id === id);
        if (item) {
          item._updated_at = new Date().toISOString();
          return [item];
        }
      }
      return [];
    }

    // DELETE
    if (sqlLower.startsWith('delete')) {
      const tableMatch = sqlLower.match(/from\s+(\w+)/);
      if (!tableMatch) return [];
      const table = tableMatch[1];

      const idMatch = sqlLower.match(/where\s+id\s*=\s*\?/);
      if (idMatch) {
        const id = params[0];
        const data = this[table] || [];
        const index = data.findIndex(i => i.id === id);
        if (index > -1) {
          data.splice(index, 1);
          return [{ affected: 1 }];
        }
      }
      return [{ affected: 0 }];
    }

    return [];
  }
}

export async function createConnection() {
  const dbConfig = config.database;

  // 内存数据库模式
  if (dbConfig.type === 'memory') {
    memoryDB = new MemoryDB();
    console.log('✓ Memory database initialized');
    return memoryDB;
  }

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
  return pool || memoryDB;
}

export async function query(sql, params = []) {
  const dbConfig = config.database;

  // 内存数据库模式
  if (dbConfig.type === 'memory' && memoryDB) {
    return memoryDB.query(sql, params);
  }

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
