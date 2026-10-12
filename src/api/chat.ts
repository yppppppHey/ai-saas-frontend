import { request } from './request'

// 会话列表
export function getConversations(params?: Record<string, any>) {
  return request({ url: '/v1/conversations', method: 'get', params })
}

// 创建会话
export function createConversation(data: Record<string, any>) {
  return request({ url: '/v1/conversations', method: 'post', data })
}

// 删除会话
export function deleteConversation(id: string) {
  return request({ url: `/v1/conversations/${id}`, method: 'delete' })
}

// 会话消息列表
export function getMessages(conversationId: string, params?: Record<string, any>) {
  return request({ url: `/v1/messages`, method: 'get', params: { conversationId, ...params } })
}

// 发送消息（非流式）
export function sendMessage(data: Record<string, any>) {
  return request({ url: '/v1/ai-chat/send', method: 'post', data })
}

// 流式对话（SSE）- 使用 fetch + ReadableStream
export function streamChat(
  data: Record<string, any>,
  onMessage: (chunk: string) => void,
  onDone?: () => void,
  onError?: (error: Error) => void,
) {
  const token = localStorage.getItem('token')
  fetch('/api/v1/ai-chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  })
    .then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const chunk = line.slice(6)
            if (chunk === '[DONE]') {
              onDone?.()
              return
            }
            onMessage(chunk)
          }
        }
      }
      onDone?.()
    })
    .catch((error) => onError?.(error))
}

// 中止生成
export function abortChat(taskId: string) {
  return request({ url: `/v1/ai-chat/abort/${taskId}`, method: 'post' })
}

// 提示词模板列表
export function getPromptTemplates(params?: Record<string, any>) {
  return request({ url: '/v1/prompt-templates', method: 'get', params })
}
