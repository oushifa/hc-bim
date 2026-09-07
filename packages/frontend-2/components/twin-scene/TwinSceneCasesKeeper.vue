<template>
  <div
    class="twin-scene-cases-keeper overflow-hidden"
    :style="containerStyle"
    @wheel.stop
    @touchmove.stop
  >
    <iframe
      v-if="caseCreateIframeSrc"
      ref="iframeDomRef"
      :src="caseCreateIframeSrc"
      class="h-full w-full border-0"
      title="团队案例"
      frameborder="0"
      allowfullscreen
      @load="onIframeLoad"
    />
    <div
      v-else-if="loadError"
      class="flex h-full w-full flex-col items-center justify-center gap-3 bg-gray-50"
    >
      <p class="text-body-sm text-foreground-2">团队案例服务连接失败，请稍后重试</p>
      <FormButton size="sm" color="outline" @click="handleRetry">重试</FormButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CSSProperties } from 'vue'
import { getDtpUIOrigin } from '~~/composables/useDtpIframeSrc'
import {
  WDP_EDITOR_SCENE_LOADED,
  WDP_EDITOR_SCENE_UNLOADED
} from '~~/composables/useWdpEditorSave'
import {
  useTwinSceneCasesKeeper,
  isDtpDebugEnabled,
  dtpDebugLog
} from '~~/composables/useTwinSceneCasesKeeper'

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

/** 调试日志开关：localStorage['hc-bim-dtp-debug'] = '1' 开启 */
const dtpDebug = isDtpDebugEnabled()

const iframeDomRef = ref<HTMLIFrameElement | null>(null)
const anchorRect = ref({ top: 0, left: 0, width: 0, height: 0 })
let resizeObserver: ResizeObserver | null = null
let rafId: number | null = null

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
  if (dtpDebug) dtpDebugLog('[cases-keeper] iframe loaded')
}

const handleRetry = () => {
  void loadIframe(true)
}

// 更新浮动定位坐标，吸附至页面中的占位符
const updatePosition = () => {
  if (!isCasesRoute.value) return
  const anchor = document.getElementById('twin-scene-cases-portal-anchor')
  if (anchor) {
    const rect = anchor.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) {
      anchorRect.value = {
        top: Math.round(rect.top),
        left: Math.round(rect.left),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      }
    }
  }
}

const bindAnchor = () => {
  if (!isCasesRoute.value) return
  const anchor = document.getElementById('twin-scene-cases-portal-anchor')
  if (anchor) {
    updatePosition()
    if (resizeObserver) {
      resizeObserver.disconnect()
    }
    resizeObserver = new ResizeObserver(() => {
      updatePosition()
    })
    resizeObserver.observe(anchor)
  } else {
    // 若页面刚切换，DOM 节点尚未渲染，则在下一帧继续查找
    rafId = requestAnimationFrame(bindAnchor)
  }
}

const unbindAnchor = () => {
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  anchorRect.value = { top: 0, left: 0, width: 0, height: 0 }
}

// 动态样式：在 cases 路由时 fixed 贴合并覆盖占位区；离开时移至视口外安全保活
const containerStyle = computed<CSSProperties>(() => {
  const isVisible =
    isCasesRoute.value && (Boolean(caseCreateIframeSrc.value) || loadError.value)

  if (!isVisible || anchorRect.value.width === 0) {
    return {
      position: 'fixed',
      top: '-99999px',
      left: '-99999px',
      width: '1px',
      height: '1px',
      opacity: 0,
      pointerEvents: 'none',
      visibility: 'hidden',
      zIndex: -1
    }
  }

  return {
    position: 'fixed',
    top: `${anchorRect.value.top}px`,
    left: `${anchorRect.value.left}px`,
    width: `${anchorRect.value.width}px`,
    height: `${anchorRect.value.height}px`,
    opacity: 1,
    pointerEvents: 'auto',
    visibility: 'visible',
    zIndex: 20
  }
})

// 监听三方场景生命周期事件（iframe → 父页面，见 3.md）
const onWdpMessage = (e: MessageEvent) => {
  const data = (e.data ?? {}) as { type?: string }
  // 仅调试已知的 WDP 消息，避免其它 iframe/页面消息噪音干扰排查
  if (dtpDebug && data.type && (data.type as string).startsWith('WDP_')) {
    dtpDebugLog('[cases-keeper] wdp message', {
      type: data.type,
      origin: e.origin,
      fromTargetIframe: e.source === iframeDomRef.value?.contentWindow
    })
  }
  const targetOrigin = getDtpUIOrigin()
  if (targetOrigin && e.origin !== targetOrigin) return
  if (e.source !== iframeDomRef.value?.contentWindow) return
  if (data.type === WDP_EDITOR_SCENE_LOADED) {
    isEditing.value = true
    if (dtpDebug) dtpDebugLog('[cases-keeper] scene loaded -> isEditing=true')
  } else if (data.type === WDP_EDITOR_SCENE_UNLOADED) {
    isEditing.value = false
    iframeInteracted.value = false
    if (dtpDebug) dtpDebugLog('[cases-keeper] scene unloaded -> isEditing=false')
  }
}

// 弱信号：点击 iframe 内部时焦点移入 iframe，父窗口触发 blur
const onWindowBlur = () => {
  if (isCasesRoute.value) {
    iframeInteracted.value = true
    if (dtpDebug) dtpDebugLog('[cases-keeper] window blur -> iframeInteracted=true')
  }
}

// 编辑中刷新/关闭标签页时由浏览器弹出原生确认框
const onBeforeUnload = (e: BeforeUnloadEvent) => {
  if (!isEditing.value) return
  e.preventDefault()
  e.returnValue = ''
}

const onWindowScrollOrResize = () => {
  updatePosition()
}

onMounted(() => {
  window.addEventListener('message', onWdpMessage)
  window.addEventListener('blur', onWindowBlur)
  window.addEventListener('beforeunload', onBeforeUnload)
  window.addEventListener('resize', onWindowScrollOrResize, { passive: true })
  window.addEventListener('scroll', onWindowScrollOrResize, { passive: true })

  if (isCasesRoute.value) {
    void loadIframe()
    bindAnchor()
  }
})

onUnmounted(() => {
  unbindAnchor()
  window.removeEventListener('message', onWdpMessage)
  window.removeEventListener('blur', onWindowBlur)
  window.removeEventListener('beforeunload', onBeforeUnload)
  window.removeEventListener('resize', onWindowScrollOrResize)
  window.removeEventListener('scroll', onWindowScrollOrResize)
})

watch(
  isCasesRoute,
  (inCases) => {
    if (inCases) {
      void loadIframe()
      // 等待 DOM 更新后吸附至占位符
      nextTick(() => {
        bindAnchor()
      })
    } else {
      unbindAnchor()
    }
  },
  { flush: 'post' }
)
</script>

<style scoped>
.twin-scene-cases-keeper {
  background-color: #f9fafb;
}
</style>
