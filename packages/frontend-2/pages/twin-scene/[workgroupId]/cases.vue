<template>
  <div
    class="flex w-full flex-col min-h-0 h-[calc(100dvh-4.5rem)] max-h-[calc(100dvh-4.5rem)]"
    @wheel.stop
    @touchmove.stop
  >
    <!-- <div class="shrink-0 border-b border-gray-100 bg-white px-5 py-3">
      <h1 class="text-heading">团队案例</h1>
    </div> -->
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

    <LayoutDialog
      v-model:open="showSaveDialog"
      max-width="md"
      :buttons="saveDialogButtons"
      :hide-closer="saving"
      :prevent-close-on-click-outside="saving"
    >
      <template #header>未保存的更改</template>
      <div class="space-y-4">
        <p>您正在编辑案例，是否保存更改？</p>
      </div>
    </LayoutDialog>

    <LayoutDialog
      v-model:open="showSaveFailedDialog"
      max-width="sm"
      :buttons="saveFailedDialogButtons"
      :hide-closer="saving"
      :prevent-close-on-click-outside="saving"
    >
      <template #header>{{ saveFailedTitle }}</template>
      <div class="space-y-4">
        <p>保存过程中出现问题，请重试或放弃本次修改。</p>
        <p class="text-body-sm text-foreground-2">{{ saveFailedMessage }}</p>
      </div>
    </LayoutDialog>
  </div>
</template>

<script setup lang="ts">
import {
  buildDtpIframeSrcEnsured,
  getDtpUIOrigin
} from '~~/composables/useDtpIframeSrc'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'
import { LayoutDialog, type LayoutDialogButton } from '@speckle/ui-components'
import {
  wdpSave,
  WdpSaveError,
  WdpSaveErrorCode,
  WDP_EDITOR_SCENE_LOADED,
  WDP_EDITOR_SCENE_UNLOADED
} from '~~/composables/useWdpEditorSave'
import { ToastNotificationType, useGlobalToast } from '~~/lib/common/composables/toast'

definePageMeta({
  middleware: ['auth', 'permission']
})

/** 团队案例 iframe 路径（host 由 getDtpUIOrigin() 动态获取） */
const CASE_CREATE_PATH = '/ui/case-create?embed=embed&theme=light'

const caseCreateIframeSrc = ref('')
const loadError = ref(false)

// 获取 DTP token 并生成 iframe src；token 获取失败（返回 null）时展示错误提示
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

// ---- 离开前保存（WDP postMessage 协议）----
// 编辑态信号来自三方场景生命周期事件（2.md，iframe → 父页面单向广播）：
// - WDP_EDITOR_SCENE_LOADED：进入编辑、场景渲染完成 → 标记编辑中
// - WDP_EDITOR_SCENE_UNLOADED：退出编辑/场景卸载 → 重置编辑状态
// 仅编辑中离开才弹窗询问「是否保存」；未进入编辑（浏览列表 / VPN 不可达错误页）
// 时直接放行，不发保存、零打扰。
// 兜底（VPN 慢链路）：SCENE_LOADED 在场景首次渲染完成后才发出，VPN/云渲染
// 慢时用户可能已在编辑器内操作而事件尚未到达。以父窗口 blur 记录用户是否与
// iframe 交互过；离开时若未处于编辑态、但已交互过且 iframe 已加载完成，静默
// 探测保存一次——三方回执 editor not ready 则静默放行，成功则放行，超时/明确
// 失败弹「保存失败」弹窗。

const router = useRouter()
const { triggerNotification, dismiss } = useGlobalToast()

const iframeRef = ref<HTMLIFrameElement | null>(null)
const targetRoute = ref<RouteLocationRaw | undefined>(undefined)
const showSaveDialog = ref(false)
const showSaveFailedDialog = ref(false)
const saving = ref(false)
const allowLeave = ref(false)
/** 用户是否与 iframe 交互过（点击/滚动使焦点移入 iframe，父窗口触发 blur）——「可能在编辑」的兜底信号 */
const iframeInteracted = ref(false)
/** iframe 是否已加载完成（2.md 第 6 节：保存消息须在 iframe.onload 之后发送） */
const iframeLoaded = ref(false)
/** 三方生命周期事件：是否正在编辑案例（SCENE_LOADED 置 true，SCENE_UNLOADED 置 false） */
const isEditing = ref(false)
/** 保存失败弹窗中展示的原因描述 */
const saveFailedMessage = ref('')
/** 保存失败弹窗标题（失败 / 超时区分展示） */
const saveFailedTitle = ref('保存失败')

const navigateToTargetRoute = async () => {
  const route = targetRoute.value
  targetRoute.value = undefined
  if (!route) return
  try {
    const failure = await router.push(route)
    if (failure) allowLeave.value = false
  } catch {
    allowLeave.value = false
  }
}

/** 弹窗中选择「不保存」/失败后选择放弃：直接离开 */
const leaveWithoutSave = () => {
  showSaveDialog.value = false
  showSaveFailedDialog.value = false
  allowLeave.value = true
  void navigateToTargetRoute()
}

const saveDialogButtons = computed<LayoutDialogButton[]>(() => [
  {
    text: '不保存',
    props: { color: 'outline' },
    disabled: saving.value,
    onClick: leaveWithoutSave
  },
  {
    text: '保存',
    props: { submit: true, loading: saving.value },
    disabled: saving.value,
    onClick: saveAndLeave
  }
])

