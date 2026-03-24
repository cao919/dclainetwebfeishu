# 营销AI智能体系统 - Vue3重构版

## 项目简介

这是一个基于Vue3 + Node.js + Express重构的营销AI智能体系统，实现了原系统的所有核心功能，包括：

- 📊 营销仪表盘 - 展示核心指标、效果趋势和最近任务
- 📋 营销任务管理 - 任务列表、创建、编辑、状态管理
- 🔄 AI智能体流程 - 8个阶段的全流程自动化（数据采集→优化迭代）
- 🎨 广告创意管理 - 多渠道创意管理和效果评分
- 📈 效果分析 - 数据分析、渠道对比、智能优化建议
- 🗄️ 可配置数据库 - 支持MySQL和PostgreSQL

## 技术栈

### 前端
- **框架**: Vue 3 + TypeScript
- **构建工具**: Vite
- **UI组件库**: Element Plus
- **状态管理**: Pinia
- **路由**: Vue Router 4
- **图表**: ECharts
- **日期处理**: Day.js
- **HTTP客户端**: Axios

### 后端
- **运行时**: Node.js
- **框架**: Express
- **数据库**: MySQL / PostgreSQL
- **ORM**: 原生SQL查询（支持双数据库）
- **认证**: CORS + JWT（预留）

## 项目结构

```
marketing-ai-agent-vue/
├── server/                 # 后端服务
│   ├── src/
│   │   ├── config/        # 配置文件
│   │   ├── routes/        # API路由
│   │   └── index.js       # 入口文件
│   ├── migrate.js         # 数据库迁移脚本
│   ├── package.json
│   └── .env.example       # 环境变量示例
├── src/
│   ├── components/        # Vue组件
│   ├── views/             # 页面视图
│   ├── stores/            # Pinia状态管理
│   ├── router/            # 路由配置
│   ├── services/          # API服务
│   ├── App.vue            # 根组件
│   ├── main.ts            # 入口文件
│   └── style.css          # 全局样式
├── .env.development       # 开发环境配置
├── .env.production        # 生产环境配置
├── .gitignore
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 快速开始

### 前置要求

- Node.js >= 16
- MySQL >= 5.7 或 PostgreSQL >= 12
- npm 或 yarn

### 1. 安装依赖

```bash
# 安装前端依赖
npm install

# 安装后端依赖
cd server
npm install
```

### 2. 配置数据库

#### 使用MySQL

```bash
# 复制环境变量文件
cp server/.env.example server/.env

# 编辑.env文件，设置数据库配置
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=marketing_ai_agent
DB_USER=root
DB_PASSWORD=your_password
```

#### 使用PostgreSQL

```bash
# 编辑.env文件
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=marketing_ai_agent
DB_USER=postgres
DB_PASSWORD=your_password
```

### 3. 初始化数据库

```bash
cd server
npm run migrate
```

### 4. 启动服务

```bash
# 启动后端服务（在server目录）
npm run dev

# 启动前端服务（在根目录）
npm run dev
```

### 5. 访问应用

- 前端地址: http://localhost:5173
- 后端API: http://localhost:3000
- API文档: http://localhost:3000/

## 数据库表结构

### marketing_task - 营销任务表
- id: UUID主键
- name: 任务名称
- goal: 营销目标
- status: 状态（draft/in_progress/completed/paused）
- current_stage: 当前阶段（8个阶段）
- progress: 进度（0-100）
- budget: 预算
- start_date: 开始日期
- end_date: 结束日期

### task_stage_output - 任务阶段输出表
- id: UUID主键
- task_id: 关联任务
- stage: 阶段名称
- content: 阶段输出内容
- status: 状态（pending/running/completed/failed）

### ad_creative - 广告创意表
- id: UUID主键
- task_id: 关联任务
- channel: 投放渠道
- type: 类型（text/image）
- content: 文案内容或图片URL
- status: 状态（active/paused）
- performance_score: 效果评分

### marketing_performance - 营销效果数据表
- id: UUID主键
- task_id: 关联任务
- ad_creative_id: 关联创意
- date: 统计日期
- channel: 渠道名称
- impressions: 展示量
- clicks: 点击量
- conversions: 转化数
- cost: 花费
- revenue: 收入

## API接口

### 仪表盘
- `GET /api/dashboard/metrics` - 获取核心指标
- `GET /api/dashboard/trend` - 获取趋势数据
- `GET /api/dashboard/recent-tasks` - 获取最近任务

### 营销任务
- `GET /api/marketing-tasks` - 获取任务列表
- `POST /api/marketing-tasks` - 创建任务
- `GET /api/marketing-tasks/:id` - 获取任务详情
- `PATCH /api/marketing-tasks/:id` - 更新任务
- `GET /api/marketing-tasks/:id/stages` - 获取任务阶段
- `GET /api/marketing-tasks/:id/creatives` - 获取任务创意
- `POST /api/marketing-tasks/:id/creatives` - 创建创意
- `POST /api/marketing-tasks/:id/advance-stage` - 推进阶段

### 效果分析
- `GET /api/analytics/:taskId/metrics` - 获取任务指标
- `GET /api/analytics/:taskId/channel-comparison` - 获取渠道对比
- `GET /api/analytics/:taskId/recommendations` - 获取优化建议

## 核心功能

### 1. 营销仪表盘
- 实时展示核心营销指标
- 效果趋势图表展示
- 最近任务快速查看

### 2. 任务管理
- 创建、编辑、删除营销任务
- 任务状态管理（草稿/进行中/已完成/已暂停）
- 任务筛选和分页

### 3. AI智能体流程
8个阶段依次推进：
1. 数据采集
2. 市场分析
3. 策略制定
4. 计划规划
5. 创意生成
6. 投放执行
7. 效果分析
8. 优化迭代

### 4. 广告创意管理
- 支持多种投放渠道（Google/Instagram/TikTok/LinkedIn/Email）
- 支持文案和图片两种创意类型
- 创意效果评分
- 创意启用/暂停管理

### 5. 效果分析
- 多维度数据分析
- 渠道效果对比
- 智能优化建议
- ROI、CTR、转化率等核心指标

## 环境变量配置

### 前端环境变量

```env
VITE_API_BASE_URL=http://localhost:3000
```

### 后端环境变量

```env
# 服务器配置
PORT=3000
CORS_ORIGIN=*

# 数据库配置
DB_TYPE=mysql           # mysql 或 postgres
DB_HOST=localhost
DB_PORT=3306            # MySQL: 3306, PostgreSQL: 5432
DB_NAME=marketing_ai_agent
DB_USER=root
DB_PASSWORD=
```

## 部署

### 构建前端

```bash
npm run build
```

### 生产环境配置

1. 设置环境变量
2. 启动数据库服务
3. 运行数据库迁移
4. 启动后端服务
5. 部署前端静态文件

## 开发说明

### 添加新功能
1. 在 `server/src/routes/` 添加新的API路由
2. 在 `src/stores/` 添加状态管理
3. 在 `src/views/` 添加页面组件
4. 在 `src/router/index.ts` 添加路由

### 数据库变更
1. 修改 `server/migrate.js` 添加新的迁移逻辑
2. 运行 `npm run migrate` 执行迁移

## 许可证

MIT

## 作者

cao919

## 更新日志

### v1.0.0 (2025-03-24)
- ✨ 完成Vue3重构
- ✨ 实现所有核心功能
- ✨ 支持MySQL和PostgreSQL双数据库
- ✨ 完整的UI/UX设计
- ✨ 响应式布局
