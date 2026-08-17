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
      <template #header>未保存的更改</template>
      <div class="space-y-4">
        <p>当前页面内容未保存，是否进行保存？</p>
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
import { wdpSave } from '~~/composables/useWdpEditorSave'
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

const router = useRouter()
const { triggerNotification } = useGlobalToast()

const iframeRef = ref<HTMLIFrameElement | null>(null)
const targetRoute = ref<RouteLocationRaw | undefined>(undefined)
const showSaveDialog = ref(false)
const saving = ref(false)
const allowLeave = ref(false)

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
    onClick: leaveWithoutSave
  },
  {
    text: '保存',
    props: { submit: true },
    disabled: saving.value,
    onClick: saveAndLeave
  }
])

const leaveWithoutSave = () => {
  showSaveDialog.value = false
  allowLeave.value = true
  void navigateToTargetRoute()
}

const saveAndLeave = async () => {
  const frame = iframeRef.value?.contentWindow
  if (!frame) {
    triggerNotification({
      type: ToastNotificationType.Danger,
      title: '保存失败',
      description: '编辑器未就绪，无法保存'
    })
    showSaveDialog.value = false
    return
  }

  saving.value = true
  try {
    await wdpSave(frame)
    showSaveDialog.value = false
    allowLeave.value = true
    void navigateToTargetRoute()
  } catch (error) {
    triggerNotification({
      type: ToastNotificationType.Danger,
      title: '保存失败',
      description: error instanceof Error ? error.message : 'WDP 保存失败'
    })
    showSaveDialog.value = false
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
  showSaveDialog.value = true
  next(false)
})
</script>
