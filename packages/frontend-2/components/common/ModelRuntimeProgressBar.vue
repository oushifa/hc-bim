<template>
  <div v-show="visible" class="inline-block w-56 max-w-full">
    <div :class="containerClasses">
      <div
        class="absolute h-full inset-0 transition-[width]"
        :class="barClasses"
        :style="`width: ${Math.floor(displayProgress)}%`"
      >
        <div v-if="soothing" class="absolute inset-0 model-runtime-soothing"></div>
      </div>
      <div
        class="absolute h-full inset-0 text-center text-[10px] leading-4 select-none"
      >
        <span :class="textClasses">{{ Math.floor(displayProgress) }}%</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
type RuntimeStatus =
  | '上传中'
  | '模型处理中'
  | '暂无模型'
  | '已同步'
  | '转换失败'
  | '同步中'
  | '待同步'
  | null

const props = defineProps<{
  status: RuntimeStatus
  progress?: number | null
  progressPhase?: string | null
}>()

const displayProgress = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

const stop = () => {
  if (timer) clearInterval(timer)
  timer = null
}

const realProgress = computed(() => {
  if (typeof props.progress !== 'number' || Number.isNaN(props.progress)) return null
  return Math.max(0, Math.min(100, props.progress))
})

const runtimePhaseStage = computed(() => {
  switch (props.progressPhase) {
    case 'acknowledged':
      return { min: 20, max: 20, mode: 'hold' as const }
    case 'opening':
      return { min: 20, max: 25, mode: 'auto' as const }
    case 'converting':
    case 'converting_model':
      return { min: 25, max: 58, mode: 'auto' as const }
    case 'uploading_version':
      return { min: 58, max: 60, mode: 'auto' as const }
    case 'completed':
      return { min: 60, max: 60, mode: 'hold' as const }
    default:
      return null
  }
})

const stage = computed(() => {
  switch (props.status) {
    case '上传中':
      return { min: 0, max: 20, mode: 'auto' as const }
    case '模型处理中':
      return { min: 20, max: 20, mode: 'hold' as const }
    case '待同步':
      return { min: 60, max: 60, mode: 'error' as const }
    case '同步中':
      return { min: 60, max: 95, mode: 'auto' as const }
    case '已同步':
      return { min: 100, max: 100, mode: 'done' as const }
    case '转换失败':
      return { min: 60, max: 60, mode: 'error' as const }
    case '暂无模型':
    default:
      return null
  }
})

const visible = computed(() => {
  if (!props.status) return false
  return ['上传中', '模型处理中', '同步中', '待同步', '转换失败'].includes(props.status)
})

const soothing = computed(() => {
  return ['上传中', '模型处理中', '同步中'].includes(props.status || '')
})

const containerClasses = computed(() => {
  const base = [
    'relative',
    'w-full',
    'h-4',
    'rounded',
    'overflow-hidden',
    'px-2',
    'bg-blue-500/30',
    'border',
    'border-gray-200/60'
  ]

  if (props.status === '转换失败' || props.status === '待同步')
    base.push('bg-danger/15', 'border-danger/30')
  if (props.status === '已同步') base.push('bg-success/15', 'border-success/30')
  return base.join(' ')
})

const barClasses = computed(() => {
  if (props.status === '转换失败' || props.status === '待同步') return 'bg-danger'
  if (props.status === '已同步') return 'bg-success'
  return 'bg-primary'
})

const textClasses = computed(() => {
  if (props.status === '转换失败' || props.status === '待同步') return 'text-danger'
  if (props.status === '已同步') return 'text-success'
  return 'text-foreground-on-primary'
})

const startAuto = (min: number, max: number) => {
  stop()
  if (displayProgress.value < min) displayProgress.value = min
  timer = setInterval(() => {
    const cur = displayProgress.value
    const next = cur + (max - cur) * 0.08
    displayProgress.value = Math.min(max, Number(next.toFixed(2)))
    if (displayProgress.value >= max) stop()
  }, 250)
}

watch(
  [stage, realProgress, runtimePhaseStage],
  ([s, actualProgress, phaseStage]) => {
    if (!s) {
      stop()
      displayProgress.value = 0
      return
    }

    const activeStage = phaseStage || s

    if (actualProgress !== null) {
      if (!phaseStage) {
        stop()
        displayProgress.value = actualProgress
        return
      }

      const nextMin = Math.max(activeStage.min, actualProgress)
      if (activeStage.mode === 'done' || nextMin >= activeStage.max) {
        stop()
        displayProgress.value = activeStage.mode === 'done' ? 100 : nextMin
        return
      }

      stop()
      if (displayProgress.value < nextMin) {
        displayProgress.value = nextMin
      }
      startAuto(nextMin, activeStage.max)
      return
    }

    if (activeStage.mode === 'done') {
      stop()
      displayProgress.value = 100
      return
    }

    if (activeStage.mode === 'error') {
      stop()
      if (displayProgress.value < activeStage.min)
        displayProgress.value = activeStage.min
      return
    }

    if (activeStage.mode === 'hold') {
      stop()
      if (displayProgress.value < activeStage.min)
        displayProgress.value = activeStage.min
      return
    }

    startAuto(activeStage.min, activeStage.max)
  },
  { immediate: true }
)

onBeforeUnmount(stop)
</script>

<style scoped>
.model-runtime-soothing {
  width: 200%;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.35) 50%,
    rgba(255, 255, 255, 0) 100%
  );
  transform: translateX(-50%);
  animation: model-runtime-soothing 1.2s ease-in-out infinite;
  pointer-events: none;
}

@keyframes model-runtime-soothing {
  0% {
    transform: translateX(-50%);
  }
  100% {
    transform: translateX(0%);
  }
}
</style>
