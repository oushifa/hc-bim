<template>
  <ViewerLayoutPanel>
    <div class="p-3 flex flex-col gap-y-3">
      <FormRange
        v-model="explodeFactor"
        name="intensity"
        label="强度"
        :min="0"
        :max="1"
        :step="0.01"
      />
    </div>
  </ViewerLayoutPanel>
</template>

<script setup lang="ts">
import { useInjectedViewerState } from '~~/lib/viewer/composables/setup'

const {
  ui: { explodeFactor }
} = useInjectedViewerState()

watch(explodeFactor, (val) => {
})
</script>
