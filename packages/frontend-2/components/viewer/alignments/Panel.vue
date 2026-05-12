<template>
  <ViewerLayoutSidePanel disable-scrollbar class="relative" @close="$emit('close')">
    <template #title>
      <div class="flex justify-between items-center">
        <div>联动配置</div>
      </div>
    </template>
    <template #actions>
      <div class="flex items-center gap-0.5">
        <FormButton
          v-tippy="getTooltipProps('保存联动视图')"
          size="sm"
          color="subtle"
          :icon-left="Save"
          hide-text
        />
      </div>
    </template>
    <div class="px-2 pt-2"></div>
    <div
      ref="groupsScrollArea"
      class="text-body-sm flex-1 min-h-0 overflow-y-auto simple-scrollbar"
    ></div>
  </ViewerLayoutSidePanel>
</template>
<script setup lang="ts">
import { Save } from 'lucide-vue-next'
import { useKeepAliveScrollState } from '~/lib/common/composables/dom'

const { getTooltipProps } = useSmartTooltipDelay()
useKeepAliveScrollState(useTemplateRef('groupsScrollArea'))
</script>
