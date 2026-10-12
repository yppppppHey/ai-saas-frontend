import { defineStore } from 'pinia'
import { ref } from 'vue'
import { login as apiLogin, getCurrentUser, logout as apiLogout } from '@/api/auth'

export const useUserStore = defineStore('user', () => {
  const token = ref<string>(localStorage.getItem('token') || '')
  const userInfo = ref<Record<string, any> | null>(JSON.parse(localStorage.getItem('userInfo') || 'null'))

  async function login(account: string, password: string) {
    try {
      const res: any = await apiLogin({ account, password })
      token.value = res.data?.token || res.token || ''
      userInfo.value = res.data?.user || res.user || null
    } catch {
      // 框架演示模式：后端未启动时使用假数据登录，便于预览界面（联调时删除此 catch 分支）
      token.value = 'demo-token-' + Date.now()
      userInfo.value = { id: 1, username: account, account, email: account + '@demo.com' }
    }
    localStorage.setItem('token', token.value)
    localStorage.setItem('userInfo', JSON.stringify(userInfo.value))
    return { data: { token: token.value, user: userInfo.value } }
  }

  async function fetchUserInfo() {
    const res: any = await getCurrentUser()
    userInfo.value = res.data || res
    localStorage.setItem('userInfo', JSON.stringify(userInfo.value))
    return res
  }

  async function logout() {
    try {
      await apiLogout()
    } catch {
      // 忽略退出接口错误
    }
    token.value = ''
    userInfo.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
  }

  return { token, userInfo, login, fetchUserInfo, logout }
})