const saveFailedDialogButtons = computed<LayoutDialogButton[]>(() => [
  {
    text: '不保存',
    props: { color: 'outline' },
    disabled: saving.value,
    onClick: leaveWithoutSave
  },
  {
    text: '重试',
    props: { submit: true, loading: saving.value },
    disabled: saving.value,
    onClick: retrySave
  }
])

/** 失败弹窗中点「重试」：再次发起保存（弹窗保持打开，展示保存中状态） */
const retrySave = () => {
  void saveAndLeave()
}

/** 弹窗中选择「保存」/失败后「重试」：发送保存通知，成功提示后放行；失败/超时弹窗展示原因 */
const saveAndLeave = async () => {
  const frame = iframeRef.value?.contentWindow
  if (!frame) {
    // 编辑器不存在（异常兜底）→ 无内容可保存，直接放行
    showSaveDialog.value = false
    showSaveFailedDialog.value = false
    allowLeave.value = true
    void navigateToTargetRoute()
    return
  }

  saving.value = true
  try {
    await wdpSave(frame, { timeout: 10000 })
    // 保存成功 → 关闭弹窗，提示「保存成功」1s 后消失，再放行跳转
    dismiss()
    showSaveDialog.value = false
    showSaveFailedDialog.value = false
    triggerNotification({
      type: ToastNotificationType.Success,
      title: '保存成功'
    })
    setTimeout(dismiss, 1000)
    allowLeave.value = true
    void navigateToTargetRoute()
  } catch (error) {
    if (
      error instanceof WdpSaveError &&
      error.code === WdpSaveErrorCode.EDITOR_NOT_READY
    ) {
      // 编辑器未就绪（无内容可保存）→ 不打扰用户，静默放行
      dismiss()
      showSaveDialog.value = false
      showSaveFailedDialog.value = false
      allowLeave.value = true
      void navigateToTargetRoute()
    } else {
      // 保存超时或三方明确回执失败 → 弹窗展示原因，可重试或放弃
      const isTimeout =
        error instanceof WdpSaveError && error.code === WdpSaveErrorCode.TIMEOUT
      dismiss()
      showSaveDialog.value = false
      saveFailedTitle.value = isTimeout ? '保存超时' : '保存失败'
      saveFailedMessage.value = isTimeout
        ? '保存超时，请重试'
        : error instanceof Error
        ? error.message
        : 'WDP 保存失败'
      showSaveFailedDialog.value = true
    }
  } finally {
    saving.value = false
  }
}

// 监听三方场景生命周期事件（iframe → 父页面，见 2.md）
const onWdpMessage = (e: MessageEvent) => {
  const targetOrigin = getDtpUIOrigin()
  if (targetOrigin && e.origin !== targetOrigin) return
  if (e.source !== iframeRef.value?.contentWindow) return
  const data = (e.data ?? {}) as { type?: string }
  if (data.type === WDP_EDITOR_SCENE_LOADED) {
    isEditing.value = true
  } else if (data.type === WDP_EDITOR_SCENE_UNLOADED) {
    isEditing.value = false
  }
}

// 用户点击/滚动 iframe 内部时焦点移入 iframe，父窗口触发 blur；以此感知交互
const onWindowBlur = () => {
  iframeInteracted.value = true
}

const onIframeLoad = () => {
  iframeLoaded.value = true
}

onMounted(() => {
  window.addEventListener('message', onWdpMessage)
  window.addEventListener('blur', onWindowBlur)
})

onUnmounted(() => {
  window.removeEventListener('message', onWdpMessage)
  window.removeEventListener('blur', onWindowBlur)
})

/**
 * 编辑态不确定时的静默探测保存（VPN 慢链路兜底）：
 * 未收到 SCENE_LOADED 但用户与已加载完成的 iframe 交互过，离开时静默发一次保存——
 * - 成功 / editor not ready（未编辑）→ 静默放行，不打扰用户
 * - 超时 / 三方明确回执失败 → 弹「保存失败」弹窗，可重试或放弃
 */
const probeSave = async (frame: Window) => {
  saving.value = true
  try {
    await wdpSave(frame, { timeout: 10000 })
    allowLeave.value = true
    void navigateToTargetRoute()
  } catch (error) {
    if (
      error instanceof WdpSaveError &&
      error.code === WdpSaveErrorCode.EDITOR_NOT_READY
    ) {
      allowLeave.value = true
      void navigateToTargetRoute()
    } else {
      const isTimeout =
        error instanceof WdpSaveError && error.code === WdpSaveErrorCode.TIMEOUT
      saveFailedTitle.value = isTimeout ? '保存超时' : '保存失败'
      saveFailedMessage.value = isTimeout
        ? '保存超时，请重试'
        : error instanceof Error
        ? error.message
        : 'WDP 保存失败'
      showSaveFailedDialog.value = true
    }
  } finally {
    saving.value = false
  }
}

onBeforeRouteLeave((to, _from, next) => {
  if (allowLeave.value) {
    next()
    return
  }
  targetRoute.value = to
  if (!isEditing.value) {
    // 未处于编辑态但用户与已加载的 iframe 交互过（如 VPN 慢导致 SCENE_LOADED
    // 未到达）→ 静默探测保存兜底；未交互过或 iframe 未加载完成（2.md：onload
    // 之前发保存消息会丢失）→ 直接放行
    const frame = iframeRef.value?.contentWindow
    if (iframeInteracted.value && iframeLoaded.value && frame && !saving.value) {
      next(false)
      void probeSave(frame)
      return
    }
    next()
    return
  }
  if (saving.value || showSaveDialog.value || showSaveFailedDialog.value) {
    next(false)
    return
  }
  // 编辑中离开 → 弹窗询问是否保存
  showSaveDialog.value = true
  next(false)
})
</script>
