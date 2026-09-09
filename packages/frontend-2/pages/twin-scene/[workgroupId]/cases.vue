<template>
  <div
    class="flex w-full flex-col min-h-0 h-full max-h-full"
    @wheel.stop
    @touchmove.stop
  >
    <!-- 全局 TwinSceneCasesKeeper 渲染吸附的目标占位符 -->
    <div
      id="twin-scene-cases-portal-anchor"
      class="relative min-h-0 flex-1 bg-gray-50 overflow-hidden"
    />
  </div>
</template>

<script setup lang="ts">
import { onBeforeRouteLeave } from 'vue-router'
import { WdpSaveError, WdpSaveErrorCode } from '~~/composables/useWdpEditorSave'
import { ToastNotificationType, useGlobalToast } from '~~/lib/common/composables/toast'
import {
  dtpDebugLog,
  isDtpDebugEnabled,
  useTwinSceneCasesKeeper
} from '~~/composables/useTwinSceneCasesKeeper'

definePageMeta({
  middleware: ['auth', 'permission']
})

useHead({
  title: '团队案例'
})

const { triggerNotification } = useGlobalToast()

/** 调试日志开关：localStorage['hc-bim-dtp-debug'] = '1' 开启 */
const dtpDebug = isDtpDebugEnabled()

const keeper = useTwinSceneCasesKeeper()
const { globalIframeRef, iframeLoaded, saveCases, loadIframe } = keeper

// 确保在进入页面时加载 iframe（Keeper 内部如果已加载则直接复用）
onMounted(() => {
  void loadIframe()
})

/** 后台保存进行中标记（防止一次离开重复触发多次保存） */
const saveInFlight = ref(false)

/**
 * 离开时的静默自动保存（后台执行，不阻塞跳转）：
 * - 保存成功 → Success 轻提示「已自动保存」（跳转已放行，提示出现在目标页面）
 * - editor not ready（未编辑）/ 超时（三方未就绪或慢链路未及回执）→ 静默，
 *   iframe 在后台保活，用户切回后可再次保存，不打扰
 * - 三方明确回执失败（编辑器就绪但保存异常）→ Danger toast 提示，引导返回重试
 *
 * 触发条件说明：跨域 iframe 下父页面无法感知三方编辑器内部是否发生改动，
 * 且三方生命周期广播（3.md 第 9 节 SCENE_LOADED）未必覆盖所有编辑流程，
 * 因此只要 iframe 已加载完成即尽力触发一次保存——未进入编辑时三方会回执
 * 'editor not ready'，由 wdpSave 映射为静默，不会打扰用户
 */
const autoSaveOnLeave = () => {
  if (saveInFlight.value) {
    if (dtpDebug) dtpDebugLog('[cases] skip auto save: in flight')
    return
  }
  const frame = globalIframeRef.value?.contentWindow
  if (!frame || !iframeLoaded.value) {
    if (dtpDebug)
      dtpDebugLog('[cases] skip auto save: iframe not ready', {
        hasFrame: Boolean(frame),
        iframeLoaded: iframeLoaded.value
      })
    return
  }

  saveInFlight.value = true
  if (dtpDebug) dtpDebugLog('[cases] auto save on leave triggered')
  saveCases(15000)
    .then(() => {
      triggerNotification({
        type: ToastNotificationType.Success,
        title: '已自动保存'
      })
    })
    .catch((error) => {
      if (dtpDebug)
        dtpDebugLog('[cases] auto save failed', {
          code: error instanceof WdpSaveError ? error.code : undefined,
          message: error instanceof Error ? error.message : String(error)
        })
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
// iframe 在 Layout 层常驻保活，后台保持隐藏与通信
onBeforeRouteLeave(() => {
  autoSaveOnLeave()
})
</script>
