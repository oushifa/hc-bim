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
      <template #header>保存失败</template>
      <div class="space-y-4">
        <p>自动保存失败：{{ saveErrorMessage }}。是否重试保存或放弃更改？</p>
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
  WdpSaveErrorCode
} from '~~/composables/useWdpEditorSave'

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

// ---- 离开前自动保存（WDP postMessage 协议）----
// 离开时先静默发送保存通知，按回执决定行为：
// - 保存成功 / editor not ready（未进入编辑）/ iframe 未加载 → 静默放行
// - 其它保存失败 / 超时（编辑器已就绪但保存异常）→ 弹窗提供「重试 / 放弃更改」

const router = useRouter()

const iframeRef = ref<HTMLIFrameElement | null>(null)
const targetRoute = ref<RouteLocationRaw | undefined>(undefined)
const showSaveDialog = ref(false)
const saving = ref(false)
const allowLeave = ref(false)
const saveErrorMessage = ref('')

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

const saveDialogButtons = computed<LayoutDialogButton[]>(() => [
  {
    text: '放弃更改',
    props: { color: 'outline' },
    disabled: saving.value,
    onClick: () => {
      showSaveDialog.value = false
      allowLeave.value = true
      void navigateToTargetRoute()
    }
  },
  {
    text: '重试',
    props: { submit: true },
    disabled: saving.value,
    onClick: () => {
      showSaveDialog.value = false
      void runSilentSave()
    }
  }
])

/** 静默发送保存通知：保存成功或未进入编辑（editor not ready）时直接放行，仅真正失败时弹窗 */
const runSilentSave = async () => {
  const frame = iframeRef.value?.contentWindow
  if (!frame) {
    // 编辑器不存在（iframe 未加载/加载失败）→ 等同未进入编辑，直接放行
    allowLeave.value = true
    void navigateToTargetRoute()
    return
  }

  saving.value = true
  try {
    await wdpSave(frame)
    // 保存成功（编辑器已保存完整场景），放行
    allowLeave.value = true
    void navigateToTargetRoute()
  } catch (error) {
    if (
      error instanceof WdpSaveError &&
      error.code === WdpSaveErrorCode.EDITOR_NOT_READY
    ) {
      // 编辑器未就绪（用户未进入编辑，仅浏览列表）→ 无需保存，静默放行
      allowLeave.value = true
      void navigateToTargetRoute()
    } else {
      // 编辑器已就绪但保存失败/超时 → 弹窗让用户选择重试或放弃
      saveErrorMessage.value = error instanceof Error ? error.message : 'WDP 保存失败'
      showSaveDialog.value = true
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
  if (showSaveDialog.value || saving.value) {
    next(false)
    return
  }
  // 首次离开：静默探测保存（不弹窗），按回执结果放行或弹窗
  void runSilentSave()
  next(false)
})
</script>
