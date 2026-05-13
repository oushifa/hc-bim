/**
 * 代理第三方注册接口
 * 解决浏览器CORS限制问题
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  
  try {
    const response = await fetch('http://10.66.8.185:30080/service/v1/oauth/third-party/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(body)
    })

    const data = await response.json()
    
    return data
  } catch (error) {
    console.error('DTP Register proxy error:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to proxy register request'
    })
  }
})
