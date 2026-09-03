<template>
  <div
    class="flex w-full flex-col min-h-0 h-[calc(100dvh-4.5rem)] max-h-[calc(100dvh-4.5rem)]"
    @wheel.stop
    @touchmove.stop
  >
    <div class="relative min-h-0 flex-1 bg-gray-50 overflow-hidden">
      <iframe
        v-if="caseCreateIframeSrc"
        ref="iframeRef"
        :src="caseCreateIframeSrc"
        class="absolute inset-0 h-full w-full border-0"
        title="团队案例"
        frameborder="0"
        allowfullscreen
        @load="onIframeLoad"
      />
      <div
        v-else-if="loadError"
        class="absolute inset-0 flex flex-col items-center justify-center gap-3"
      >
        <p class="text-body-sm text-foreground-2">团队案例服务连接失败，请稍后重试</p>
        <FormButton size="sm" color="outline" @click="loadIframe">重试</FormButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { buildDtpIframeSrcEnsured, getDtpUIOrigin } from '~~/composables/useDtpIframeSrc'
import { onBeforeRouteLeave } from 'vue-router'
import {
  wdpSave,
  WdpSaveError,
  WdpSaveErrorCode,
  WDP_EDITOR_SCENE_LOADED,
  WDP_EDITOR_SCENE_UNLOADED
} from '~~/composables/useWdpEditorSave'
import { ToastNotificationType, useGlobalToast } from '~~/lib/common/composables/toast'

// 供 app.vue 的 <NuxtPage :keepalive> include 匹配——本页面被 KeepAlive 缓存后，
// 切到其他页面组件不卸载（iframe 保持隐藏存活与通信），切回时原样恢复、不重新加载
defineOptions({ name: 'WorkgroupCasesPage' })

definePageMeta({
  middleware: ['auth', 'permission']
})

/** 团队案例 iframe 路径（host 由 getDtpUIOrigin() 动态获取） */
const CASE_CREATE_PATH = '/ui/case-create?embed=embed&theme=light'

const caseCreateIframeSrc = ref('')
const loadError = ref(false)

// 获取 DTP token 并生成 iframe src；token 获取失败（返回 null）时展示错误提示。
// 注意：src 只在组件首次挂载时生成一次——页面被 KeepAlive 缓存后重新激活
// （切回团队案例）不会再次赋值，从而保持 iframe 场景不重新加载。
const loadIframe = async () => {
  loadError.value = false
  const origin = getDtpUIOrigin()
  if (!origin) {
    loadError.value = true
    return
  }
  const src = await buildDtpIframeSrcEnsured(`${origin}${CASE_CREATE_PATH}`)
  if (src) {
    caseCreateIframeSrc.value = src
  } else {
    loadError.value = true
  }
}

onMounted(loadIframe)

useHead({
  title: '团队案例'
})

// ---- 离开自动保存（WDP postMessage 协议，见 2.md）----
// 页面被 KeepAlive 缓存：切换页面时 iframe 不销毁，仅在后台隐藏并保持通信，
// 因此离开不再阻塞跳转等待回执——守卫直接放行，保存请求在后台异步执行，
// 回执仍能收到（组件未卸载、message 监听仍在）。
// 编辑态信号来自三方场景生命周期事件（iframe → 父页面单向广播）：
// - WDP_EDITOR_SCENE_LOADED：进入编辑、场景渲染完成 → 标记编辑中
// - WDP_EDITOR_SCENE_UNLOADED：退出编辑/场景卸载 → 重置编辑状态
// 保存触发规则（不打扰用户）：
// - iframe 未加载完成（2.md：onload 之前发保存消息会丢失）→ 不发
// - 从未进入编辑（无 SCENE_LOADED 且从未与 iframe 交互）→ 无内容可保存，不发
// - 其余情况 → 发送 WDP_EDITOR_SAVE 后台保存：
//   成功 → Success 轻提示「已自动保存」
//   editor not ready / 超时 → 静默（VPN 慢链路回执慢属正常，iframe 保活可随时重试）
//   三方明确回执失败（success:false）→ Danger toast 提示，可回到团队案例页处理

const { triggerNotification } = useGlobalToast()

