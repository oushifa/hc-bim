<template>
  <div
    id="speckle"
    class="bg-foundation-page text-foreground has-[.viewer]:!overflow-hidden has-[.viewer-transparent]:!bg-transparent"
  >
    <NuxtLayout>
      <!--
        页面 KeepAlive：仅缓存团队案例页（WorkgroupCasesPage），保证路由切走后
        其 iframe 不销毁、保持隐藏与三方通信；固定 page-key 使同组件路由参数
        （工作组）切换时复用同一实例（与无缓存行为一致），避免缓存条目错乱。
      -->
      <NuxtPage
        :page-key="'app-page-root'"
        :keepalive="{ include: ['WorkgroupCasesPage'], max: 3 }"
      />
    </NuxtLayout>
    <SingletonManagers />
  </div>
</template>
<script setup lang="ts">
// import { useTheme } from '~~/lib/core/composables/theme'
import { useAuthManager } from '~~/lib/auth/composables/auth'
import { useFixBraveSafariCookies } from '~~/lib/common/composables/reactiveCookie'

// const { isDarkTheme } = useTheme()

useHead({
  // Title suffix
  titleTemplate: (titleChunk) => (titleChunk ? `${titleChunk} | 海创制造` : '海创制造'),
  link: [
    {
      rel: 'icon',
      type: 'image/png',
      href: 'https://siruijie.oss-cn-beijing.aliyuncs.com/test/logo.png'
    }
  ],
  htmlAttrs: {
    // class: computed(() => (isDarkTheme.value ? `dark` : ``)),
    class: computed(() => ``),
    lang: 'zh-CN'
  },
  bodyAttrs: {
    class:
      'bg-foundation-page text-foreground has-[.viewer-transparent]:!bg-transparent'
  }
})

const { watchAuthQueryString } = useAuthManager()
watchAuthQueryString()
useFixBraveSafariCookies()
</script>
<style>
.page-enter-active,
.page-leave-active {
  transition: all 0.1s;
}

.page-enter-from,
.page-leave-to {
  opacity: 0;
}
</style>
