import { request } from './request'

// 获取用户资料
export function getUserProfile() {
  return request({ url: '/user/profile', method: 'get' })
}

// 更新用户资料
export function updateUserProfile(data: Record<string, any>) {
  return request({ url: '/user/profile', method: 'put', data })
}

// 修改密码
export function changePassword(data: { oldPassword: string; newPassword: string; confirmPassword: string }) {
  return request({ url: '/user/password', method: 'put', data })
}

// 上传头像
export function uploadAvatar(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return request({ url: '/user/avatar', method: 'post', data: formData, headers: { 'Content-Type': 'multipart/form-data' } })
}
