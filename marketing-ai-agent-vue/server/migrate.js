import { createConnection, query, closeConnection } from './src/config/database.js';
import dotenv from 'dotenv';

dotenv.config();

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

const statuses = ['draft', 'in_progress', 'completed', 'paused'];
const stageStatuses = ['pending', 'running', 'completed', 'failed'];
const adStatuses = ['active', 'paused'];
const adTypes = ['text', 'image'];
const channels = ['Google', 'Instagram', 'TikTok', 'LinkedIn', 'Email'];

async function migrate() {
  try {
    console.log('Starting database migration...');
    await createConnection();

    const dbType = process.env.DB_TYPE || 'mysql';

    if (dbType === 'postgres') {
      // PostgreSQL迁移
      await migratePostgreSQL();
    } else {
      // MySQL迁移
      await migrateMySQL();
    }

    console.log('✓ Migration completed successfully');
  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  } finally {
    await closeConnection();
  }
}

async function migrateMySQL() {
  console.log('Creating MySQL tables...');

  // 1. marketing_task表
  await query(`
    CREATE TABLE IF NOT EXISTS marketing_task (
      id CHAR(36) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      goal TEXT,
      status ENUM('draft', 'in_progress', 'completed', 'paused') DEFAULT 'draft',
      current_stage ENUM(?, ?, ?, ?, ?, ?, ?, ?) DEFAULT 'data_collection',
      progress INT DEFAULT 0,
      budget DECIMAL(15, 2) DEFAULT 0,
      start_date DATE,
      end_date DATE,
      _created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      _created_by VARCHAR(100),
      _updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      _updated_by VARCHAR(100),
      INDEX idx_marketing_task_current_stage (current_stage),
      INDEX idx_marketing_task_status (status)
    )
  `, stages);

  console.log('✓ Table marketing_task created');

  // 2. task_stage_output表
  await query(`
    CREATE TABLE IF NOT EXISTS task_stage_output (
      id CHAR(36) PRIMARY KEY,
      task_id CHAR(36) NOT NULL,
      stage VARCHAR(50) NOT NULL,
      content TEXT,
      status ENUM('pending', 'running', 'completed', 'failed') DEFAULT 'pending',
      _created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      _created_by VARCHAR(100),
      _updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      _updated_by VARCHAR(100),
      INDEX idx_task_stage_output_task_id (task_id),
      INDEX idx_task_stage_output_stage (stage),
      FOREIGN KEY (task_id) REFERENCES marketing_task(id) ON DELETE CASCADE
    )
  `);

  console.log('✓ Table task_stage_output created');

  // 3. ad_creative表
  await query(`
    CREATE TABLE IF NOT EXISTS ad_creative (
      id CHAR(36) PRIMARY KEY,
      task_id CHAR(36) NOT NULL,
      channel VARCHAR(100) NOT NULL,
      type ENUM('text', 'image') NOT NULL,
      content TEXT,
      status ENUM('active', 'paused') DEFAULT 'active',
      performance_score DECIMAL(5, 2) DEFAULT 0,
      _created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      _created_by VARCHAR(100),
      _updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      _updated_by VARCHAR(100),
      INDEX idx_ad_creative_task_id (task_id),
      INDEX idx_ad_creative_channel (channel),
      INDEX idx_ad_creative_type (type),
      FOREIGN KEY (task_id) REFERENCES marketing_task(id) ON DELETE CASCADE
    )
  `);

  console.log('✓ Table ad_creative created');

  // 4. marketing_performance表
  await query(`
    CREATE TABLE IF NOT EXISTS marketing_performance (
      id CHAR(36) PRIMARY KEY,
      task_id CHAR(36) NOT NULL,
      ad_creative_id CHAR(36) NULL,
      date DATE NOT NULL,
      channel VARCHAR(100) NOT NULL,
      impressions INT DEFAULT 0,
      clicks INT DEFAULT 0,
      conversions INT DEFAULT 0,
      cost DECIMAL(15, 2) DEFAULT 0,
      revenue DECIMAL(15, 2) DEFAULT 0,
      _created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      _created_by VARCHAR(100),
      _updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      _updated_by VARCHAR(100),
      INDEX idx_marketing_performance_task_id (task_id),
      INDEX idx_marketing_performance_ad_creative_id (ad_creative_id),
      INDEX idx_marketing_performance_date (date),
      INDEX idx_marketing_performance_channel (channel),
      FOREIGN KEY (task_id) REFERENCES marketing_task(id) ON DELETE CASCADE,
      FOREIGN KEY (ad_creative_id) REFERENCES ad_creative(id) ON DELETE SET NULL
    )
  `);

  console.log('✓ Table marketing_performance created');
}

