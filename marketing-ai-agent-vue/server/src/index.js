import express from 'express';
import cors from 'cors';
import { config } from './src/config/index.js';
import { createConnection, closeConnection } from './src/config/database.js';
import tasksRouter from './src/routes/tasks.js';
import dashboardRouter from './src/routes/dashboard.js';
import analyticsRouter from './src/routes/analytics.js';

const app = express();

// 中间件
app.use(cors(config.cors));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 路由
app.use('/api/marketing-tasks', tasksRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/analytics', analyticsRouter);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 根路由
app.get('/', (req, res) => {
  res.json({
    name: 'Marketing AI Agent API',
    version: '1.0.0',
    endpoints: {
      tasks: '/api/marketing-tasks',
      dashboard: '/api/dashboard',
      analytics: '/api/analytics'
    }
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// 启动服务器
async function start() {
  try {
    await createConnection();
    app.listen(config.port, () => {
      console.log(`\n🚀 Marketing AI Agent API Server`);
      console.log(`📍 Server running at http://localhost:${config.port}`);
      console.log(`📊 Database: ${config.database.type.toUpperCase()} (${config.database.database})`);
      console.log(`\nAvailable endpoints:`);
      console.log(`  GET  /health`);
      console.log(`  GET  /api/dashboard/metrics`);
      console.log(`  GET  /api/dashboard/trend`);
      console.log(`  GET  /api/dashboard/recent-tasks`);
      console.log(`  GET  /api/marketing-tasks`);
      console.log(`  POST /api/marketing-tasks`);
      console.log(`  GET  /api/marketing-tasks/:id`);
      console.log(`  PATCH /api/marketing-tasks/:id`);
      console.log(`  GET  /api/marketing-tasks/:id/stages`);
      console.log(`  GET  /api/marketing-tasks/:id/creatives`);
      console.log(`  POST /api/marketing-tasks/:id/creatives`);
      console.log(`  POST /api/marketing-tasks/:id/advance-stage`);
      console.log(`  GET  /api/analytics/:taskId/metrics`);
      console.log(`  GET  /api/analytics/:taskId/channel-comparison`);
      console.log(`  GET  /api/analytics/:taskId/recommendations`);
      console.log(`\n✓ Server started successfully\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGTERM', async () => {
  console.log('\nSIGTERM signal received: closing HTTP server');
  await closeConnection();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT signal received: closing HTTP server');
  await closeConnection();
  process.exit(0);
});

start();
