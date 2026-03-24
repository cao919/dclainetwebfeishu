<template>
  <div class="layout">
    <el-container>
      <!-- 侧边栏 -->
      <el-aside :width="sidebarCollapsed ? '64px' : '200px'" class="sidebar">
        <div class="logo">
          <div v-if="sidebarCollapsed" class="logo-icon">
            <el-icon><DataAnalysis /></el-icon>
          </div>
          <div v-else class="logo-text">
            <el-icon><DataAnalysis /></el-icon>
            <span>营销AI智能体</span>
          </div>
        </div>
        <el-menu
          :default-active="currentRoute"
          :collapse="sidebarCollapsed"
          :collapse-transition="false"
          router
          class="menu"
        >
          <el-menu-item index="/">
            <el-icon><Odometer /></el-icon>
            <template #title>仪表盘</template>
          </el-menu-item>
          <el-menu-item index="/tasks">
            <el-icon><List /></el-icon>
            <template #title>营销任务</template>
          </el-menu-item>
          <el-menu-item index="/analytics" :disabled="!currentTaskId">
            <el-icon><TrendCharts /></el-icon>
            <template #title>效果分析</template>
          </el-menu-item>
        </el-menu>
      </el-aside>

      <!-- 主内容区 -->
      <el-container>
        <el-header class="header">
          <div class="header-left">
            <el-button
              :icon="sidebarCollapsed ? Expand : Fold"
              @click="toggleSidebar"
              text
              size="large"
            />
            <el-breadcrumb separator="/">
              <el-breadcrumb-item to="/">首页</el-breadcrumb-item>
              <el-breadcrumb-item v-if="breadcrumb">{{ breadcrumb }}</el-breadcrumb-item>
            </el-breadcrumb>
          </div>
          <div class="header-right">
            <el-dropdown>
              <el-button type="primary" text size="large">
                <el-icon><User /></el-icon>
                Guest
                <el-icon><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item>个人设置</el-dropdown-item>
                  <el-dropdown-item divided>退出登录</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </el-header>

        <el-main class="main-content">
          <router-view v-slot="{ Component }">
            <transition name="fade" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import {
  DataAnalysis,
  Odometer,
  List,
  TrendCharts,
  Expand,
  Fold,
  User,
  ArrowDown
} from '@element-plus/icons-vue';

const route = useRoute();
const sidebarCollapsed = ref(false);

const currentRoute = computed(() => route.path);
const currentTaskId = computed(() => {
  return (route.params.id as string) || (route.params.taskId as string);
});

const breadcrumb = computed(() => {
  const routeMap: Record<string, string> = {
    '/': '仪表盘',
    '/tasks': '营销任务',
    '/tasks/:id': '任务详情',
    '/analytics/:taskId': '效果分析'
  };

  const path = route.path;
  if (path === '/') return null;
  if (path.startsWith('/tasks/') && path.includes('analytics')) {
    return '效果分析';
  }
  if (path.startsWith('/tasks/') && !path.includes('analytics')) {
    return '任务详情';
  }
  if (path === '/tasks') return '营销任务';
  return null;
});

const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value;
};
</script>

<style scoped>
.layout {
  width: 100%;
  height: 100%;
}

.el-container {
  height: 100%;
}

.sidebar {
  background: #001529;
  transition: width 0.3s;
  overflow: hidden;
}

.logo {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.logo-icon {
  font-size: 24px;
}

.logo-text {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: bold;
}

.menu {
  border: none;
  background: transparent;
}

.header {
  background: white;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.main-content {
  background: #f5f7fa;
  padding: 20px;
  overflow-y: auto;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
