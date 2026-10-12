import { request } from './request'

// 配额信息
export function getQuota() {
  return request({ url: '/quota', method: 'get' })
}

// Token 用量统计
export function getTokenUsage(params?: Record<string, any>) {
  return request({ url: '/v1/token/usage', method: 'get', params })
}

// 计费记录
export function getBillingRecords(params?: Record<string, any>) {
  return request({ url: '/v1/billing/records', method: 'get', params })
}

// VIP 信息
export function getVipInfo() {
  return request({ url: '/vip/info', method: 'get' })
}
