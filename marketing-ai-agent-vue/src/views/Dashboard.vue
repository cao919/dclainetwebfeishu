<template>
  <Layout>
    <div class="dashboard">
      <el-row :gutter="20">
        <el-col :span="24">
          <h2 class="page-title">营销仪表盘</h2>
        </el-col>
      </el-row>

      <!-- 核心指标卡片 -->
      <el-row :gutter="20" class="metrics-row">
        <el-col :xs="24" :sm="12" :md="6" v-for="(metric, key) in metricCards" :key="key">
          <el-card class="metric-card" shadow="hover">
            <div class="metric-content">
              <div class="metric-icon" :style="{ background: metric.color }">
                <el-icon :size="24">
                  <component :is="metric.icon" />
                </el-icon>
              </div>
              <div class="metric-info">
                <div class="metric-value">{{ formatValue(metric.value, metric.type) }}</div>
                <div class="metric-label">{{ metric.label }}</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 趋势图表和最近任务 -->
      <el-row :gutter="20" class="charts-row">
        <el-col :xs="24" :lg="16">
          <el-card class="chart-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <span>效果趋势</span>
                <el-select v-model="trendDays" size="small" @change="handleTrendChange">
                  <el-option label="7天" :value="7" />
                  <el-option label="30天" :value="30" />
                  <el-option label="90天" :value="90" />
                </el-select>
              </div>
            </template>
            <div ref="trendChartRef" class="chart-container"></div>
          </el-card>
        </el-col>

        <el-col :xs="24" :lg="8">
          <el-card class="tasks-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <span>最近任务</span>
                <el-button type="primary" link @click="$router.push('/tasks')">
                  查看全部
                  <el-icon><ArrowRight /></el-icon>
                </el-button>
              </div>
            </template>
            <div class="tasks-list">
              <div v-for="task in recentTasks" :key="task.id" class="task-item" @click="$router.push(`/tasks/${task.id}`)">
                <div class="task-header">
                  <div class="task-name">{{ task.name }}</div>
                  <el-tag :type="getStatusType(task.status)" size="small">
                    {{ getStatusText(task.status) }}
                  </el-tag>
                </div>
                <div class="task-info">
                  <el-progress :percentage="task.progress" :stroke-width="8" />
                  <div class="task-meta">
                    <span>预算: ¥{{ task.budget.toLocaleString() }}</span>
                    <span>进度: {{ task.progress }}%</span>
                  </div>
                </div>
              </div>
              <el-empty v-if="!recentTasks.length" description="暂无任务" :image-size="80" />
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </Layout>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import * as echarts from 'echarts';
import Layout from '../components/Layout.vue';
import { useDashboardStore } from '../stores/dashboard';
import {
  Document,
  DataAnalysis,
  TrendCharts,
  Money,
  User,
  ArrowRight
} from '@element-plus/icons-vue';

const dashboardStore = useDashboardStore();
const trendChartRef = ref<HTMLElement | null>(null);
const trendDays = ref(30);
let trendChart: echarts.ECharts | null = null;

const metricCards = computed(() => {
  const metrics = dashboardStore.metrics;
  if (!metrics) return {};

  return {
    total_tasks: {
      label: '总任务数',
      value: metrics.total_tasks,
      type: 'number',
      color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      icon: Document
    },
    in_progress: {
      label: '进行中',
      value: metrics.in_progress,
      type: 'number',
      color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      icon: DataAnalysis
    },
    total_conversions: {
      label: '总转化数',
      value: metrics.total_conversions,
      type: 'number',
      color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      icon: TrendCharts
    },
    roi: {
      label: '投资回报率',
      value: metrics.roi,
      type: 'percent',
      color: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      icon: Money
    }
  };
});

const recentTasks = computed(() => dashboardStore.recentTasks);

const formatValue = (value: number, type: string) => {
  if (type === 'percent') {
    return `${value.toFixed(2)}%`;
  }
  return value.toLocaleString();
};

const getStatusType = (status: string) => {
  const typeMap: Record<string, any> = {
    draft: 'info',
    in_progress: 'warning',
    completed: 'success',
    paused: 'danger'
  };
  return typeMap[status] || 'info';
};

const getStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    draft: '草稿',
    in_progress: '进行中',
    completed: '已完成',
    paused: '已暂停'
  };
  return textMap[status] || status;
};

const initTrendChart = () => {
  if (!trendChartRef.value) return;

  trendChart = echarts.init(trendChartRef.value);
  updateTrendChart();
};

const updateTrendChart = () => {
  if (!trendChart || !dashboardStore.trend.length) return;

  const dates = dashboardStore.trend.map(item => item.date);
  const impressions = dashboardStore.trend.map(item => item.impressions);
  const clicks = dashboardStore.trend.map(item => item.clicks);
  const conversions = dashboardStore.trend.map(item => item.conversions);

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    legend: {
      data: ['展示量', '点击量', '转化数']
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '展示量',
        type: 'line',
        smooth: true,
        data: impressions,
        itemStyle: { color: '#667eea' }
      },
      {
        name: '点击量',
        type: 'line',
        smooth: true,
        data: clicks,
        itemStyle: { color: '#f5576c' }
      },
      {
        name: '转化数',
        type: 'line',
        smooth: true,
        data: conversions,
        itemStyle: { color: '#43e97b' }
      }
    ]
  };

  trendChart.setOption(option);
};

const handleTrendChange = async () => {
  await dashboardStore.fetchTrend(trendDays.value);
  updateTrendChart();
};

onMounted(async () => {
  await dashboardStore.refreshAll();
  initTrendChart();
});
</script>

<style scoped>
.dashboard {
  width: 100%;
}

.page-title {
  margin-bottom: 20px;
  color: #1a1a1a;
}

.metrics-row {
  margin-bottom: 20px;
}

.metric-card {
  border-radius: 8px;
  overflow: hidden;
}

.metric-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.metric-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.metric-info {
  flex: 1;
}

.metric-value {
  font-size: 24px;
  font-weight: bold;
  color: #1a1a1a;
  margin-bottom: 4px;
}

.metric-label {
  font-size: 14px;
  color: #666;
}

.charts-row {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.chart-container {
  width: 100%;
  height: 350px;
}

.tasks-list {
  max-height: 400px;
  overflow-y: auto;
}

.task-item {
  padding: 12px;
  border-radius: 8px;
  background: #f8f9fa;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.3s;
}

.task-item:hover {
  background: #e9ecef;
  transform: translateX(4px);
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.task-name {
  font-weight: 600;
  color: #1a1a1a;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-info {
  margin-top: 8px;
}

.task-meta {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 12px;
  color: #666;
}
</style>
