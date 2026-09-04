<template>
  <div
    class="twin-scene-cases-keeper"
    :class="isCasesRoute && (caseCreateIframeSrc || loadError) ? 'cases-active' : 'cases-hidden'"
    @wheel.stop
    @touchmove.stop
  >
    <iframe
      v-if="caseCreateIframeSrc"
      ref="iframeDomRef"
      :src="caseCreateIframeSrc"
      class="absolute inset-0 h-full w-full border-0"
      title="团队案例"
      frameborder="0"
      allowfullscreen
      @load="onIframeLoad"
    />
    <div
      v-else-if="loadError"
      class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-50"
    >
      <p class="text-body-sm text-foreground-2">团队案例服务连接失败，请稍后重试</p>
      <FormButton size="sm" color="outline" @click="handleRetry">重试</FormButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getDtpUIOrigin } from '~~/composables/useDtpIframeSrc'
import {
  WDP_EDITOR_SCENE_LOADED,
  WDP_EDITOR_SCENE_UNLOADED
} from '~~/composables/useWdpEditorSave'
import { useTwinSceneCasesKeeper } from '~~/composables/useTwinSceneCasesKeeper'

const keeper = useTwinSceneCasesKeeper()
const {
  globalIframeRef,
  caseCreateIframeSrc,
  loadError,
  isEditing,
  iframeInteracted,
  iframeLoaded,
  isCasesRoute,
  loadIframe
} = keeper

const iframeDomRef = ref<HTMLIFrameElement | null>(null)

// 同步 DOM 引用到全局
watch(
  iframeDomRef,
  (el) => {
    globalIframeRef.value = el
  },
  { immediate: true }
)

const onIframeLoad = () => {
  iframeLoaded.value = true
}

const handleRetry = () => {
  void loadIframe(true)
}

// 监听三方场景生命周期事件（iframe → 父页面，见 3.md）
const onWdpMessage = (e: MessageEvent) => {
  const targetOrigin = getDtpUIOrigin()
  if (targetOrigin && e.origin !== targetOrigin) return
  if (e.source !== iframeDomRef.value?.contentWindow) return
  const data = (e.data ?? {}) as { type?: string }
  if (data.type === WDP_EDITOR_SCENE_LOADED) {
    isEditing.value = true
  } else if (data.type === WDP_EDITOR_SCENE_UNLOADED) {
    isEditing.value = false
    iframeInteracted.value = false
  }
}

// 弱信号：点击 iframe 内部时焦点移入 iframe，父窗口触发 blur
const onWindowBlur = () => {
  if (isCasesRoute.value) {
    iframeInteracted.value = true
  }
}

// 编辑中刷新/关闭标签页时由浏览器弹出原生确认框
const onBeforeUnload = (e: BeforeUnloadEvent) => {
  if (!isEditing.value) return
  e.preventDefault()
  e.returnValue = ''
}

onMounted(() => {
  window.addEventListener('message', onWdpMessage)
  window.addEventListener('blur', onWindowBlur)
  window.addEventListener('beforeunload', onBeforeUnload)

  // 若当前页面直接以 cases 路由进入，触发加载
  if (isCasesRoute.value) {
    void loadIframe()
  }
})

onUnmounted(() => {
  window.removeEventListener('message', onWdpMessage)
  window.removeEventListener('blur', onWindowBlur)
  window.removeEventListener('beforeunload', onBeforeUnload)
})

// 监听路由变化：若进入 cases 路由，确保加载（切换 workgroup 时会自动比对重载）
watch(
  isCasesRoute,
  (inCases) => {
    if (inCases) {
      void loadIframe()
    }
  }
)
</script>

<style scoped>
.twin-scene-cases-keeper {
  background-color: #f9fafb;
}

.cases-active {
  position: absolute !important;
  inset: 0 !important;
  width: 100% !important;
  height: 100% !important;
  opacity: 1 !important;
  pointer-events: auto !important;
  visibility: visible !important;
  z-index: 20;
}

.cases-hidden {
  position: fixed !important;
  top: -99999px !important;
  left: -99999px !important;
  width: 1px !important;
  height: 1px !important;
  opacity: 0 !important;
  pointer-events: none !important;
  visibility: hidden !important;
  z-index: -1 !important;
}
</style>
