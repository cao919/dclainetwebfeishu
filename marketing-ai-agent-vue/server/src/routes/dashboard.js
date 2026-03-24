import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

// 获取核心指标
router.get('/metrics', async (req, res) => {
  try {
    // 总任务数
    const [{ total_tasks }] = await query('SELECT COUNT(*) as total_tasks FROM marketing_task');

    // 进行中的任务数
    const [{ in_progress }] = await query(
      "SELECT COUNT(*) as in_progress FROM marketing_task WHERE status = 'in_progress'"
    );

    // 已完成的任务数
    const [{ completed }] = await query(
      "SELECT COUNT(*) as completed FROM marketing_task WHERE status = 'completed'"
    );

    // 总预算
    const [{ total_budget }] = await query(
      'SELECT COALESCE(SUM(budget), 0) as total_budget FROM marketing_task'
    );

    // 最近30天的转化数
    const [{ total_conversions }] = await query(`
      SELECT COALESCE(SUM(conversions), 0) as total_conversions
      FROM marketing_performance
      WHERE date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    `);

    // ROI (投入产出比)
    const [{ total_cost, total_revenue }] = await query(`
      SELECT
        COALESCE(SUM(cost), 0) as total_cost,
        COALESCE(SUM(revenue), 0) as total_revenue
      FROM marketing_performance
      WHERE date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    `);

    const roi = total_cost > 0 ? ((total_revenue - total_cost) / total_cost) * 100 : 0;

    res.json({
      total_tasks,
      in_progress,
      completed,
      total_budget: parseFloat(total_budget),
      total_conversions,
      total_cost: parseFloat(total_cost),
      total_revenue: parseFloat(total_revenue),
      roi: parseFloat(roi.toFixed(2))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取趋势数据
router.get('/trend', async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const trend = await query(`
      SELECT
        date,
        SUM(impressions) as impressions,
        SUM(clicks) as clicks,
        SUM(conversions) as conversions,
        SUM(cost) as cost,
        SUM(revenue) as revenue
      FROM marketing_performance
      WHERE date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY date
      ORDER BY date ASC
    `, [parseInt(days)]);

    res.json(trend.map(row => ({
      ...row,
      impressions: parseInt(row.impressions),
      clicks: parseInt(row.clicks),
      conversions: parseInt(row.conversions),
      cost: parseFloat(row.cost),
      revenue: parseFloat(row.revenue)
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取最近任务
router.get('/recent-tasks', async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const tasks = await query(`
      SELECT * FROM marketing_task
      ORDER BY _created_at DESC
      LIMIT ?
    `, [parseInt(limit)]);

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
