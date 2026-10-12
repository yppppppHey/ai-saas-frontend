<template>
  <div class="dashboard">
    <!-- 顶部统计卡片 -->
    <el-row :gutter="20">
      <el-col :span="6" v-for="card in statCards" :key="card.title">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-info">
              <div class="stat-value">{{ card.value }}</div>
              <div class="stat-title">{{ card.title }}</div>
              <div class="stat-trend" :class="card.trend > 0 ? 'up' : 'down'">
                <el-icon><CaretTop v-if="card.trend > 0" /><CaretBottom v-else /></el-icon>
                {{ Math.abs(card.trend) }}% 较上周
              </div>
            </div>
            <div class="stat-icon" :style="{ background: card.bgColor }">
              <el-icon :size="28" :color="card.color"><component :is="card.icon" /></el-icon>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 图表区域 -->
    <el-row :gutter="20" style="margin-top: 20px">
      <!-- Token 用量趋势 -->
      <el-col :span="16">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>Token 用量趋势</span>
              <el-radio-group v-model="trendRange" size="small">
                <el-radio-button label="7">近 7 天</el-radio-button>
                <el-radio-button label="30">近 30 天</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div ref="trendChartRef" class="chart-container" style="height: 300px"></div>
        </el-card>
      </el-col>

      <!-- 任务状态分布 -->
      <el-col :span="8">
        <el-card>
          <template #header>任务状态分布</template>
          <div ref="taskPieRef" class="chart-container" style="height: 300px"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <!-- 模型使用分布 -->
      <el-col :span="8">
        <el-card>
          <template #header>模型调用分布</template>
          <div ref="modelBarRef" class="chart-container" style="height: 280px"></div>
        </el-card>
      </el-col>

      <!-- 最近活动 -->
      <el-col :span="8">
        <el-card>
          <template #header>最近活动</template>
          <el-timeline>
            <el-timeline-item
              v-for="activity in recentActivities"
              :key="activity.id"
              :timestamp="activity.time"
              :type="activity.type"
              :hollow="true"
            >
              <div class="activity-item">
                <span class="activity-title">{{ activity.title }}</span>
                <span class="activity-desc">{{ activity.desc }}</span>
              </div>
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-col>

      <!-- 系统状态 -->
      <el-col :span="8">
        <el-card>
          <template #header>系统状态</template>
          <div class="service-status">
            <div v-for="svc in services" :key="svc.name" class="service-item">
              <div class="service-left">
                <el-icon :color="svc.online ? '#67c23a' : '#f56c6c'">
                  <CircleCheck v-if="svc.online" /><CircleClose v-else />
                </el-icon>
                <span class="service-name">{{ svc.name }}</span>
              </div>
              <el-tag :type="svc.online ? 'success' : 'danger'" size="small">
                {{ svc.online ? '运行中' : '离线' }}
              </el-tag>
            </div>
          </div>
          <el-divider />
          <div class="system-info">
            <div class="info-row"><span>版本</span><span>v1.0.0</span></div>
            <div class="info-row"><span>环境</span><span>开发环境</span></div>
            <div class="info-row"><span>运行时长</span><span>{{ uptime }}</span></div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import { CaretTop, CaretBottom, CircleCheck, CircleClose } from '@element-plus/icons-vue'

// 统计卡片（联调时从 /conversations/stats、/tasks/statistics、/knowledge-bases、/quota 取数）
const statCards = ref([
  { title: '会话总数', value: '1,286', trend: 12.5, icon: 'ChatDotRound', color: '#409eff', bgColor: '#ecf5ff' },
  { title: '任务总数', value: '342', trend: 8.3, icon: 'List', color: '#67c23a', bgColor: '#f0f9eb' },
  { title: '知识库', value: '18', trend: -2.1, icon: 'FolderOpened', color: '#e6a23c', bgColor: '#fdf6ec' },
  { title: '剩余配额', value: '86.4K', trend: 15.7, icon: 'Wallet', color: '#f56c6c', bgColor: '#fef0f0' },
])

const trendRange = ref('7')
const trendChartRef = ref()
const taskPieRef = ref()
const modelBarRef = ref()
let trendChart: echarts.ECharts | null = null
let taskPie: echarts.ECharts | null = null
let modelBar: echarts.ECharts | null = null

// 演示数据（联调时从 /token/statistics/daily 取）
const trendData = {
  '7': {
    dates: ['10/06', '10/07', '10/08', '10/09', '10/10', '10/11', '10/12'],
    tokens: [1200, 1900, 1500, 2800, 2200, 3100, 2600],
    calls: [45, 72, 58, 96, 82, 110, 95],
  },
  '30': {
    dates: Array.from({ length: 30 }, (_, i) => `${String(i + 1).padStart(2, '0')}`),
    tokens: Array.from({ length: 30 }, () => Math.floor(Math.random() * 3000 + 800)),
    calls: Array.from({ length: 30 }, () => Math.floor(Math.random() * 100 + 30)),
  },
}

