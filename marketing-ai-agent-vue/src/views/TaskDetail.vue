<template>
  <div class="task-detail">
      <el-row :gutter="20">
        <el-col :span="24">
          <div class="page-header">
            <el-button :icon="ArrowLeft" @click="$router.back()">返回</el-button>
            <h2 class="page-title">{{ currentTask?.name }}</h2>
            <el-tag :type="getStatusType(currentTask?.status)" size="large">
              {{ getStatusText(currentTask?.status) }}
            </el-tag>
          </div>
        </el-col>
      </el-row>

      <!-- 任务信息卡片 -->
      <el-row :gutter="20" class="info-row">
        <el-col :xs="24" :md="8">
          <el-card shadow="hover">
            <template #header>
              <div class="card-header">任务概览</div>
            </template>
            <el-descriptions :column="1" border>
              <el-descriptions-item label="营销目标">
                {{ currentTask?.goal }}
              </el-descriptions-item>
              <el-descriptions-item label="预算">
                ¥{{ currentTask?.budget?.toLocaleString() }}
              </el-descriptions-item>
              <el-descriptions-item label="开始日期">
                {{ currentTask?.start_date }}
              </el-descriptions-item>
              <el-descriptions-item label="结束日期">
                {{ currentTask?.end_date }}
              </el-descriptions-item>
            </el-descriptions>
          </el-card>
        </el-col>

        <el-col :xs="24" :md="8">
          <el-card shadow="hover">
            <template #header>
              <div class="card-header">执行进度</div>
            </template>
            <div class="progress-info">
              <el-progress
                type="circle"
                :percentage="currentTask?.progress || 0"
                :width="120"
                :stroke-width="10"
              />
              <div class="current-stage">
                <div class="stage-label">当前阶段</div>
                <el-tag size="large" type="warning">
                  {{ getStageText(currentTask?.current_stage) }}
                </el-tag>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :xs="24" :md="8">
          <el-card shadow="hover">
            <template #header>
              <div class="card-header">快捷操作</div>
            </template>
            <div class="actions">
              <el-button
                type="primary"
                :icon="ArrowRight"
                @click="handleAdvanceStage"
                :disabled="currentTask?.status !== 'in_progress' || currentTask?.progress >= 100"
              >
                推进下一阶段
              </el-button>
              <el-button
                :icon="DataAnalysis"
                @click="$router.push(`/analytics/${$route.params.id}`)"
              >
                查看分析
              </el-button>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 阶段输出 -->
      <el-row :gutter="20" class="stages-row">
        <el-col :span="24">
          <el-card shadow="hover">
            <template #header>
              <div class="card-header">AI智能体执行阶段</div>
            </template>
            <el-steps :active="getStageIndex()" align-center finish-status="success">
              <el-step
                v-for="stage in stageList"
                :key="stage.key"
                :title="stage.label"
                :status="getStageStatus(stage.key)"
              />
            </el-steps>
          </el-card>
        </el-col>
      </el-row>

      <!-- 创意管理 -->
      <el-row :gutter="20" class="creatives-row">
        <el-col :span="24">
          <el-card shadow="hover">
            <template #header>
              <div class="card-header">
                <span>广告创意</span>
                <el-button type="primary" :icon="Plus" @click="showCreativeDialog = true">
                  添加创意
                </el-button>
              </div>
            </template>
            <el-row :gutter="20">
              <el-col :xs="24" :sm="12" :md="8" :lg="6" v-for="creative in creatives" :key="creative.id">
                <div class="creative-card">
                  <div class="creative-header">
                    <el-tag :type="creative.type === 'text' ? 'primary' : 'success'" size="small">
                      {{ creative.type === 'text' ? '文案' : '图片' }}
                    </el-tag>
                    <el-tag type="info" size="small">{{ creative.channel }}</el-tag>
                  </div>
                  <div class="creative-content">
                    <div v-if="creative.type === 'text'" class="text-content">
                      {{ creative.content }}
                    </div>
                    <div v-else class="image-content">
                      <el-image :src="creative.content" fit="cover" />
                    </div>
                  </div>
                  <div class="creative-footer">
                    <span>评分: {{ creative.performance_score }}</span>
                    <el-switch
                      v-model="creative.status"
                      active-value="active"
                      inactive-value="paused"
                      active-text="启用"
                      inactive-text="暂停"
                    />
                  </div>
                </div>
              </el-col>
              <el-col :xs="24" :sm="12" :md="8" :lg="6">
                <div class="creative-card add-creative" @click="showCreativeDialog = true">
                  <el-icon :size="40"><Plus /></el-icon>
                  <span>添加创意</span>
                </div>
              </el-col>
            </el-row>
          </el-card>
        </el-col>
      </el-row>

      <!-- 添加创意对话框 -->
      <el-dialog
        v-model="showCreativeDialog"
        title="添加广告创意"
        width="600px"
        :close-on-click-modal="false"
      >
        <el-form :model="creativeForm" :rules="creativeRules" ref="creativeFormRef" label-width="120px">
          <el-form-item label="投放渠道" prop="channel">
            <el-select v-model="creativeForm.channel" placeholder="选择渠道" style="width: 100%">
              <el-option label="Google" value="Google" />
              <el-option label="Instagram" value="Instagram" />
              <el-option label="TikTok" value="TikTok" />
              <el-option label="LinkedIn" value="LinkedIn" />
              <el-option label="Email" value="Email" />
            </el-select>
          </el-form-item>
          <el-form-item label="创意类型" prop="type">
            <el-radio-group v-model="creativeForm.type">
              <el-radio label="text">文案</el-radio>
              <el-radio label="image">图片</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="内容" prop="content">
            <el-input
              v-if="creativeForm.type === 'text'"
              v-model="creativeForm.content"
              type="textarea"
              :rows="4"
              placeholder="请输入文案内容"
            />
            <el-upload
              v-else
              class="upload-demo"
              drag
              action="#"
              :auto-upload="false"
              @change="handleImageChange"
            >
              <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
              <div class="el-upload__text">
                将文件拖到此处，或<em>点击上传</em>
              </div>
            </el-upload>
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="showCreativeDialog = false">取消</el-button>
          <el-button type="primary" @click="handleCreateCreative" :loading="creating">
            创建
          </el-button>
        </template>
      </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, reactive } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useTaskStore } from '../stores/tasks';
