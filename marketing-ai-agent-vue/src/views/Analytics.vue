<template>
  <Layout>
    <div class="analytics">
      <el-row :gutter="20">
        <el-col :span="24">
          <div class="page-header">
            <el-button :icon="ArrowLeft" @click="$router.back()">返回</el-button>
            <h2 class="page-title">效果分析报告</h2>
            <el-button type="primary" :icon="Refresh" @click="fetchAnalytics">
              刷新数据
            </el-button>
          </div>
        </el-col>
      </el-row>

      <!-- 核心指标 -->
      <el-row :gutter="20" class="metrics-row">
        <el-col :xs="24" :sm="12" :md="4" v-for="(metric, key) in metrics" :key="key">
          <el-card class="metric-card" shadow="hover">
            <div class="metric-content">
              <div class="metric-value">{{ formatMetricValue(key, metric) }}</div>
              <div class="metric-label">{{ getMetricLabel(key) }}</div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 渠道对比 -->
      <el-row :gutter="20" class="comparison-row">
        <el-col :xs="24" :lg="16">
          <el-card class="chart-card" shadow="hover">
            <template #header>
              <div class="card-header">渠道效果对比</div>
            </template>
            <div ref="channelChartRef" class="chart-container"></div>
          </el-card>
        </el-col>

        <el-col :xs="24" :lg="8">
          <el-card class="recommendations-card" shadow="hover">
            <template #header>
              <div class="card-header">优化建议</div>
            </template>
            <div class="recommendations-list">
              <div
                v-for="(rec, index) in recommendations"
                :key="index"
                class="recommendation-item"
                :class="`priority-${rec.priority}`"
              >
                <div class="recommendation-header">
                  <el-icon class="priority-icon">
                    <component :is="getPriorityIcon(rec.priority)" />
                  </el-icon>
                  <span class="recommendation-title">{{ rec.title }}</span>
                </div>
                <div class="recommendation-description">{{ rec.description }}</div>
              </div>
              <el-empty v-if="!recommendations.length" description="暂无建议" :image-size="80" />
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 详细数据表格 -->
      <el-row :gutter="20" class="detail-row">
        <el-col :span="24">
          <el-card shadow="hover">
            <template #header>
              <div class="card-header">渠道详细数据</div>
            </template>
            <el-table :data="channelComparison" border style="width: 100%">
              <el-table-column prop="channel" label="渠道" width="120" />
              <el-table-column prop="impressions" label="展示量" width="100" align="right">
                <template #default="{ row }">
                  {{ row.impressions.toLocaleString() }}
                </template>
              </el-table-column>
              <el-table-column prop="clicks" label="点击量" width="100" align="right">
                <template #default="{ row }">
                  {{ row.clicks.toLocaleString() }}
                </template>
              </el-table-column>
              <el-table-column prop="conversions" label="转化数" width="100" align="right">
                <template #default="{ row }">
                  {{ row.conversions.toLocaleString() }}
                </template>
              </el-table-column>
              <el-table-column prop="ctr" label="点击率(%)" width="100" align="right" />
              <el-table-column prop="conversion_rate" label="转化率(%)" width="120" align="right" />
              <el-table-column prop="cost" label="花费" width="120" align="right">
                <template #default="{ row }">
                  ¥{{ row.cost.toFixed(2) }}
                </template>
              </el-table-column>
              <el-table-column prop="revenue" label="收入" width="120" align="right">
                <template #default="{ row }">
                  ¥{{ row.revenue.toFixed(2) }}
                </template>
              </el-table-column>
              <el-table-column prop="roi" label="ROI(%)" width="100" align="right" />
            </el-table>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </Layout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import * as echarts from 'echarts';
import Layout from '../components/Layout.vue';
import {
  ArrowLeft,
  Refresh,
  Warning,
  InfoFilled,
  SuccessFilled
} from '@element-plus/icons-vue';
import api from '../services/api';

const route = useRoute();
const taskId = route.params.taskId as string;

const metrics = ref<any>({});
const channelComparison = ref<any[]>([]);
const recommendations = ref<any[]>([]);
const loading = ref(false);
const channelChartRef = ref<HTMLElement | null>(null);
let channelChart: echarts.ECharts | null = null;

const getMetricLabel = (key: string) => {
  const labels: Record<string, string> = {
    total_impressions: '总展示量',
    total_clicks: '总点击量',
    total_conversions: '总转化数',
    ctr: '点击率',
    conversion_rate: '转化率',
    cpc: '每次点击成本',
    cpa: '每次转化成本',
    roi: '投资回报率'
  };
  return labels[key] || key;
};

