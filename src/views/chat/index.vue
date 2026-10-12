<template>
  <div class="chat-page">
    <el-container class="chat-container">
      <!-- 会话列表 -->
      <el-aside width="260px" class="conversation-list">
        <div class="list-header">
          <el-button type="primary" size="small" :icon="Plus" @click="createConversation">新建对话</el-button>
        </div>
        <el-scrollbar>
          <div
            v-for="conv in conversations"
            :key="conv.id"
            class="conversation-item"
            :class="{ active: currentConversationId === conv.id }"
            @click="selectConversation(conv)"
          >
            <el-icon><ChatDotRound /></el-icon>
            <span class="conv-title">{{ conv.title || '新对话' }}</span>
          </div>
          <el-empty v-if="conversations.length === 0" description="暂无对话" :image-size="60" />
        </el-scrollbar>
      </el-aside>

      <!-- 对话主区域 -->
      <el-main class="chat-main">
        <el-scrollbar ref="messageScrollRef" class="message-list">
          <div v-for="msg in messages" :key="msg.id" class="message-item" :class="msg.role">
            <div class="message-avatar">
              <el-avatar :size="36" :icon="msg.role === 'user' ? User : Service" />
            </div>
            <div class="message-content">
              <div class="message-bubble">{{ msg.content }}</div>
            </div>
          </div>
          <div v-if="messages.length === 0" class="empty-chat">
            <el-icon :size="64" color="#c0c4cc"><ChatDotRound /></el-icon>
            <p>开始与 AI 对话吧</p>
          </div>
        </el-scrollbar>

        <!-- 输入区 -->
        <div class="input-area">
          <el-input
            v-model="inputText"
            type="textarea"
            :rows="2"
            placeholder="输入消息，Enter 发送，Shift+Enter 换行"
            @keydown.enter.exact.prevent="sendMessage"
          />
          <div class="input-actions">
            <el-button :icon="CircleClose" :disabled="!isStreaming" @click="abortGeneration">停止</el-button>
            <el-button type="primary" :icon="Promotion" :loading="isStreaming" @click="sendMessage">发送</el-button>
          </div>
        </div>
      </el-main>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, ChatDotRound, User, Service, CircleClose, Promotion } from '@element-plus/icons-vue'
import { streamChat, createConversation as apiCreateConversation } from '@/api/chat'

const conversations = ref<any[]>([])
const currentConversationId = ref<string>('')
const messages = ref<any[]>([])
const inputText = ref('')
const isStreaming = ref(false)
const messageScrollRef = ref()

async function createConversation() {
  // 框架：联调时调用 API
  ElMessage.info('新建对话功能待联调')
}

function selectConversation(conv: any) {
  currentConversationId.value = conv.id
  // 框架：联调时加载消息列表
}

async function sendMessage() {
  if (!inputText.value.trim()) return
  if (isStreaming.value) return

  const userMsg = { id: Date.now().toString(), role: 'user', content: inputText.value }
  messages.value.push(userMsg)
  const question = inputText.value
  inputText.value = ''
  isStreaming.value = true

  const aiMsg = { id: (Date.now() + 1).toString(), role: 'assistant', content: '' }
  messages.value.push(aiMsg)

  // 框架：SSE 流式调用（联调时启用）
  // streamChat(
  //   { conversationId: currentConversationId.value, message: question },
  //   (chunk) => { aiMsg.content += chunk; scrollToBottom() },
  //   () => { isStreaming.value = false },
  //   (error) => { ElMessage.error('生成失败'); isStreaming.value = false },
  // )

  // 演示占位
  setTimeout(() => {
    aiMsg.content = '（这是前端框架占位，联调后将展示真实 AI 流式回复）'
    isStreaming.value = false
    scrollToBottom()
  }, 500)

  scrollToBottom()
}

function abortGeneration() {
  isStreaming.value = false
  ElMessage.info('已停止生成')
}

function scrollToBottom() {
  nextTick(() => {
    const scrollbar = messageScrollRef.value
    if (scrollbar) {
      scrollbar.scrollTop = scrollbar.scrollHeight
    }
  })
}
</script>

<style scoped>
.chat-page {
  height: calc(100vh - 100px);
}
.chat-container {
  height: 100%;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
}
.conversation-list {
  border-right: 1px solid #e4e7ed;
  background: #fafafa;
}
.list-header {
  padding: 12px;
  border-bottom: 1px solid #e4e7ed;
}
.conversation-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  cursor: pointer;
  border-radius: 4px;
  margin: 4px 8px;
}
.conversation-item:hover {
  background: #f0f2f5;
}
.conversation-item.active {
  background: #ecf5ff;
  color: #409eff;
}
.conv-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
}
.chat-main {
  display: flex;
  flex-direction: column;
  padding: 0;
}
.message-list {
  flex: 1;
  padding: 20px;
}
.message-item {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}
.message-item.user {
  flex-direction: row-reverse;
}
.message-bubble {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 8px;
  background: #f5f7fa;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}
.message-item.user .message-bubble {
  background: #409eff;
  color: #fff;
}
.empty-chat {
  text-align: center;
  padding-top: 120px;
  color: #c0c4cc;
}
.input-area {
  border-top: 1px solid #e4e7ed;
  padding: 16px 20px;
}
.input-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}
</style>