import {
  ArrowLeft,
  ArrowRight,
  DataAnalysis,
  Plus,
  UploadFilled
} from '@element-plus/icons-vue';

const route = useRoute();
const taskStore = useTaskStore();
const taskId = route.params.id as string;

const currentTask = computed(() => taskStore.currentTask);
const stages = computed(() => taskStore.stages);
const creatives = computed(() => taskStore.creatives);

const showCreativeDialog = ref(false);
const creating = ref(false);
const creativeFormRef = ref();

const stageList = [
  { key: 'data_collection', label: '数据采集' },
  { key: 'market_analysis', label: '市场分析' },
  { key: 'strategy', label: '策略制定' },
  { key: 'planning', label: '计划规划' },
  { key: 'creative', label: '创意生成' },
  { key: 'execution', label: '投放执行' },
  { key: 'analysis', label: '效果分析' },
  { key: 'optimization', label: '优化迭代' }
];

const creativeForm = reactive({
  channel: '',
  type: 'text',
  content: ''
});

const creativeRules = {
  channel: [{ required: true, message: '请选择投放渠道', trigger: 'change' }],
  type: [{ required: true, message: '请选择创意类型', trigger: 'change' }],
  content: [{ required: true, message: '请输入内容', trigger: 'blur' }]
};

const getStatusType = (status?: string) => {
  const typeMap: Record<string, any> = {
    draft: 'info',
    in_progress: 'warning',
    completed: 'success',
    paused: 'danger'
  };
  return typeMap[status || ''] || 'info';
};

const getStatusText = (status?: string) => {
  const textMap: Record<string, string> = {
    draft: '草稿',
    in_progress: '进行中',
    completed: '已完成',
    paused: '已暂停'
  };
  return textMap[status || ''] || status;
};

const getStageText = (stage?: string) => {
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
  return stageMap[stage || ''] || stage;
};

const getStageIndex = () => {
  if (!currentTask.value) return 0;
  return stageList.findIndex(s => s.key === currentTask.value?.current_stage);
};

const getStageStatus = (stageKey: string) => {
  const stage = stages.value.find(s => s.stage === stageKey);
  if (!stage) return 'wait';
  return stage.status === 'completed' ? 'success' : stage.status === 'running' ? 'process' : 'wait';
};

const handleAdvanceStage = async () => {
  try {
    await taskStore.advanceStage(taskId);
    ElMessage.success('阶段已推进');
  } catch (error) {
    ElMessage.error('推进阶段失败');
  }
};

const handleImageChange = (file: any) => {
  creativeForm.content = file.raw.name;
  ElMessage.success('图片已选择');
};

const handleCreateCreative = async () => {
  if (!creativeFormRef.value) return;

  await creativeFormRef.value.validate(async (valid: boolean) => {
    if (!valid) return;

    creating.value = true;
    try {
      await taskStore.createCreative(taskId, {
        channel: creativeForm.channel,
        type: creativeForm.type as 'text' | 'image',
        content: creativeForm.content
      });
      ElMessage.success('创意创建成功');
      showCreativeDialog.value = false;
      Object.assign(creativeForm, {
        channel: '',
        type: 'text',
        content: ''
      });
    } catch (error) {
      ElMessage.error('创建创意失败');
    } finally {
      creating.value = false;
    }
  });
};

onMounted(async () => {
  await Promise.all([
    taskStore.fetchTask(taskId),
    taskStore.fetchTaskStages(taskId),
    taskStore.fetchTaskCreatives(taskId)
  ]);
});
</script>

<style scoped>
.task-detail {
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

.info-row,
.stages-row,
.creatives-row {
  margin-bottom: 20px;
}

.card-header {
  font-weight: 600;
}

.progress-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 20px 0;
}

.current-stage {
  text-align: center;
}

.stage-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 10px 0;
}

.creative-card {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  height: 280px;
  display: flex;
  flex-direction: column;
  transition: all 0.3s;
}

.creative-card:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.creative-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}

.creative-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  border-radius: 4px;
  padding: 12px;
}

.text-content {
  font-size: 14px;
  color: #333;
  line-height: 1.6;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
}

.image-content {
  width: 100%;
  height: 100%;
}

.image-content :deep(.el-image) {
  width: 100%;
  height: 100%;
}

.creative-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e4e7ed;
  font-size: 14px;
  color: #666;
}

.add-creative {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  cursor: pointer;
  border: 2px dashed #dcdfe6;
  background: #fafafa;
}

.add-creative:hover {
  border-color: #409eff;
  background: #ecf5ff;
}

.add-creative span {
  color: #909399;
  font-size: 14px;
}
</style>