async function migratePostgreSQL() {
  console.log('Creating PostgreSQL tables...');

  // 创建枚举类型
  try {
    await query(`CREATE TYPE task_status AS ENUM ('draft', 'in_progress', 'completed', 'paused')`);
    console.log('✓ Type task_status created');
  } catch (e) {
    console.log('  Type task_status already exists');
  }

  try {
    await query(`CREATE TYPE stage_name AS ENUM ('data_collection', 'market_analysis', 'strategy', 'planning', 'creative', 'execution', 'analysis', 'optimization')`);
    console.log('✓ Type stage_name created');
  } catch (e) {
    console.log('  Type stage_name already exists');
  }

  try {
    await query(`CREATE TYPE stage_status AS ENUM ('pending', 'running', 'completed', 'failed')`);
    console.log('✓ Type stage_status created');
  } catch (e) {
    console.log('  Type stage_status already exists');
  }

  try {
    await query(`CREATE TYPE ad_status AS ENUM ('active', 'paused')`);
    console.log('✓ Type ad_status created');
  } catch (e) {
    console.log('  Type ad_status already exists');
  }

  try {
    await query(`CREATE TYPE ad_type AS ENUM ('text', 'image')`);
    console.log('✓ Type ad_type created');
  } catch (e) {
    console.log('  Type ad_type already exists');
  }

  // 1. marketing_task表
  await query(`
    CREATE TABLE IF NOT EXISTS marketing_task (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      goal TEXT,
      status task_status DEFAULT 'draft',
      current_stage stage_name DEFAULT 'data_collection',
      progress INT DEFAULT 0,
      budget DECIMAL(15, 2) DEFAULT 0,
      start_date DATE,
      end_date DATE,
      _created_at TIMESTAMPTZ DEFAULT NOW(),
      _created_by VARCHAR(100),
      _updated_at TIMESTAMPTZ DEFAULT NOW(),
      _updated_by VARCHAR(100)
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_marketing_task_current_stage ON marketing_task(current_stage)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_marketing_task_status ON marketing_task(status)`);
  console.log('✓ Table marketing_task created');

  // 2. task_stage_output表
  await query(`
    CREATE TABLE IF NOT EXISTS task_stage_output (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      task_id UUID NOT NULL REFERENCES marketing_task(id) ON DELETE CASCADE,
      stage VARCHAR(50) NOT NULL,
      content TEXT,
      status stage_status DEFAULT 'pending',
      _created_at TIMESTAMPTZ DEFAULT NOW(),
      _created_by VARCHAR(100),
      _updated_at TIMESTAMPTZ DEFAULT NOW(),
      _updated_by VARCHAR(100)
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_task_stage_output_task_id ON task_stage_output(task_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_task_stage_output_stage ON task_stage_output(stage)`);
  console.log('✓ Table task_stage_output created');

  // 3. ad_creative表
  await query(`
    CREATE TABLE IF NOT EXISTS ad_creative (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      task_id UUID NOT NULL REFERENCES marketing_task(id) ON DELETE CASCADE,
      channel VARCHAR(100) NOT NULL,
      type ad_type NOT NULL,
      content TEXT,
      status ad_status DEFAULT 'active',
      performance_score DECIMAL(5, 2) DEFAULT 0,
      _created_at TIMESTAMPTZ DEFAULT NOW(),
      _created_by VARCHAR(100),
      _updated_at TIMESTAMPTZ DEFAULT NOW(),
      _updated_by VARCHAR(100)
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_ad_creative_task_id ON ad_creative(task_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_ad_creative_channel ON ad_creative(channel)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_ad_creative_type ON ad_creative(type)`);
  console.log('✓ Table ad_creative created');

  // 4. marketing_performance表
  await query(`
    CREATE TABLE IF NOT EXISTS marketing_performance (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      task_id UUID NOT NULL REFERENCES marketing_task(id) ON DELETE CASCADE,
      ad_creative_id UUID REFERENCES ad_creative(id) ON DELETE SET NULL,
      date DATE NOT NULL,
      channel VARCHAR(100) NOT NULL,
      impressions INT DEFAULT 0,
      clicks INT DEFAULT 0,
      conversions INT DEFAULT 0,
      cost DECIMAL(15, 2) DEFAULT 0,
      revenue DECIMAL(15, 2) DEFAULT 0,
      _created_at TIMESTAMPTZ DEFAULT NOW(),
      _created_by VARCHAR(100),
      _updated_at TIMESTAMPTZ DEFAULT NOW(),
      _updated_by VARCHAR(100)
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_marketing_performance_task_id ON marketing_performance(task_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_marketing_performance_ad_creative_id ON marketing_performance(ad_creative_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_marketing_performance_date ON marketing_performance(date)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_marketing_performance_channel ON marketing_performance(channel)`);
  console.log('✓ Table marketing_performance created');
}

migrate();
