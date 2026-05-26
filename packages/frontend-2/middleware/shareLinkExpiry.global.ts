/**
 * 验证分享链接有效期的全局中间件
 * 检查 URL 中的 exp 参数（Unix 时间戳），如果已过期则阻止访问
 */
export default defineNuxtRouteMiddleware((to) => {
  // 只在客户端执行
  if (import.meta.server) return
  
  const expParam = to.query.exp as string | undefined
  
  if (!expParam) {
    // 没有 exp 参数，不需要验证
    return
  }
  
  const expiryTimestamp = parseInt(expParam)
  
  // 如果 exp 为 0，表示永久有效
  if (expiryTimestamp === 0) {
    return
  }
  
  // 获取当前时间戳（秒）
  const currentTimestamp = Math.floor(Date.now() / 1000)
  
  // 检查是否过期
  if (currentTimestamp > expiryTimestamp) {
    // 链接已过期
    const { triggerNotification } = useGlobalToast()
    
    triggerNotification({
      type: ToastNotificationType.Warning,
      title: '分享链接已过期',
      description: '该分享链接已超过有效期限，无法访问。请联系分享者重新生成链接。',
      duration: 5000
    })
    
    // 重定向到首页
    return navigateTo('/')
  }
})
