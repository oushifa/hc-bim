# DTP API Fetch 插件

## 概述

这是一个专门用于调用 DTP API 的 Nuxt 插件，位于 `plugins/016-fetchDtp.ts`。

## 功能特性

- ✅ 自动添加 Bearer Token 认证
- ✅ 自动设置 Content-Type 为 application/json
- ✅ 基于环境变量 `NUXT_PUBLIC_DTP_API_ORIGIN` 配置基础URL
- ✅ 统一的错误处理
- ✅ 全局可用 `$dtpFetch`

## 配置

在 `.env` 文件中配置 DTP API 地址：

```env
NUXT_PUBLIC_DTP_API_ORIGIN=http://10.66.8.185:30080/ui
```

## 使用方法

### 在组件中使用

```vue
<script setup lang="ts">
const { $dtpFetch } = useNuxtApp()

// GET 请求
const data = await $dtpFetch('/api/v1/some-endpoint')

// POST 请求
const result = await $dtpFetch('/api/v1/some-endpoint', {
  method: 'POST',
  body: {
    key: 'value'
  }
})
</script>
```

### 实际示例（TwinModel.vue）

```typescript
// 获取用户模型列表
const fetchUserModels = async () => {
  const data = await $dtpFetch('/api/v1/daas/asset/model/personal/list', {
    method: 'POST',
    body: {
      keyword: searchQuery.value || '',
      publishedSet: [true, false],
      hierarchySet: [true, false],
      pageNumber: String(userPagination.pageNumber),
      pageSize: String(userPagination.pageSize)
    }
  })
  
  console.log('用户模型列表接口返回:', data)
}

// 获取官方模型列表
const fetchOfficialModels = async () => {
  const data = await $dtpFetch('/api/v1/daas/asset/model/official/list', {
    method: 'POST',
    body: {
      keyword: searchQuery.value || '',
      publishedSet: [true, false],
      categoryIdSet: [135],
      pageNumber: officialPagination.pageNumber,
      pageSize: officialPagination.pageSize
    }
  })
  
  console.log('官方模型列表接口返回:', data)
}
```

## 插件实现细节

插件会自动：
1. 从 `useRuntimeConfig()` 获取 `dtpApiOrigin`
2. 创建 `$fetch.create()` 实例，设置 `baseURL`
3. 在 `onRequest` 钩子中：
   - 设置 `Content-Type: application/json`
   - 从 `useAuthCookie()` 获取认证token
   - 添加 `Authorization: Bearer ${token}` 请求头
4. 在 `onResponseError` 钩子中处理错误

## 注意事项

- 如果 `NUXT_PUBLIC_DTP_API_ORIGIN` 未配置或为空，插件会返回默认的 `$fetch` 实例
- URL 路径会自动拼接 `baseURL` + 相对路径
- 认证token从 `useAuthCookie()` composable 自动获取
- 所有请求默认使用 POST 方法（根据实际需求可在调用时指定）

## 相关文件

- 插件文件：`plugins/016-fetchDtp.ts`
- 环境变量：`.env` 中的 `NUXT_PUBLIC_DTP_API_ORIGIN`
- Composable：`composables/env.ts` 中的 `useDtpApiOrigin()`
- 使用示例：`components/Model/TwinModel.vue`
