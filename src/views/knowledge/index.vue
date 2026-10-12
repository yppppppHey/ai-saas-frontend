<template>
  <div class="knowledge-page">
    <el-container class="kb-container">
      <!-- 左侧：知识库列表 -->
      <el-aside width="280px" class="kb-list">
        <div class="list-header">
          <span class="list-title">知识库</span>
          <el-button type="primary" size="small" :icon="Plus" circle @click="showCreateDialog = true" />
        </div>
        <el-scrollbar>
          <div
            v-for="kb in knowledgeBases"
            :key="kb.id"
            class="kb-item"
            :class="{ active: currentKbId === kb.id }"
            @click="selectKb(kb)"
          >
            <div class="kb-icon" :style="{ background: kb.color }">
              <el-icon color="#fff"><FolderOpened /></el-icon>
            </div>
            <div class="kb-info">
              <div class="kb-name">{{ kb.name }}</div>
              <div class="kb-meta">{{ kb.documentCount }} 文档 · {{ kb.chunkCount }} 切片</div>
            </div>
          </div>
          <el-empty v-if="knowledgeBases.length === 0" description="暂无知识库" :image-size="60" />
        </el-scrollbar>
      </el-aside>

      <!-- 右侧：主内容区 -->
      <el-main class="kb-main">
        <template v-if="currentKbId">
          <!-- 知识库信息栏 -->
          <div class="kb-header">
            <div class="kb-title-area">
              <h2>{{ currentKb?.name }}</h2>
              <p class="kb-desc">{{ currentKb?.description || '暂无描述' }}</p>
            </div>
            <div class="kb-stats">
              <div class="stat-item">
                <div class="stat-num">{{ currentKb?.documentCount || 0 }}</div>
                <div class="stat-label">文档</div>
              </div>
              <div class="stat-item">
                <div class="stat-num">{{ currentKb?.chunkCount || 0 }}</div>
                <div class="stat-label">切片</div>
              </div>
              <div class="stat-item">
                <div class="stat-num">{{ currentKb?.totalChars || 0 }}</div>
                <div class="stat-label">字符数</div>
              </div>
            </div>
          </div>

          <!-- Tab 切换 -->
          <el-tabs v-model="activeTab" class="kb-tabs">
            <!-- 文档管理 -->
            <el-tab-pane label="文档管理" name="docs">
              <div class="toolbar">
                <el-upload
                  :auto-upload="false"
                  :show-file-list="false"
                  :on-change="handleFileUpload"
                  accept=".pdf,.doc,.docx,.txt,.md,.html"
                >
                  <el-button type="primary" :icon="Upload">上传文档</el-button>
                </el-upload>
                <el-input v-model="searchKeyword" placeholder="搜索文档名" style="width: 200px" clearable />
                <span class="upload-hint">支持 PDF / Word / TXT / Markdown / HTML，单文件不超过 50MB</span>
              </div>

              <el-table :data="filteredDocuments" v-loading="loading" stripe>
                <el-table-column prop="name" label="文件名" min-width="200">
                  <template #default="{ row }">
                    <div class="doc-name-cell">
                      <el-tag :type="docTypeColor(row.docType)" size="small" style="margin-right: 8px">{{ row.docType }}</el-tag>
                      <span>{{ row.name }}</span>
                    </div>
                  </template>
                </el-table-column>
                <el-table-column prop="size" label="大小" width="100" />
                <el-table-column prop="charCount" label="字符数" width="100" />
                <el-table-column prop="chunkCount" label="切片数" width="90" />
                <el-table-column label="处理状态" width="160">
                  <template #default="{ row }">
                    <div v-if="row.status === 'PROCESSING'" class="progress-cell">
                      <el-progress :percentage="row.progress || 0" :stroke-width="8" :text-inside="true" />
                    </div>
                    <el-tag v-else :type="row.status === 'READY' ? 'success' : row.status === 'FAILED' ? 'danger' : 'warning'" size="small">
                      {{ statusText(row.status) }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="createdAt" label="上传时间" width="160" />
                <el-table-column label="操作" width="180" fixed="right">
                  <template #default="{ row }">
                    <el-button type="primary" size="small" link @click="viewChunks(row)">切片</el-button>
                    <el-button type="warning" size="small" link :disabled="row.status === 'PROCESSING'" @click="reprocess(row)">重新处理</el-button>
                    <el-button type="danger" size="small" link @click="deleteDoc(row)">删除</el-button>
                  </template>
                </el-table-column>
              </el-table>
              <el-empty v-if="filteredDocuments.length === 0 && !loading" description="暂无文档，点击上方按钮上传" />
            </el-tab-pane>

            <!-- 检索测试 -->
            <el-tab-pane label="检索测试" name="search">
              <div class="search-test">
                <div class="search-input-area">
                  <el-input
                    v-model="searchQuery"
                    type="textarea"
                    :rows="2"
                    placeholder="输入问题，测试从当前知识库检索相关片段"
                    @keyup.enter.ctrl="runSearch"
                  />
                  <div class="search-actions">
                    <span class="hint">Ctrl + Enter 检索</span>
                    <el-button type="primary" :icon="Search" :loading="searching" @click="runSearch">检索</el-button>
                  </div>
                </div>

                <div v-if="searchResults.length > 0" class="search-results">
                  <div class="results-header">检索到 {{ searchResults.length }} 个相关片段</div>
                  <div v-for="(item, idx) in searchResults" :key="idx" class="result-item">
                    <div class="result-header">
                      <el-tag size="small">片段 #{{ item.chunkIndex }}</el-tag>
                      <span class="result-source">{{ item.documentTitle }}</span>
                      <span class="result-score">相似度 {{ (item.score * 100).toFixed(1) }}%</span>
                    </div>
                    <div class="result-content">{{ item.content }}</div>
                    <div class="result-meta">字符数 {{ item.charCount }} · Token {{ item.tokenCount }}</div>
                  </div>
                </div>
                <el-empty v-else-if="!searching" description="输入问题后点击检索，查看 RAG 检索效果" />
              </div>
            </el-tab-pane>
          </el-tabs>
        </template>

        <el-empty v-else description="请先选择或创建一个知识库" style="margin-top: 120px" />
      </el-main>
    </el-container>

    <!-- 新建知识库对话框 -->
    <el-dialog v-model="showCreateDialog" title="新建知识库" width="420px">
      <el-form :model="newKbForm" label-width="80px">
        <el-form-item label="名称">
          <el-input v-model="newKbForm.name" placeholder="如：产品手册、客服FAQ" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="newKbForm.description" type="textarea" :rows="2" placeholder="简要描述这个知识库的用途" />
        </el-form-item>
        <el-form-item label="Embedding">
          <el-select v-model="newKbForm.embeddingModel" style="width: 100%">
            <el-option label="text-embedding-3-small" value="text-embedding-3-small" />
            <el-option label="text-embedding-3-large" value="text-embedding-3-large" />
            <el-option label="BGE-large-zh" value="bge-large-zh" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="createKb">创建</el-button>
      </template>
    </el-dialog>

    <!-- 文档切片详情抽屉 -->
    <el-drawer v-model="showChunksDrawer" title="文档切片详情" size="50%">
      <div v-if="currentDoc" class="chunks-info">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="文件名">{{ currentDoc.name }}</el-descriptions-item>
          <el-descriptions-item label="类型">{{ currentDoc.docType }}</el-descriptions-item>
          <el-descriptions-item label="字符数">{{ currentDoc.charCount }}</el-descriptions-item>
          <el-descriptions-item label="切片数">{{ currentDoc.chunkCount }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ statusText(currentDoc.status) }}</el-descriptions-item>
          <el-descriptions-item label="上传时间">{{ currentDoc.createdAt }}</el-descriptions-item>
        </el-descriptions>
      </div>
      <el-divider />
      <div class="chunks-list">
        <div v-for="chunk in currentChunks" :key="chunk.id" class="chunk-item">
          <div class="chunk-header">
            <el-tag size="small" type="primary">切片 #{{ chunk.chunkIndex }}</el-tag>
            <span class="chunk-meta">{{ chunk.charCount }} 字符 · {{ chunk.tokenCount }} Token</span>
          </div>
          <div class="chunk-content">{{ chunk.content }}</div>
        </div>
        <el-empty v-if="currentChunks.length === 0" description="暂无切片数据" />
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Upload, FolderOpened, Search } from '@element-plus/icons-vue'
import { getKnowledgeBases, createKnowledgeBase, getDocuments, uploadDocument, deleteDocument } from '@/api/rag'

