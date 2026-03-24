<template>
  <Layout>
    <div class="tasks">
      <el-row :gutter="20">
        <el-col :span="24">
          <div class="page-header">
            <h2 class="page-title">营销任务</h2>
            <el-button type="primary" :icon="Plus" @click="showCreateDialog = true">
              创建任务
            </el-button>
          </div>
        </el-col>
      </el-row>

      <!-- 筛选和搜索 -->
      <el-row :gutter="20" class="filter-row">
        <el-col :span="24">
          <el-card shadow="never">
            <el-form inline>
              <el-form-item label="状态">
                <el-radio-group v-model="selectedStatus" @change="handleStatusChange">
                  <el-radio-button label="">全部</el-radio-button>
                  <el-radio-button label="draft">草稿</el-radio-button>
                  <el-radio-button label="in_progress">进行中</el-radio-button>
                  <el-radio-button label="completed">已完成</el-radio-button>
                  <el-radio-button label="paused">已暂停</el-radio-button>
                </el-radio-group>
              </el-form-item>
            </el-form>
          </el-card>
        </el-col>
      </el-row>

      <!-- 任务列表 -->
      <el-row :gutter="20">
        <el-col :span="24">
          <el-card shadow="hover">
            <el-table
              :data="tasks"
              v-loading="loading"
              style="width: 100%"
              @row-click="handleRowClick"
            >
              <el-table-column prop="name" label="任务名称" min-width="200">
                <template #default="{ row }">
                  <div class="task-name">{{ row.name }}</div>
                  <div class="task-goal">{{ row.goal }}</div>
                </template>
              </el-table-column>
              <el-table-column prop="status" label="状态" width="100">
                <template #default="{ row }">
                  <el-tag :type="getStatusType(row.status)" size="small">
                    {{ getStatusText(row.status) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="current_stage" label="当前阶段" width="120">
                <template #default="{ row }">
                  <el-tag type="info" size="small">{{ getStageText(row.current_stage) }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="progress" label="进度" width="150">
                <template #default="{ row }">
                  <el-progress :percentage="row.progress" :stroke-width="12" />
                </template>
              </el-table-column>
              <el-table-column prop="budget" label="预算" width="120">
                <template #default="{ row }">
                  ¥{{ row.budget.toLocaleString() }}
                </template>
              </el-table-column>
              <el-table-column prop="_created_at" label="创建时间" width="180">
                <template #default="{ row }">
                  {{ formatDate(row._created_at) }}
                </template>
              </el-table-column>
              <el-table-column label="操作" width="200" fixed="right">
                <template #default="{ row }">
                  <el-button type="primary" link size="small" @click.stop="handleView(row)">
                    查看
                  </el-button>
                  <el-button type="warning" link size="small" @click.stop="handleEdit(row)">
                    编辑
                  </el-button>
                  <el-dropdown @command="(cmd) => handleAction(cmd, row)">
                    <el-button type="primary" link size="small">
                      更多
                      <el-icon><ArrowDown /></el-icon>
                    </el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item command="pause" v-if="row.status === 'in_progress'">
                          暂停
                        </el-dropdown-item>
                        <el-dropdown-item command="resume" v-if="row.status === 'paused'">
                          继续
                        </el-dropdown-item>
                        <el-dropdown-item command="delete" divided style="color: #f56c6c">
                          删除
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </template>
              </el-table-column>
            </el-table>

            <el-pagination
              v-model:current-page="pagination.page"
              v-model:page-size="pagination.pageSize"
              :page-sizes="[10, 20, 50, 100]"
              :total="pagination.total"
              layout="total, sizes, prev, pager, next, jumper"
              class="pagination"
              @size-change="handleSizeChange"
              @current-change="handlePageChange"
            />
          </el-card>
        </el-col>
      </el-row>

      <!-- 创建任务对话框 -->
      <el-dialog
        v-model="showCreateDialog"
        title="创建营销任务"
        width="600px"
        :close-on-click-modal="false"
      >
        <el-form :model="taskForm" :rules="taskRules" ref="taskFormRef" label-width="120px">
          <el-form-item label="任务名称" prop="name">
            <el-input v-model="taskForm.name" placeholder="请输入任务名称" />
          </el-form-item>
          <el-form-item label="营销目标" prop="goal">
            <el-input
              v-model="taskForm.goal"
              type="textarea"
              :rows="4"
              placeholder="请描述营销目标"
            />
          </el-form-item>
          <el-form-item label="预算" prop="budget">
            <el-input-number
              v-model="taskForm.budget"
              :min="0"
              :step="1000"
              :precision="2"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="开始日期" prop="start_date">
            <el-date-picker
              v-model="taskForm.start_date"
              type="date"
              placeholder="选择开始日期"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="结束日期" prop="end_date">
            <el-date-picker
              v-model="taskForm.end_date"
              type="date"
              placeholder="选择结束日期"
              style="width: 100%"
            />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="showCreateDialog = false">取消</el-button>
          <el-button type="primary" @click="handleCreate" :loading="creating">
            创建
          </el-button>
        </template>
      </el-dialog>
    </div>
  </Layout>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import Layout from '../components/Layout.vue';
import { useTaskStore } from '../stores/tasks';
import {
  Plus,
  ArrowDown
} from '@element-plus/icons-vue';
import dayjs from 'dayjs';

const router = useRouter();
const taskStore = useTaskStore();

const tasks = ref(taskStore.tasks);
const loading = ref(false);
const selectedStatus = ref('');
const showCreateDialog = ref(false);
const creating = ref(false);
const taskFormRef = ref();

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
});

const taskForm = reactive({
  name: '',
  goal: '',
  budget: 0,
  start_date: '',
  end_date: ''
});

const taskRules = {
  name: [{ required: true, message: '请输入任务名称', trigger: 'blur' }],
  goal: [{ required: true, message: '请描述营销目标', trigger: 'blur' }],
  budget: [{ required: true, message: '请输入预算', trigger: 'blur' }],
  start_date: [{ required: true, message: '请选择开始日期', trigger: 'change' }],
  end_date: [{ required: true, message: '请选择结束日期', trigger: 'change' }]
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

const getStageText = (stage: string) => {
  const stageMap: Record<string, string> = {
    data_collection: '数据采集',
    market_analysis: '市场分析',
    strategy: '策略制定',
    planning: '计划规划',
    creative: '创意生成',
    execution: '投放执行',
    analysis: '效果分析',
    optimization: '优化迭代'
  };
  return stageMap[stage] || stage;
};

const formatDate = (date: string) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm');
};

const handleStatusChange = async () => {
  await fetchTasks();
};

const handleSizeChange = async (size: number) => {
  pagination.pageSize = size;
  pagination.page = 1;
  await fetchTasks();
};

const handlePageChange = async (page: number) => {
  pagination.page = page;
  await fetchTasks();
};

const fetchTasks = async () => {
  loading.value = true;
  try {
    const data = await taskStore.fetchTasks({
      status: selectedStatus.value,
      page: pagination.page,
      pageSize: pagination.pageSize
    });
    tasks.value = data.tasks;
    pagination.total = data.pagination.total;
  } catch (error) {
    ElMessage.error('加载任务列表失败');
  } finally {
    loading.value = false;
  }
};

const handleRowClick = (row: any) => {
  router.push(`/tasks/${row.id}`);
};

const handleView = (row: any) => {
  router.push(`/tasks/${row.id}`);
};

const handleEdit = (row: any) => {
  router.push(`/tasks/${row.id}`);
};

const handleAction = async (command: string, row: any) => {
  if (command === 'pause') {
    await taskStore.updateTask(row.id, { status: 'paused' });
    ElMessage.success('任务已暂停');
    await fetchTasks();
  } else if (command === 'resume') {
    await taskStore.updateTask(row.id, { status: 'in_progress' });
    ElMessage.success('任务已继续');
    await fetchTasks();
  } else if (command === 'delete') {
    await ElMessageBox.confirm('确定要删除此任务吗？', '提示', {
      type: 'warning'
    });
    ElMessage.success('任务已删除');
    await fetchTasks();
  }
};

const handleCreate = async () => {
  if (!taskFormRef.value) return;

  await taskFormRef.value.validate(async (valid: boolean) => {
    if (!valid) return;

    creating.value = true;
    try {
      const data = {
        name: taskForm.name,
        goal: taskForm.goal,
        budget: taskForm.budget,
        start_date: dayjs(taskForm.start_date).format('YYYY-MM-DD'),
        end_date: dayjs(taskForm.end_date).format('YYYY-MM-DD')
      };

      await taskStore.createTask(data);
      ElMessage.success('任务创建成功');
      showCreateDialog.value = false;
      Object.assign(taskForm, {
        name: '',
        goal: '',
        budget: 0,
        start_date: '',
        end_date: ''
      });
      await fetchTasks();
    } catch (error) {
      ElMessage.error('创建任务失败');
    } finally {
      creating.value = false;
    }
  });
};

onMounted(() => {
  fetchTasks();
});
</script>

<style scoped>
.tasks {
  width: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-title {
  margin: 0;
  color: #1a1a1a;
}

.filter-row {
  margin-bottom: 20px;
}

.task-name {
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 4px;
}

.task-goal {
  font-size: 12px;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

:deep(.el-table__row) {
  cursor: pointer;
}

:deep(.el-table__row:hover) {
  background-color: #f5f7fa;
}
</style>