const formatMetricValue = (key: string, value: number) => {
  if (['ctr', 'conversion_rate', 'roi'].includes(key)) {
    return `${value.toFixed(2)}%`;
  }
  if (['cpc', 'cpa'].includes(key)) {
    return `¥${value.toFixed(2)}`;
  }
  return value.toLocaleString();
};

const getPriorityIcon = (priority: string) => {
  const iconMap: Record<string, any> = {
    high: Warning,
    medium: InfoFilled,
    low: SuccessFilled
  };
  return iconMap[priority] || InfoFilled;
};

const initChannelChart = () => {
  if (!channelChartRef.value) return;

  channelChart = echarts.init(channelChartRef.value);
  updateChannelChart();
};

const updateChannelChart = () => {
  if (!channelChart || !channelComparison.value.length) return;

  const channels = channelComparison.value.map(item => item.channel);
  const impressions = channelComparison.value.map(item => item.impressions);
  const clicks = channelComparison.value.map(item => item.clicks);
  const conversions = channelComparison.value.map(item => item.conversions);
  const cost = channelComparison.value.map(item => item.cost);
  const revenue = channelComparison.value.map(item => item.revenue);

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    legend: {
      data: ['展示量', '点击量', '转化数', '花费', '收入']
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: channels
    },
    yAxis: {
      type: 'value',
      name: '数值'
    },
    series: [
      {
        name: '展示量',
        type: 'bar',
        data: impressions,
        itemStyle: { color: '#667eea' }
      },
      {
        name: '点击量',
        type: 'bar',
        data: clicks,
        itemStyle: { color: '#f5576c' }
      },
      {
        name: '转化数',
        type: 'bar',
        data: conversions,
        itemStyle: { color: '#43e97b' }
      },
      {
        name: '花费',
        type: 'bar',
        data: cost,
        itemStyle: { color: '#ff9f43' }
      },
      {
        name: '收入',
        type: 'bar',
        data: revenue,
        itemStyle: { color: '#00d2d3' }
      }
    ]
  };

  channelChart.setOption(option);
};

const fetchAnalytics = async () => {
  loading.value = true;
  try {
    const [metricsRes, comparisonRes, recommendationsRes] = await Promise.all([
      api.get(`/analytics/${taskId}/metrics`),
      api.get(`/analytics/${taskId}/channel-comparison`),
      api.get(`/analytics/${taskId}/recommendations`)
    ]);

    metrics.value = metricsRes.data.metrics;
    channelComparison.value = comparisonRes.data;
    recommendations.value = recommendationsRes.data.recommendations;

    updateChannelChart();
  } catch (error) {
    ElMessage.error('加载分析数据失败');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchAnalytics();
  initChannelChart();
});
</script>

<style scoped>
.analytics {
  width: 100%;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.page-title {
  margin: 0;
  flex: 1;
  color: #1a1a1a;
}

.metrics-row,
.comparison-row,
.detail-row {
  margin-bottom: 20px;
}

.metric-card {
  border-radius: 8px;
  overflow: hidden;
}

.metric-content {
  text-align: center;
  padding: 20px 0;
}

.metric-value {
  font-size: 28px;
  font-weight: bold;
  color: #1a1a1a;
  margin-bottom: 8px;
}

.metric-label {
  font-size: 14px;
  color: #666;
}

.card-header {
  font-weight: 600;
}

.chart-container {
  width: 100%;
  height: 400px;
}

.recommendations-list {
  max-height: 400px;
  overflow-y: auto;
}

.recommendation-item {
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 12px;
  border-left: 4px solid;
  background: #f8f9fa;
}

.recommendation-item.priority-high {
  border-left-color: #f56c6c;
  background: #fef0f0;
}

.recommendation-item.priority-medium {
  border-left-color: #e6a23c;
  background: #fdf6ec;
}

.recommendation-item.priority-low {
  border-left-color: #67c23a;
  background: #f0f9ff;
}

.recommendation-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-weight: 600;
}

.priority-icon {
  font-size: 18px;
}

.recommendation-item.priority-high .priority-icon {
  color: #f56c6c;
}

.recommendation-item.priority-medium .priority-icon {
  color: #e6a23c;
}

.recommendation-item.priority-low .priority-icon {
  color: #67c23a;
}

.recommendation-description {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
}
</style>