const knowledgeBases = ref<any[]>([])
const documents = ref<any[]>([])
const currentKbId = ref('')
const currentKb = ref<any>(null)
const loading = ref(false)
const activeTab = ref('docs')
const searchKeyword = ref('')
const showCreateDialog = ref(false)
const showChunksDrawer = ref(false)
const currentDoc = ref<any>(null)
const currentChunks = ref<any[]>([])
const searching = ref(false)
const searchQuery = ref('')
const searchResults = ref<any[]>([])

const newKbForm = reactive({ name: '', description: '', embeddingModel: 'text-embedding-3-small' })

const filteredDocuments = computed(() => {
  if (!searchKeyword.value) return documents.value
  return documents.value.filter((d: any) => d.name.includes(searchKeyword.value))
})

const colors = ['#409eff', '#67c23a', '#e6a23c', '#f56c6c', '#909399', '#8e44ad']

async function loadKbList() {
  try {
    // 框架：联调时启用
    // const res: any = await getKnowledgeBases()
    // knowledgeBases.value = res.data || res.records || []
  } catch {
    // 错误已处理
  }
}

async function selectKb(kb: any) {
  currentKbId.value = kb.id
  currentKb.value = kb
  loading.value = true
  try {
    // const res: any = await getDocuments(kb.id)
    // documents.value = res.data || res.records || []
  } catch {
    // 错误已处理
  } finally {
    loading.value = false
  }
}

