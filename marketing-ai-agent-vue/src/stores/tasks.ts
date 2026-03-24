import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '../services/api';

export interface Task {
  id: string;
  name: string;
  goal: string;
  status: 'draft' | 'in_progress' | 'completed' | 'paused';
  current_stage: string;
  progress: number;
  budget: number;
  start_date: string;
  end_date: string;
  _created_at: string;
  _updated_at: string;
}

export interface StageOutput {
  id: string;
  task_id: string;
  stage: string;
  content: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export interface AdCreative {
  id: string;
  task_id: string;
  channel: string;
  type: 'text' | 'image';
  content: string;
  status: 'active' | 'paused';
  performance_score: number;
}

export const useTaskStore = defineStore('tasks', () => {
  const tasks = ref<Task[]>([]);
  const currentTask = ref<Task | null>(null);
  const stages = ref<StageOutput[]>([]);
  const creatives = ref<AdCreative[]>([]);
  const loading = ref(false);

  // 获取所有任务
  const fetchTasks = async (params?: { status?: string; page?: number; pageSize?: number }) => {
    loading.value = true;
    try {
      const response = await api.get('/marketing-tasks', { params });
      tasks.value = response.data.tasks;
      return response.data;
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  // 创建任务
  const createTask = async (taskData: {
    name: string;
    goal: string;
    budget: number;
    start_date: string;
    end_date: string;
  }) => {
    loading.value = true;
    try {
      const response = await api.post('/marketing-tasks', taskData);
      tasks.value.unshift(response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to create task:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  // 获取单个任务
  const fetchTask = async (id: string) => {
    loading.value = true;
    try {
      const response = await api.get(`/marketing-tasks/${id}`);
      currentTask.value = response.data;
      return response.data;
    } catch (error) {
      console.error('Failed to fetch task:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  // 更新任务
  const updateTask = async (id: string, data: Partial<Task>) => {
    loading.value = true;
    try {
      const response = await api.patch(`/marketing-tasks/${id}`, data);
      const index = tasks.value.findIndex(t => t.id === id);
      if (index !== -1) {
        tasks.value[index] = response.data;
      }
      if (currentTask.value?.id === id) {
        currentTask.value = response.data;
      }
      return response.data;
    } catch (error) {
      console.error('Failed to update task:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  // 获取任务阶段
  const fetchTaskStages = async (taskId: string) => {
    loading.value = true;
    try {
      const response = await api.get(`/marketing-tasks/${taskId}/stages`);
      stages.value = response.data;
      return response.data;
    } catch (error) {
      console.error('Failed to fetch task stages:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  // 获取任务创意
  const fetchTaskCreatives = async (taskId: string) => {
    loading.value = true;
    try {
      const response = await api.get(`/marketing-tasks/${taskId}/creatives`);
      creatives.value = response.data;
      return response.data;
    } catch (error) {
      console.error('Failed to fetch task creatives:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  // 创建创意
  const createCreative = async (taskId: string, creativeData: {
    channel: string;
    type: 'text' | 'image';
    content: string;
  }) => {
    loading.value = true;
    try {
      const response = await api.post(`/marketing-tasks/${taskId}/creatives`, creativeData);
      creatives.value.unshift(response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to create creative:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  // 推进阶段
  const advanceStage = async (taskId: string) => {
    loading.value = true;
    try {
      const response = await api.post(`/marketing-tasks/${taskId}/advance-stage`);
      currentTask.value = response.data.task;
      stages.value = response.data.stages;
      return response.data;
    } catch (error) {
      console.error('Failed to advance stage:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  return {
    tasks,
    currentTask,
    stages,
    creatives,
    loading,
    fetchTasks,
    createTask,
    fetchTask,
    updateTask,
    fetchTaskStages,
    fetchTaskCreatives,
    createCreative,
    advanceStage
  };
});
