<template>
  <svg
    viewBox="0 0 400 225"
    class="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient :id="`bg-${projectId}`" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" :stop-color="`hsl(${hue}, 20%, 95%)`" />
        <stop offset="100%" :stop-color="`hsl(${hue2}, 30%, 90%)`" />
      </linearGradient>

      <!-- Gradients for block faces -->
      <linearGradient :id="`top-${projectId}`" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" :stop-color="`hsl(${hue}, 70%, 85%)`" />
        <stop offset="100%" :stop-color="`hsl(${hue2}, 70%, 75%)`" />
      </linearGradient>
      <linearGradient :id="`left-${projectId}`" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" :stop-color="`hsl(${hue}, 60%, 70%)`" />
        <stop offset="100%" :stop-color="`hsl(${hue}, 60%, 55%)`" />
      </linearGradient>
      <linearGradient :id="`right-${projectId}`" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" :stop-color="`hsl(${hue2}, 50%, 60%)`" />
        <stop offset="100%" :stop-color="`hsl(${hue2}, 50%, 45%)`" />
      </linearGradient>
    </defs>

    <rect width="400" height="225" :fill="`url(#bg-${projectId})`" />

    <!-- Background Grid Pattern -->
    <path
      d="M 0 112.5 L 200 12.5 L 400 112.5 L 200 212.5 Z"
      fill="none"
      :stroke="`hsl(${hue}, 40%, 80%)`"
      stroke-width="1"
      opacity="0.5"
    />
    <path
      d="M 100 162.5 L 300 62.5"
      fill="none"
      :stroke="`hsl(${hue}, 40%, 80%)`"
      stroke-width="1"
      opacity="0.5"
    />
    <path
      d="M 100 62.5 L 300 162.5"
      fill="none"
      :stroke="`hsl(${hue}, 40%, 80%)`"
      stroke-width="1"
      opacity="0.5"
    />

    <g :transform="`translate(200, 160)`">
      <!-- Block 1 (Back) -->
      <g :transform="`translate(-60, -30)`">
        <path
          :d="`M 0 ${-h1} L 40 ${-h1 - 20} L 80 ${-h1} L 40 ${-h1 + 20} Z`"
          :fill="`url(#top-${projectId})`"
          opacity="0.9"
        />
        <path
          :d="`M 0 ${-h1} L 40 ${-h1 + 20} L 40 20 L 0 0 Z`"
          :fill="`url(#left-${projectId})`"
          opacity="0.9"
        />
        <path
          :d="`M 80 ${-h1} L 40 ${-h1 + 20} L 40 20 L 80 0 Z`"
          :fill="`url(#right-${projectId})`"
          opacity="0.9"
        />
      </g>

      <!-- Block 2 (Right) -->
      <g :transform="`translate(20, -10)`">
        <path
          :d="`M 0 ${-h2} L 50 ${-h2 - 25} L 100 ${-h2} L 50 ${-h2 + 25} Z`"
          :fill="`url(#top-${projectId})`"
        />
        <path
          :d="`M 0 ${-h2} L 50 ${-h2 + 25} L 50 25 L 0 0 Z`"
          :fill="`url(#left-${projectId})`"
        />
        <path
          :d="`M 100 ${-h2} L 50 ${-h2 + 25} L 50 25 L 100 0 Z`"
          :fill="`url(#right-${projectId})`"
        />
      </g>

      <!-- Block 3 (Left) -->
      <g :transform="`translate(-100, 10)`">
        <path
          :d="`M 0 ${-h3} L 45 ${-h3 - 22.5} L 90 ${-h3} L 45 ${-h3 + 22.5} Z`"
          :fill="`url(#top-${projectId})`"
        />
        <path
          :d="`M 0 ${-h3} L 45 ${-h3 + 22.5} L 45 22.5 L 0 0 Z`"
          :fill="`url(#left-${projectId})`"
        />
        <path
          :d="`M 90 ${-h3} L 45 ${-h3 + 22.5} L 45 22.5 L 90 0 Z`"
          :fill="`url(#right-${projectId})`"
        />
      </g>

      <!-- Block 4 (Front Center) -->
      <g :transform="`translate(-30, 40)`">
        <path
          :d="`M 0 ${-h4} L 35 ${-h4 - 17.5} L 70 ${-h4} L 35 ${-h4 + 17.5} Z`"
          :fill="`url(#top-${projectId})`"
        />
        <path
          :d="`M 0 ${-h4} L 35 ${-h4 + 17.5} L 35 17.5 L 0 0 Z`"
          :fill="`url(#left-${projectId})`"
        />
        <path
          :d="`M 70 ${-h4} L 35 ${-h4 + 17.5} L 35 17.5 L 70 0 Z`"
          :fill="`url(#right-${projectId})`"
        />
      </g>
    </g>

    <!-- Floating surface elements -->
    <g :transform="`translate(${100 + (projectIdNum * 30) % 150}, ${50 + (projectIdNum * 20) % 50})`">
      <path
        d="M 0 0 L 30 -15 L 60 0 L 30 15 Z"
        :fill="`hsl(${hue}, 80%, 60%)`"
        opacity="0.3"
      />
    </g>
    <g :transform="`translate(${250 - (projectIdNum * 20) % 100}, ${40 + (projectIdNum * 15) % 40})`">
      <path
        d="M 0 0 L 20 -10 L 40 0 L 20 10 Z"
        :fill="`hsl(${hue2}, 80%, 60%)`"
        opacity="0.2"
      />
    </g>
  </svg>
</template>

<script setup lang="ts">
const props = defineProps<{
  projectId: string
}>()

// 将字符串ID转换为数字
const projectIdNum = computed(() => {
  let hash = 0
  for (let i = 0; i < props.projectId.length; i++) {
    const char = props.projectId.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
})

// 计算色相
const hue = computed(() => 180 + (projectIdNum.value * 25) % 40) // 180-220 (Cyan to Blue)
const hue2 = computed(() => (hue.value + 20) % 360)

// 生成伪随机高度
const h1 = computed(() => 40 + (projectIdNum.value * 23) % 60)
const h2 = computed(() => 60 + (projectIdNum.value * 47) % 80)
const h3 = computed(() => 30 + (projectIdNum.value * 11) % 50)
const h4 = computed(() => 80 + (projectIdNum.value * 31) % 70)
</script>