async function createKb() {
  if (!newKbForm.name) {
    ElMessage.warning('请输入知识库名称')
    return
  }
  try {
    // await createKnowledgeBase(newKbForm)
    ElMessage.success('创建成功（框架占位）')
    showCreateDialog.value = false
    newKbForm.name = ''
    newKbForm.description = ''
    loadKbList()
  } catch {
    // 错误已处理
  }
}

async function handleFileUpload(file: any) {
  if (!currentKbId.value) return
  try {
    // await uploadDocument(currentKbId.value, file.raw)
    ElMessage.success(`已上传 ${file.name}，正在处理...（框架占位）`)
    if (currentKb.value) selectKb(currentKb.value)
  } catch {
    // 错误已处理
  }
}

async function deleteDoc(row: any) {
  await ElMessageBox.confirm(`确定删除文档 ${row.name}？删除后切片和向量数据将一并清除。`, '提示', { type: 'warning' })
  try {
    // await deleteDocument(currentKbId.value, row.id)
    ElMessage.success('删除成功（框架占位）')
    if (currentKb.value) selectKb(currentKb.value)
  } catch {
    // 错误已处理
  }
}

function reprocess(row: any) {
  ElMessage.info(`文档 ${row.name} 重新处理中...（框架占位）`)
}

function viewChunks(row: any) {
  currentDoc.value = row
  // 框架：联调时从 /documents/{docId}/chunks 取切片列表
  currentChunks.value = []
  showChunksDrawer.value = true
}

async function runSearch() {
  if (!searchQuery.value.trim()) {
    ElMessage.warning('请输入检索问题')
    return
  }
  searching.value = true
  try {
    // const res: any = await ragSearch({ kbId: currentKbId.value, query: searchQuery.value, topK: 5 })
    // searchResults.value = res.data || []
    // 演示占位
    searchResults.value = [
      { chunkIndex: 3, documentTitle: '产品手册.pdf', score: 0.92, content: '本产品支持多模型切换，用户可在设置中选择默认模型，系统会根据模型可用性自动降级。', charCount: 86, tokenCount: 42 },
      { chunkIndex: 7, documentTitle: '产品手册.pdf', score: 0.87, content: 'API 调用采用 Token 计费模式，输入和输出分别计费，配额不足时自动拦截请求。', charCount: 72, tokenCount: 36 },
      { chunkIndex: 1, documentTitle: 'FAQ.md', score: 0.78, content: '常见问题：如何重置密码？点击登录页「忘记密码」，通过邮箱验证码重置。', charCount: 58, tokenCount: 29 },
    ]
  } catch {
    // 错误已处理
  } finally {
    searching.value = false
  }
}

function docTypeColor(type: string) {
  const map: Record<string, string> = { PDF: 'danger', DOC: 'primary', DOCX: 'primary', TXT: 'info', MD: 'success', HTML: 'warning' }
  return map[type?.toUpperCase()] || 'info'
}

function statusText(status: string) {
  const map: Record<string, string> = { PENDING: '等待处理', PROCESSING: '处理中', READY: '已完成', FAILED: '失败' }
  return map[status] || status
}

