import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

// 获取任务的核心指标
router.get('/:taskId/metrics', async (req, res) => {
  try {
    const { taskId } = req.params;

    // 总展示量、点击量、转化数
    const [{ total_impressions, total_clicks, total_conversions }] = await query(`
      SELECT
        COALESCE(SUM(impressions), 0) as total_impressions,
        COALESCE(SUM(clicks), 0) as total_clicks,
        COALESCE(SUM(conversions), 0) as total_conversions
      FROM marketing_performance
      WHERE task_id = ?
    `, [taskId]);

    // 总花费和总收入
    const [{ total_cost, total_revenue }] = await query(`
      SELECT
        COALESCE(SUM(cost), 0) as total_cost,
        COALESCE(SUM(revenue), 0) as total_revenue
      FROM marketing_performance
      WHERE task_id = ?
    `, [taskId]);

    // CTR (点击率)
    const ctr = total_impressions > 0 ? (total_clicks / total_impressions) * 100 : 0;

    // 转化率
    const conversion_rate = total_clicks > 0 ? (total_conversions / total_clicks) * 100 : 0;

    // CPC (每次点击成本)
    const cpc = total_clicks > 0 ? total_cost / total_clicks : 0;

    // CPA (每次转化成本)
    const cpa = total_conversions > 0 ? total_cost / total_conversions : 0;

    // ROI (投入产出比)
    const roi = total_cost > 0 ? ((total_revenue - total_cost) / total_cost) * 100 : 0;

    // 任务信息
    const tasks = await query('SELECT * FROM marketing_task WHERE id = ?', [taskId]);

    res.json({
      task: tasks[0] || null,
      metrics: {
        total_impressions: parseInt(total_impressions),
        total_clicks: parseInt(total_clicks),
        total_conversions: parseInt(total_conversions),
        total_cost: parseFloat(total_cost),
        total_revenue: parseFloat(total_revenue),
        ctr: parseFloat(ctr.toFixed(2)),
        conversion_rate: parseFloat(conversion_rate.toFixed(2)),
        cpc: parseFloat(cpc.toFixed(2)),
        cpa: parseFloat(cpa.toFixed(2)),
        roi: parseFloat(roi.toFixed(2))
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取渠道对比
router.get('/:taskId/channel-comparison', async (req, res) => {
  try {
    const { taskId } = req.params;

    const comparison = await query(`
      SELECT
        channel,
        SUM(impressions) as impressions,
        SUM(clicks) as clicks,
        SUM(conversions) as conversions,
        SUM(cost) as cost,
        SUM(revenue) as revenue
      FROM marketing_performance
      WHERE task_id = ?
      GROUP BY channel
      ORDER BY revenue DESC
    `, [taskId]);

    res.json(comparison.map(row => ({
      ...row,
      impressions: parseInt(row.impressions),
      clicks: parseInt(row.clicks),
      conversions: parseInt(row.conversions),
      cost: parseFloat(row.cost),
      revenue: parseFloat(row.revenue),
      ctr: row.impressions > 0 ? ((row.clicks / row.impressions) * 100).toFixed(2) : 0,
      conversion_rate: row.clicks > 0 ? ((row.conversions / row.clicks) * 100).toFixed(2) : 0,
      roi: row.cost > 0 ? (((row.revenue - row.cost) / row.cost) * 100).toFixed(2) : 0
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取优化建议
router.get('/:taskId/recommendations', async (req, res) => {
  try {
    const { taskId } = req.params;

    const tasks = await query('SELECT * FROM marketing_task WHERE id = ?', [taskId]);
    if (!tasks.length) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = tasks[0];
    const recommendations = [];

    // 获取渠道对比数据
    const comparison = await query(`
      SELECT
        channel,
        SUM(impressions) as impressions,
        SUM(clicks) as clicks,
        SUM(conversions) as conversions,
        SUM(cost) as cost,
        SUM(revenue) as revenue
      FROM marketing_performance
      WHERE task_id = ?
      GROUP BY channel
    `, [taskId]);

    if (comparison.length > 0) {
      // 找出ROI最高的渠道
      const bestChannel = comparison.reduce((best, curr) => {
        const currROI = curr.cost > 0 ? (curr.revenue - curr.cost) / curr.cost : 0;
        const bestROI = best.cost > 0 ? (best.revenue - best.cost) / best.cost : 0;
        return currROI > bestROI ? curr : best;
      });

      recommendations.push({
        type: 'channel',
        priority: 'high',
        title: '增加ROI最高渠道的预算',
        description: `${bestChannel.channel}渠道的ROI表现最好，建议增加该渠道的预算投入`,
        data: {
          channel: bestChannel.channel,
          roi: bestChannel.cost > 0 ? ((bestChannel.revenue - bestChannel.cost) / bestChannel.cost * 100).toFixed(2) + '%' : '0%'
        }
      });

      // 找出转化率最低的渠道
      const worstConversion = comparison.reduce((worst, curr) => {
        const currRate = curr.clicks > 0 ? curr.conversions / curr.clicks : 0;
        const worstRate = worst.clicks > 0 ? worst.conversions / worst.clicks : 0;
        return currRate < worstRate ? curr : worst;
      });

      recommendations.push({
        type: 'channel',
        priority: 'medium',
        title: '优化低转化率渠道',
        description: `${worstConversion.channel}渠道的转化率较低，建议优化创意或调整定向策略`,
        data: {
          channel: worstConversion.channel,
          conversion_rate: worstConversion.clicks > 0 ? (worstConversion.conversions / worstConversion.clicks * 100).toFixed(2) + '%' : '0%'
        }
      });
    }

    // 根据任务阶段提供建议
    const stageMessages = {
      data_collection: '建议扩大数据收集范围，确保市场数据的全面性和准确性',
      market_analysis: '建议深入分析竞品策略，识别市场机会和潜在风险',
      strategy: '建议制定多元化营销策略，降低单一渠道依赖风险',
      planning: '建议制定详细的执行计划，明确时间节点和责任人',
      creative: '建议测试多种创意形式，通过A/B测试找出最优方案',
      execution: '建议持续监控投放效果，及时调整出价和定向策略',
      analysis: '建议深入分析用户行为数据，优化后续营销策略',
      optimization: '建议总结经验教训，应用到下一个营销活动中'
    };

    recommendations.push({
      type: 'stage',
      priority: 'low',
      title: '推进到下一阶段',
      description: stageMessages[task.current_stage] || '继续推进营销活动'
    });

    // 预算使用建议
    const [{ total_cost }] = await query(`
      SELECT COALESCE(SUM(cost), 0) as total_cost
      FROM marketing_performance
      WHERE task_id = ?
    `, [taskId]);

    if (task.budget > 0) {
      const budgetUsage = (total_cost / task.budget) * 100;

      if (budgetUsage > 80) {
        recommendations.push({
          type: 'budget',
          priority: 'high',
          title: '预算即将耗尽',
          description: `已使用${budgetUsage.toFixed(2)}%的预算，建议及时补充或调整投放策略`,
          data: {
            budget_used: budgetUsage.toFixed(2) + '%',
            remaining: (task.budget - total_cost).toFixed(2)
          }
        });
      } else if (budgetUsage < 50) {
        recommendations.push({
          type: 'budget',
          priority: 'low',
          title: '预算使用率较低',
          description: `仅使用了${budgetUsage.toFixed(2)}%的预算，建议增加投放力度`,
          data: {
            budget_used: budgetUsage.toFixed(2) + '%',
            remaining: (task.budget - total_cost).toFixed(2)
          }
        });
      }
    }

    res.json({
      recommendations: recommendations.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      })
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
