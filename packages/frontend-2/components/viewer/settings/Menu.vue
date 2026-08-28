<template>
  <ViewerLayoutPanel>
    <div class="flex flex-col gap-3 p-3">
      <div class="flex flex-col gap-1">
        <FormRange
          v-model="ghostOpacity"
          name="ghostOpacity"
          label="非隔离对象透明度"
          :min="0"
          :max="1"
          :step="0.05"
        />
        <div class="flex justify-end text-body-2xs text-foreground-2">
          当前值：{{ ghostOpacityPercent }}
        </div>
      </div>

      <div class="h-px bg-outline-3" />

      <div class="flex items-center justify-between">
        <span class="text-body-2xs font-medium text-foreground">背景颜色</span>
        <div class="flex items-center gap-2">
          <label class="flex items-center cursor-pointer" for="viewer-bg-color">
            <span class="sr-only">背景颜色选择器</span>
            <input
              id="viewer-bg-color"
              v-model="backgroundColor"
              class="h-7 w-8 cursor-pointer rounded border border-outline-3 bg-foundation p-0.5"
              type="color"
            />
          </label>
          <div class="flex items-center rounded border border-outline-3 px-2 py-1 bg-foundation">
            <span class="font-mono text-body-2xs text-foreground">
              {{ backgroundColor.toUpperCase() }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </ViewerLayoutPanel>
</template>

<script setup lang="ts">
import { FormRange } from '@speckle/ui-components'
import { useViewerDisplaySettings } from '~/lib/viewer/composables/setup/displaySettings'

const { ghostOpacity, ghostOpacityPercent, backgroundColor } = useViewerDisplaySettings()
</script>