onMounted(() => {
  // 演示数据
  knowledgeBases.value = [
    { id: '1', name: '产品手册', description: '产品功能说明与使用指南', documentCount: 12, chunkCount: 386, totalChars: 128400, color: colors[0] },
    { id: '2', name: '客服 FAQ', description: '常见问题与标准答案', documentCount: 8, chunkCount: 152, totalChars: 45600, color: colors[1] },
    { id: '3', name: '技术文档', description: 'API 接口文档与架构说明', documentCount: 15, chunkCount: 524, totalChars: 186000, color: colors[2] },
    { id: '4', name: '合同模板', description: '各类合同模板与条款', documentCount: 6, chunkCount: 98, totalChars: 32000, color: colors[3] },
  ]
  documents.value = [
    { id: '1', name: '产品功能介绍.pdf', docType: 'PDF', size: '2.4 MB', charCount: 28600, chunkCount: 86, status: 'READY', progress: 100, createdAt: '2026-10-10 14:30' },
    { id: '2', name: '使用指南.docx', docType: 'DOCX', size: '1.8 MB', charCount: 22400, chunkCount: 68, status: 'READY', progress: 100, createdAt: '2026-10-10 15:20' },
    { id: '3', name: 'API 接口文档.md', docType: 'MD', size: '156 KB', charCount: 45200, chunkCount: 142, status: 'PROCESSING', progress: 65, createdAt: '2026-10-12 10:15' },
    { id: '4', name: '常见问题.txt', docType: 'TXT', size: '89 KB', charCount: 12800, chunkCount: 38, status: 'READY', progress: 100, createdAt: '2026-10-11 09:00' },
    { id: '5', name: '架构设计.pdf', docType: 'PDF', size: '3.2 MB', charCount: 35600, chunkCount: 0, status: 'FAILED', progress: 0, createdAt: '2026-10-12 11:30' },
  ]
})
</script>

<style scoped>
.kb-container {
  height: calc(100vh - 100px);
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
}
.kb-list {
  border-right: 1px solid #e4e7ed;
  background: #fafafa;
}
.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid #e4e7ed;
}
.list-title {
  font-size: 15px;
  font-weight: 600;
}
.kb-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  margin: 4px 8px;
  border-radius: 6px;
}
.kb-item:hover { background: #f0f2f5; }
.kb-item.active { background: #ecf5ff; }
.kb-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.kb-info { flex: 1; overflow: hidden; }
.kb-name {
  font-size: 14px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.kb-meta { font-size: 12px; color: #909399; margin-top: 2px; }
.kb-main { padding: 0; display: flex; flex-direction: column; }
.kb-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px 24px;
  border-bottom: 1px solid #e4e7ed;
}
.kb-title-area h2 { margin: 0 0 4px; font-size: 20px; }
.kb-desc { margin: 0; color: #909399; font-size: 13px; }
.kb-stats { display: flex; gap: 32px; }
.stat-item { text-align: center; }
.stat-num { font-size: 24px; font-weight: 600; color: #409eff; }
.stat-label { font-size: 12px; color: #909399; margin-top: 2px; }
.kb-tabs { padding: 0 24px; flex: 1; overflow: hidden; }
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.upload-hint { font-size: 12px; color: #909399; margin-left: auto; }
.doc-name-cell { display: flex; align-items: center; }
.progress-cell { width: 120px; }
.search-test { padding: 0; }
.search-input-area {
  background: #f5f7fa;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 20px;
}
.search-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  margin-top: 10px;
}
.hint { font-size: 12px; color: #909399; }
.search-results { display: flex; flex-direction: column; gap: 12px; }
.results-header { font-size: 14px; color: #606266; margin-bottom: 4px; }
.result-item {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 14px 16px;
}
.result-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.result-source { font-size: 13px; color: #606266; }
.result-score { font-size: 12px; color: #409eff; margin-left: auto; }
.result-content {
  font-size: 14px;
  line-height: 1.6;
  color: #303133;
  background: #f5f7fa;
  padding: 10px 12px;
  border-radius: 4px;
}
.result-meta { font-size: 12px; color: #909399; margin-top: 6px; }
.chunks-info { margin-bottom: 16px; }
.chunks-list { display: flex; flex-direction: column; gap: 12px; max-height: 60vh; overflow-y: auto; }
.chunk-item {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 12px 14px;
}
.chunk-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.chunk-meta { font-size: 12px; color: #909399; }
.chunk-content {
  font-size: 13px;
  line-height: 1.6;
  color: #303133;
  background: #f5f7fa;
  padding: 8px 10px;
  border-radius: 4px;
}
</style>
