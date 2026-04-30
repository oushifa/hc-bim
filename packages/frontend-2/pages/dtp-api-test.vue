<template>
  <div class="p-6 max-w-4xl mx-auto">
    <h1 class="text-2xl font-bold mb-6">DTP API 测试</h1>

    <!-- 测试区域 -->
    <div class="space-y-4">
      <!-- 测试按钮 -->
      <div class="flex gap-4">
        <button
          class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          :disabled="loading"
          @click="testDtpApi"
        >
          {{ loading ? '请求中...' : '测试 DTP API' }}
        </button>

        <button
          class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
          @click="clearResults"
        >
          清除结果
        </button>
      </div>

      <!-- API 信息 -->
      <div class="bg-gray-50 p-4 rounded-lg">
        <h2 class="text-lg font-semibold mb-2">API 配置信息</h2>
        <p class="text-sm text-gray-600 mb-2">
          <span class="font-medium">DTP API Origin:</span>
          <code class="ml-2 bg-gray-200 px-2 py-1 rounded">{{ dtpApiOrigin }}</code>
        </p>
        <p class="text-sm text-gray-600">
          <span class="font-medium">认证状态:</span>
          <span
            class="ml-2 px-2 py-1 rounded text-xs font-semibold"
            :class="authToken ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'"
          >
            {{ authToken ? '已登录 (有 Token)' : '未登录 (无 Token)' }}
          </span>
        </p>
        <p v-if="authToken" class="text-xs text-gray-500 mt-1">
          Token: {{ authToken.substring(0, 20) }}...
        </p>
      </div>

      <!-- 请求示例 -->
      <div class="bg-gray-50 p-4 rounded-lg">
        <h2 class="text-lg font-semibold mb-2">请求示例代码</h2>
        <pre class="text-xs bg-gray-800 text-gray-100 p-3 rounded overflow-x-auto">
// 方式1: 使用 $dtpFetch (推荐)
const { $dtpFetch } = useNuxtApp()
const data = await $dtpFetch('/api/endpoint')

// 方式2: 使用 useDtpApiOrigin
const dtpApiOrigin = useDtpApiOrigin()
const data = await $fetch(`${dtpApiOrigin}/api/endpoint`)</pre>
      </div>

      <!-- 请求参数输入 -->
      <div class="bg-white border border-gray-200 p-4 rounded-lg">
        <h2 class="text-lg font-semibold mb-3">自定义请求</h2>
        <div class="space-y-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              API 路径
            </label>
            <input
              v-model="apiPath"
              type="text"
              placeholder="/api/test 或完整 URL"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              请求方法
            </label>
            <select
              v-model="method"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>

          <div v-if="method !== 'GET'">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              请求体 (JSON)
            </label>
            <textarea
              v-model="requestBody"
              rows="4"
              placeholder='{"key": "value"}'
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
          </div>

          <div>
            <label class="flex items-center space-x-2">
              <input
                v-model="useManualToken"
                type="checkbox"
                class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span class="text-sm font-medium text-gray-700">使用自定义 Token</span>
            </label>
          </div>

          <div v-if="useManualToken">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Authorization Token
            </label>
            <input
              v-model="manualToken"
              type="text"
              placeholder="Bearer token"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
          </div>

          <button
            class="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition disabled:opacity-50"
            :disabled="loading || !apiPath"
            @click="customRequest"
          >
            {{ loading ? '请求中...' : '发送请求' }}
          </button>
        </div>
      </div>

      <!-- 结果显示 -->
      <div v-if="result" class="bg-white border border-gray-200 p-4 rounded-lg">
        <h2 class="text-lg font-semibold mb-3">响应结果</h2>

        <!-- 状态信息 -->
        <div class="mb-3">
          <span
            class="inline-block px-3 py-1 text-sm font-semibold rounded"
            :class="success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
          >
            {{ success ? '成功' : '失败' }}
          </span>
          <span v-if="statusCode" class="ml-2 text-sm text-gray-600">
            状态码: {{ statusCode }}
          </span>
          <span v-if="responseTime" class="ml-2 text-sm text-gray-600">
            响应时间: {{ responseTime }}ms
          </span>
        </div>

        <!-- 响应内容 -->
        <pre
          class="text-xs bg-gray-800 text-gray-100 p-3 rounded overflow-x-auto max-h-96"
        >{{ result }}</pre>
      </div>

      <!-- 错误显示 -->
      <div v-if="error" class="bg-red-50 border border-red-200 p-4 rounded-lg">
        <h2 class="text-lg font-semibold mb-2 text-red-800">错误信息</h2>
        <pre class="text-xs text-red-700 overflow-x-auto">{{ error }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthCookie } from '~~/lib/auth/composables/auth'

useHead({
  title: 'DTP API 测试'
})

definePageMeta({
  layout: 'default'
})

const dtpApiOrigin = useDtpApiOrigin()
const { $dtpFetch } = useNuxtApp()
const authToken = useAuthCookie()

const loading = ref(false)
const result = ref<string | null>(null)
const error = ref<string | null>(null)
const success = ref(false)
const statusCode = ref<number | null>(null)
const responseTime = ref<number | null>(null)

// 自定义请求参数
const apiPath = ref('')
const method = ref('GET')
const requestBody = ref('')
const manualToken = ref('')
const useManualToken = ref(false)

const testDtpApi = async () => {
  loading.value = true
  error.value = null
  result.value = null
  const startTime = Date.now()

  try {
    // 测试请求 - 你可以根据实际 API 调整路径
    const data = await $dtpFetch('/health', {
      method: 'GET'
    })

    responseTime.value = Date.now() - startTime
    success.value = true
    statusCode.value = 200
    result.value = JSON.stringify(data, null, 2)
  } catch (err: any) {
    responseTime.value = Date.now() - startTime
    success.value = false
    statusCode.value = err.response?.status || 0
    error.value = err.message || '请求失败'
    result.value = err.data ? JSON.stringify(err.data, null, 2) : null
  } finally {
    loading.value = false
  }
}

const customRequest = async () => {
  if (!apiPath.value) return

  loading.value = true
  error.value = null
  result.value = null
  const startTime = Date.now()

  try {
    let url = apiPath.value

    // 如果不是完整 URL，则使用 baseURL
    if (!url.startsWith('http')) {
      url = url.startsWith('/') ? url : `/${url}`
    }

    const options: any = {
      method: method.value
    }

    // 添加请求体（非 GET 请求）
    if (method.value !== 'GET' && requestBody.value) {
      try {
        options.body = JSON.parse(requestBody.value)
      } catch {
        error.value = '请求体 JSON 格式错误'
        loading.value = false
        return
      }
    }

    // 如果使用了手动 Token，添加到 headers
    if (useManualToken.value && manualToken.value) {
      options.headers = {
        Authorization: `Bearer ${manualToken.value}`
      }
    }

    const data = await $dtpFetch(url, options)

    responseTime.value = Date.now() - startTime
    success.value = true
    statusCode.value = 200
    result.value = JSON.stringify(data, null, 2)
  } catch (err: any) {
    responseTime.value = Date.now() - startTime
    success.value = false
    statusCode.value = err.response?.status || 0
    error.value = err.message || '请求失败'
    result.value = err.data ? JSON.stringify(err.data, null, 2) : null
  } finally {
    loading.value = false
  }
}

const clearResults = () => {
  result.value = null
  error.value = null
  success.value = false
  statusCode.value = null
  responseTime.value = null
}
</script>
