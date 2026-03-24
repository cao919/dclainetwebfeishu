import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database.js';

const router = express.Router();

// 获取所有任务
router.get('/', async (req, res) => {
  try {
    const { status, page = 1, pageSize = 10 } = req.query;
    const offset = (page - 1) * pageSize;

    let sql = 'SELECT * FROM marketing_task';
    const params = [];

    if (status) {
      sql += ' WHERE status = ?';
      params.push(status);
    }

    sql += ' ORDER BY _created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize), offset);

    const tasks = await query(sql, params);

    // 获取总数
    let countSql = 'SELECT COUNT(*) as total FROM marketing_task';
    const countParams = [];

    if (status) {
      countSql += ' WHERE status = ?';
      countParams.push(status);
    }

    const [{ total }] = await query(countSql, countParams);

    res.json({
      tasks,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建任务
router.post('/', async (req, res) => {
  try {
    const { name, goal, budget, start_date, end_date } = req.body;
    const id = uuidv4();

    const sql = `
      INSERT INTO marketing_task (id, name, goal, budget, start_date, end_date, status, current_stage, progress)
      VALUES (?, ?, ?, ?, ?, ?, 'draft', 'data_collection', 0)
    `;

    await query(sql, [id, name, goal, budget, start_date, end_date]);

    const tasks = await query('SELECT * FROM marketing_task WHERE id = ?', [id]);

    // 创建8个阶段的初始记录
    const stages = [
      'data_collection',
      'market_analysis',
      'strategy',
      'planning',
      'creative',
      'execution',
      'analysis',
      'optimization'
    ];

    for (const stage of stages) {
      const stageId = uuidv4();
      await query(`
        INSERT INTO task_stage_output (id, task_id, stage, status)
        VALUES (?, ?, ?, 'pending')
      `, [stageId, id, stage]);
    }

    res.status(201).json(tasks[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取单个任务
router.get('/:id', async (req, res) => {
  try {
    const tasks = await query('SELECT * FROM marketing_task WHERE id = ?', [req.params.id]);

    if (!tasks.length) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(tasks[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新任务
router.patch('/:id', async (req, res) => {
  try {
    const { status, current_stage, progress, name, goal, budget, start_date, end_date } = req.body;

    const updates = [];
    const params = [];

    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }
    if (current_stage !== undefined) {
      updates.push('current_stage = ?');
      params.push(current_stage);
    }
    if (progress !== undefined) {
      updates.push('progress = ?');
      params.push(progress);
    }
    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (goal !== undefined) {
      updates.push('goal = ?');
      params.push(goal);
    }
    if (budget !== undefined) {
      updates.push('budget = ?');
      params.push(budget);
    }
    if (start_date !== undefined) {
      updates.push('start_date = ?');
      params.push(start_date);
    }
    if (end_date !== undefined) {
      updates.push('end_date = ?');
      params.push(end_date);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(req.params.id);

    const sql = `UPDATE marketing_task SET ${updates.join(', ')} WHERE id = ?`;
    await query(sql, params);

    const tasks = await query('SELECT * FROM marketing_task WHERE id = ?', [req.params.id]);
    res.json(tasks[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取任务的阶段输出
router.get('/:id/stages', async (req, res) => {
  try {
    const stages = await query(
      'SELECT * FROM task_stage_output WHERE task_id = ? ORDER BY stage',
      [req.params.id]
    );

    res.json(stages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取任务的创意列表
router.get('/:id/creatives', async (req, res) => {
  try {
    const creatives = await query(
      'SELECT * FROM ad_creative WHERE task_id = ? ORDER BY _created_at DESC',
      [req.params.id]
    );

    res.json(creatives);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建创意
router.post('/:id/creatives', async (req, res) => {
  try {
    const { channel, type, content } = req.body;
    const id = uuidv4();

    const sql = `
      INSERT INTO ad_creative (id, task_id, channel, type, content, status)
      VALUES (?, ?, ?, ?, ?, 'active')
    `;

    await query(sql, [id, req.params.id, channel, type, content]);

    const creatives = await query('SELECT * FROM ad_creative WHERE id = ?', [id]);

    res.status(201).json(creatives[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 推进阶段
router.post('/:id/advance-stage', async (req, res) => {
  try {
    const stages = [
      'data_collection',
      'market_analysis',
      'strategy',
      'planning',
      'creative',
      'execution',
      'analysis',
      'optimization'
    ];

    const tasks = await query('SELECT * FROM marketing_task WHERE id = ?', [req.params.id]);
    if (!tasks.length) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = tasks[0];
    const currentIndex = stages.indexOf(task.current_stage);

    if (currentIndex === -1) {
      return res.status(400).json({ error: 'Invalid current stage' });
    }

    if (currentIndex >= stages.length - 1) {
      return res.status(400).json({ error: 'Already at final stage' });
    }

    const nextStage = stages[currentIndex + 1];
    const nextProgress = Math.round(((currentIndex + 2) / stages.length) * 100);

    // 更新任务阶段
    await query(
      `UPDATE marketing_task SET current_stage = ?, progress = ? WHERE id = ?`,
      [nextStage, nextProgress, req.params.id]
    );

    // 更新当前阶段为完成，下一阶段为运行中
    await query(
      `UPDATE task_stage_output SET status = 'completed' WHERE task_id = ? AND stage = ?`,
      [req.params.id, task.current_stage]
    );

    await query(
      `UPDATE task_stage_output SET status = 'running' WHERE task_id = ? AND stage = ?`,
      [req.params.id, nextStage]
    );

    const updatedTasks = await query('SELECT * FROM marketing_task WHERE id = ?', [req.params.id]);
    const stageOutputs = await query('SELECT * FROM task_stage_output WHERE task_id = ?', [req.params.id]);

    res.json({
      task: updatedTasks[0],
      stages: stageOutputs
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
