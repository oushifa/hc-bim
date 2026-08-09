<template>
  <FormButton
    size="sm"
    color="outline"
    class="pointer-events-auto"
    @click="trackAndReset"
  >
    {{ buttonText }}
  </FormButton>
</template>
<script setup lang="ts">
import { useFilterUtilities } from '~/lib/viewer/composables/filtering/filtering'
import { useInjectedViewerState } from '~/lib/viewer/composables/setup'

const viewerState = useInjectedViewerState()
const { resetHiddenAndIsolations, hasAnyIsolationsApplied, hasAnyHiddenApplied } =
  useFilterUtilities({ state: viewerState })

const buttonText = computed(() => {
  if (hasAnyIsolationsApplied.value && hasAnyHiddenApplied.value) {
    return '非隔离所有对象并显示所有对象'
  } else if (hasAnyIsolationsApplied.value) {
    return '非隔离所有对象'
  } else if (hasAnyHiddenApplied.value) {
    return '显示所有对象'
  }
  return '重置'
})

const trackAndReset = () => {
  resetHiddenAndIsolations()

  if (hasAnyIsolationsApplied.value && hasAnyHiddenApplied.value) {
  } else if (hasAnyIsolationsApplied.value) {
  } else if (hasAnyHiddenApplied.value) {
  }
}
</script>
