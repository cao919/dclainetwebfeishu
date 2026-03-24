import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '../services/api';

export interface DashboardMetrics {
  total_tasks: number;
  in_progress: number;
  completed: number;
  total_budget: number;
  total_conversions: number;
  total_cost: number;
  total_revenue: number;
  roi: number;
}

export interface TrendData {
  date: string;
  impressions: number;
  clicks: number;
  conversions: number;
  cost: number;
  revenue: number;
}

export const useDashboardStore = defineStore('dashboard', () => {
  const metrics = ref<DashboardMetrics | null>(null);
  const trend = ref<TrendData[]>([]);
  const recentTasks = ref<any[]>([]);
  const loading = ref(false);

  // 获取核心指标
  const fetchMetrics = async () => {
    loading.value = true;
    try {
      const response = await api.get('/dashboard/metrics');
      metrics.value = response.data;
      return response.data;
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  // 获取趋势数据
  const fetchTrend = async (days = 30) => {
    loading.value = true;
    try {
      const response = await api.get('/dashboard/trend', { params: { days } });
      trend.value = response.data;
      return response.data;
    } catch (error) {
      console.error('Failed to fetch trend:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  // 获取最近任务
  const fetchRecentTasks = async (limit = 5) => {
    loading.value = true;
    try {
      const response = await api.get('/dashboard/recent-tasks', { params: { limit } });
      recentTasks.value = response.data;
      return response.data;
    } catch (error) {
      console.error('Failed to fetch recent tasks:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  // 刷新所有数据
  const refreshAll = async () => {
    await Promise.all([
      fetchMetrics(),
      fetchTrend(),
      fetchRecentTasks()
    ]);
  };

  return {
    metrics,
    trend,
    recentTasks,
    loading,
    fetchMetrics,
    fetchTrend,
    fetchRecentTasks,
    refreshAll
  };
});
