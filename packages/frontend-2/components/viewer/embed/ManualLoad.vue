<template>
  <div>
    <button
      class="group flex items-center justify-center absolute inset-0"
      @click="$emit('play')"
    >
      <div v-if="previewUrl" class="absolute inset-0">
        <PreviewImage :preview-url="previewUrl" />
      </div>
      <div
        class="relative z-10 pointer-events-none group-hover:scale-110 group-hover:shadow-xl shadow h-14 w-14 rounded-full border border-foundation bg-primary flex items-center justify-center transition -mt-10"
      >
        <PlayIcon class="h-6 w-6 ml-[3px] text-foundation" />
      </div>
    </button>
    <ViewerEmbedFooter :url="projectUrl" name="View in Speckle" />
  </div>
</template>

<script setup lang="ts">
import { PlayIcon } from '@heroicons/vue/20/solid'
import { useAuthManager } from '~/lib/auth/composables/auth'
import { useInternalUrlUtils } from '~~/lib/common/composables/url'

const route = useRoute()
const { embedToken } = useAuthManager()
const { updateUrlSearchParams } = useInternalUrlUtils()

const projectUrl = route.path

const projectId = route.params.id as string
const modelId = route.params.modelId as string

const previewUrl = computed(() => {
  const previewPath = modelId
    ? `/preview/${projectId}/commits/${modelId}`
    : projectId
    ? `/preview/${projectId}`
    : null
  if (!previewPath) return null

  if (!embedToken.value) return previewPath

  return updateUrlSearchParams(previewPath, (searchParams) => {
    searchParams.set('embedToken', embedToken.value as string)
  })
})

defineEmits<{
  (e: 'play'): void
}>()
</script>