// 任务状态分布（联调时从 /tasks/statistics 取）
const taskStatusData = [
  { value: 12, name: '运行中', itemStyle: { color: '#409eff' } },
  { value: 256, name: '已完成', itemStyle: { color: '#67c23a' } },
  { value: 18, name: '失败', itemStyle: { color: '#f56c6c' } },
  { value: 8, name: '已取消', itemStyle: { color: '#909399' } },
]

// 模型调用分布（联调时从 /token/statistics/model 取）
const modelData = {
  models: ['GPT-4o', 'DeepSeek-V2', 'GPT-3.5', 'Claude-3', '通义千问'],
  values: [4200, 3100, 2800, 1500, 900],
}

// 最近活动（联调时从 /conversations + /tasks 聚合）
const recentActivities = ref([
  { id: 1, title: '新建对话', desc: '用户发起了一轮新的 AI 对话', time: '2 分钟前', type: 'primary' },
  { id: 2, title: '任务完成', desc: '文档向量化任务 #2841 执行成功', time: '15 分钟前', type: 'success' },
  { id: 3, title: '上传文档', desc: '知识库「产品手册」新增 3 个文档', time: '1 小时前', type: 'warning' },
  { id: 4, title: '配额扣减', desc: '对话消耗 Token 2,840，剩余 86.4K', time: '2 小时前', type: 'info' },
  { id: 5, title: '任务失败', desc: 'RAG 检索任务 #2839 超时，已自动重试', time: '3 小时前', type: 'danger' },
])

// 服务状态（联调时从 /actuator/health + Nacos 取）
const services = ref([
  { name: '网关服务', online: true },
  { name: '用户服务', online: true },
  { name: '对话服务', online: true },
  { name: '任务服务', online: true },
  { name: 'RAG 服务', online: true },
  { name: '计费服务', online: true },
])

const uptime = ref('12 天 6 小时')

function initTrendChart() {
  if (!trendChartRef.value) return
  trendChart = echarts.init(trendChartRef.value)
  updateTrendChart()
}

function updateTrendChart() {
  if (!trendChart) return
  const data = trendData[trendRange.value as keyof typeof trendData]
  trendChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['Token 消耗', '调用次数'], right: 0 },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: data.dates },
    yAxis: [
      { type: 'value', name: 'Token' },
      { type: 'value', name: '次数' },
    ],
    series: [
      {
        name: 'Token 消耗',
        type: 'line',
        smooth: true,
        data: data.tokens,
        areaStyle: { opacity: 0.1 },
        itemStyle: { color: '#409eff' },
      },
      {
        name: '调用次数',
        type: 'line',
        smooth: true,
        yAxisIndex: 1,
        data: data.calls,
        itemStyle: { color: '#67c23a' },
      },
    ],
  })
}

function initTaskPie() {
  if (!taskPieRef.value) return
  taskPie = echarts.init(taskPieRef.value)
  taskPie.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { orient: 'vertical', left: 'left' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
      data: taskStatusData,
    }],
  })
}

function initModelBar() {
  if (!modelBarRef.value) return
  modelBar = echarts.init(modelBarRef.value)
  modelBar.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: modelData.models, axisLabel: { rotate: 20, fontSize: 11 } },
    yAxis: { type: 'value', name: 'Token' },
    series: [{
      type: 'bar',
      data: modelData.values,
      barWidth: '50%',
      itemStyle: {
        borderRadius: [4, 4, 0, 0],
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#83bff6' },
          { offset: 1, color: '#188df0' },
        ]),
      },
    }],
  })
}

function handleResize() {
  trendChart?.resize()
  taskPie?.resize()
  modelBar?.resize()
}

watch(trendRange, () => nextTick(updateTrendChart))

onMounted(() => {
  nextTick(() => {
    initTrendChart()
    initTaskPie()
    initModelBar()
  })
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  trendChart?.dispose()
  taskPie?.dispose()
  modelBar?.dispose()
})
</script>

<style scoped>
.stat-card {
  border-radius: 8px;
}
.stat-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.stat-value {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
}
.stat-title {
  font-size: 14px;
  color: #909399;
  margin-top: 4px;
}
.stat-trend {
  font-size: 12px;
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 2px;
}
.stat-trend.up { color: #67c23a; }
.stat-trend.down { color: #f56c6c; }
.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.chart-container {
  width: 100%;
}
.activity-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.activity-title {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}
.activity-desc {
  font-size: 12px;
  color: #909399;
}
.service-status {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.service-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.service-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.service-name {
  font-size: 14px;
  color: #303133;
}
.system-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.info-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #606266;
}
</style>
