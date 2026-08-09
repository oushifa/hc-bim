<!-- eslint-disable vuejs-accessibility/no-static-element-interactions -->
<template>
  <div>
    <CommonLoadingBar :loading="isProcessing" />
    <div
      class="rounded-md p-2 flex items-center gap-3"
      :class="[
        isSelected ? '' : 'border-transparent',
        objectCount > 0 ? 'cursor-pointer hover:bg-highlight-1' : '',
        isProcessing ? 'opacity-60 pointer-events-none' : ''
      ]"
      @click="setSelection()"
      @keypress="keyboardClick(setSelection)"
    >
      <div class="shrink-0 h-10 w-1 rounded-full" :class="color" />
      <div class="flex flex-col">
        <div class="text-body-xs font-medium capitalize">{{ displayName }}</div>
        <div class="text-body-xs font-medium text-foreground-2 -mt-0.5">
          {{ description }}
        </div>
      </div>
      <div class="text-heading-lg font-medium ml-auto">
        {{ objectCount }}
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { useSelectionUtilities } from '~~/lib/viewer/composables/ui'
import { useInjectedViewer } from '~~/lib/viewer/composables/setup'
import { keyboardClick, CommonLoadingBar } from '@speckle/ui-components'
const {
  clearSelection,
  setSelectionFromObjectIds,
  objects: selectedObjects
} = useSelectionUtilities()

const { metadata } = useInjectedViewer()

const props = defineProps<{
  name: 'unchanged' | 'added' | 'removed' | 'modified'
  objectIds: string[]
}>()

const color = computed(() => {
  switch (props.name) {
    case 'added':
      return 'bg-green-500'
    case 'removed':
      return 'bg-rose-500'
    case 'modified':
      return 'bg-yellow-500'
    case 'unchanged':
    default:
      return 'bg-neutral-500'
  }
})

const isSelected = computed(() => {
  const selObjsIds = selectedObjects.value.map((o) => o.id as string)
  const objectIdsSet = new Set(props.objectIds)
  return selObjsIds.some((id: string) => objectIdsSet.has(id))
})

const objectCount = computed(() => {
  if (props.name === 'modified') return props.objectIds.length / 2
  return props.objectIds.length
})

const description = computed(() => {
  switch (props.name) {
    case 'added':
      return '在新版本中'
    case 'removed':
      return '从旧版本中'
    case 'modified':
      return '跨两个版本'
    default:
      return '跨两个版本'
  }
})

const displayName = computed(() => {
  switch (props.name) {
    case 'added':
      return '新增'
    case 'removed':
      return '删除'
    case 'modified':
      return '修改'
    case 'unchanged':
    default:
      return '未变更'
  }
})
const isProcessing = ref(false)

const yieldToMain = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

const setSelection = async () => {

  if (isProcessing.value) return

  if (isSelected.value) return clearSelection()

  // Batch process to avoid blocking the main thread with thousands of findId calls
  const BATCH_SIZE = 200
  const ids = props.objectIds

  isProcessing.value = true

  if (ids.length <= BATCH_SIZE) {
    setSelectionFromObjectIds(ids)
    isProcessing.value = false
    return
  }

  const collected: Array<(typeof selectedObjects.value)[number]> = []

  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE)
    batch.forEach((id: string) => {
      const nodes = (metadata?.worldTree.value?.findId(id) || []) as unknown as Array<{
        model: Record<string, unknown>
      }>
      nodes.forEach((node) => {
        collected.push(node.model.raw as (typeof selectedObjects.value)[number])
      })
    })
    await yieldToMain()
  }

  selectedObjects.value = collected
  isProcessing.value = false
}
</script>
