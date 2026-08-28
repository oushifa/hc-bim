<template>
  <div
    class="flex flex-col gap-2 p-3 bg-foundation border-t border-outline-3 select-none"
  >
    <!-- 顶部状态栏：路线名称、当前点位、时间 -->
    <div class="flex items-center justify-between text-body-2xs">
      <div class="flex items-center gap-1.5 font-medium text-foreground truncate">
        <span
          class="w-2 h-2 rounded-full"
          :class="isPlaying && !isPaused ? 'bg-success animate-pulse' : 'bg-outline-2'"
        />
        <span class="truncate">{{ route.name }}</span>
      </div>
      <div class="flex items-center gap-2 text-foreground-2">
        <span v-if="route.points.length > 0" class="text-body-3xs font-mono">
          点位 {{ currentPointIndex + 1 }}/{{ route.points.length }}
        </span>
        <span class="font-mono text-body-3xs">
          {{ formatTime(currentTime) }} / {{ formatTime(totalTime) }}
        </span>
      </div>
    </div>

    <!-- 进度条 -->
    <div class="flex items-center gap-2">
      <input
        type="range"
        min="0"
        max="1"
        step="0.001"
        :value="progress"
        class="w-full h-1.5 bg-outline-3 rounded-lg appearance-none cursor-pointer accent-primary"
        @input="onProgressInput"
      />
    </div>

    <!-- 底部控制按钮 -->
    <div class="flex items-center justify-between pt-1">
      <div class="flex items-center gap-1">
        <!-- 播放/暂停 -->
        <FormButton
          v-if="!isPlaying || isPaused"
          size="sm"
          color="outline"
          :icon-left="Play"
          hide-text
          class="!h-7 !w-7"
          @click="onPlayOrResume"
        />
        <FormButton
          v-else
          size="sm"
          color="outline"
          :icon-left="Pause"
          hide-text
          class="!h-7 !w-7"
          @click="$emit('pause')"
        />

        <!-- 停止 -->
        <FormButton
          size="sm"
          color="subtle"
          :icon-left="Square"
          hide-text
          class="!h-7 !w-7"
          @click="$emit('stop')"
        />

        <!-- 循环播放切换 -->
        <FormButton
          size="sm"
          color="subtle"
          :icon-left="Repeat"
          hide-text
          :class="[
            isLoop
              ? '!text-primary !bg-primary-muted font-bold'
              : 'text-foreground-2 hover:text-foreground',
            '!h-7 !w-7'
          ]"
          @click="$emit('toggle-loop')"
        />
      </div>

      <!-- 倍速切换 -->
      <div class="flex items-center gap-1">
        <button
          v-for="spd in speedOptions"
          :key="spd"
          type="button"
          class="px-1.5 py-0.5 text-body-3xs rounded font-medium transition"
          :class="[
            playbackSpeed === spd
              ? 'bg-primary text-foreground-on-primary font-bold'
              : 'text-foreground-2 hover:text-foreground hover:bg-foundation-2'
          ]"
          @click="$emit('set-speed', spd)"
        >
          {{ spd }}x
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Play, Pause, Square, Repeat } from 'lucide-vue-next'
import { FormButton } from '@speckle/ui-components'
import type { RoamingRoute } from '~/lib/viewer/composables/roaming/types'

const props = defineProps<{
  route: RoamingRoute
  isPlaying: boolean
  isPaused: boolean
  currentPointIndex: number
  currentTime: number
  totalTime: number
  progress: number
  playbackSpeed: number
  isLoop: boolean
}>()

const emit = defineEmits<{
  (e: 'play'): void
  (e: 'pause'): void
  (e: 'resume'): void
  (e: 'stop'): void
  (e: 'set-progress', val: number): void
  (e: 'set-speed', spd: number): void
  (e: 'toggle-loop'): void
}>()

const speedOptions = [0.5, 1.0, 1.5, 2.0]

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

const onPlayOrResume = () => {
  if (props.isPaused) {
    emit('resume')
  } else {
    emit('play')
  }
}

const onProgressInput = (e: Event) => {
  const val = parseFloat((e.target as HTMLInputElement).value)
  emit('set-progress', val)
}
</script>