const iframeRef = ref<HTMLIFrameElement | null>(null)
/** 用户是否与 iframe 交互过（点击/滚动使焦点移入 iframe，父窗口触发 blur）——「可能在编辑」的兜底信号 */
const iframeInteracted = ref(false)
/** iframe 是否已加载完成（保存消息须在 iframe.onload 之后发送） */
const iframeLoaded = ref(false)
/** 三方生命周期事件：是否正在编辑案例（SCENE_LOADED 置 true，SCENE_UNLOADED 置 false） */
const isEditing = ref(false)
/** 后台保存进行中标记（防止一次离开重复触发多次保存） */
const saveInFlight = ref(false)

// 监听三方场景生命周期事件（iframe → 父页面，见 2.md 第 9 节）
const onWdpMessage = (e: MessageEvent) => {
  const targetOrigin = getDtpUIOrigin()
  if (targetOrigin && e.origin !== targetOrigin) return
  if (e.source !== iframeRef.value?.contentWindow) return
  const data = (e.data ?? {}) as { type?: string }
  if (data.type === WDP_EDITOR_SCENE_LOADED) {
    isEditing.value = true
  } else if (data.type === WDP_EDITOR_SCENE_UNLOADED) {
    // 三方界面内已主动退出编辑 → 同步重置交互信号，避免再次离开时误发保存
    isEditing.value = false
    iframeInteracted.value = false
  }
}

// 弱信号：点击 iframe 内部时焦点移入 iframe，父窗口触发 blur，以此感知「可能在编辑」；
// 注意切标签页/打开 DevTools 也会触发 blur（误判），由保存结果的静默策略兜底
const onWindowBlur = () => {
  iframeInteracted.value = true
}

const onIframeLoad = () => {
  iframeLoaded.value = true
}

// 编辑中刷新/关闭标签页时由浏览器弹出原生确认框（无法自定义文案）；
// beforeunload 是最后一道提示，路由内离开仍走上面的自动保存流程
const onBeforeUnload = (e: BeforeUnloadEvent) => {
  if (!isEditing.value) return
  e.preventDefault()
  e.returnValue = ''
}

onMounted(() => {
  window.addEventListener('message', onWdpMessage)
  window.addEventListener('blur', onWindowBlur)
  window.addEventListener('beforeunload', onBeforeUnload)
})

onUnmounted(() => {
  window.removeEventListener('message', onWdpMessage)
  window.removeEventListener('blur', onWindowBlur)
  window.removeEventListener('beforeunload', onBeforeUnload)
})

/**
 * 离开时的静默自动保存（后台执行，不阻塞跳转）：
 * - 保存成功 → Success 轻提示「已自动保存」（跳转已放行，提示出现在目标页面）
 * - editor not ready（未编辑）/ 超时（三方未就绪或慢链路未及回执）→ 静默，
 *   iframe 在后台保活，用户切回后可再次保存，不打扰
 * - 三方明确回执失败（编辑器就绪但保存异常）→ Danger toast 提示，引导返回重试
 */
const autoSaveOnLeave = () => {
  if (saveInFlight.value) return
  const frame = iframeRef.value?.contentWindow
  if (!frame || !iframeLoaded.value) return
  if (!isEditing.value && !iframeInteracted.value) return

  saveInFlight.value = true
  wdpSave(frame, { timeout: 15000 })
    .then(() => {
      triggerNotification({
        type: ToastNotificationType.Success,
        title: '已自动保存'
      })
    })
    .catch((error) => {
      if (
        error instanceof WdpSaveError &&
        error.code === WdpSaveErrorCode.SAVE_FAILED
      ) {
        triggerNotification({
          type: ToastNotificationType.Danger,
          title: '保存失败',
          description: '修改可能未保存，请回到团队案例页面重试'
        })
      }
      // EDITOR_NOT_READY / TIMEOUT 静默放行（无内容可保存或慢链路，无需打扰）
    })
    .finally(() => {
      saveInFlight.value = false
    })
}

// 切离团队案例：先触发后台自动保存，再立即放行跳转（零等待）。
// 组件被 KeepAlive 缓存后不会卸载，iframe 在后台保持隐藏与通信
onBeforeRouteLeave(() => {
  autoSaveOnLeave()
})
</script>
