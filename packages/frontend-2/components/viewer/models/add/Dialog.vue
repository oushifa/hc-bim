<template>
  <LayoutDialog v-model:open="open" max-width="md">
    <template #header>
      <span class="viewer-add-model-theme">添加模型</span>
    </template>
    <div class="viewer-add-model-theme flex flex-col gap-y-4">
      <LayoutTabsHorizontal v-model:active-item="activeTab" :items="tabItems">
        <template #default="{ activeItem }">
          <ViewerModelsAddModelTab
            v-if="activeItem.id === 'model'"
            @chosen="onModelChosen"
          />
          <ViewerModelsAddObjectTab
            v-else-if="activeItem.id === 'object'"
            @chosen="onObjectsChosen"
          />
        </template>
      </LayoutTabsHorizontal>
    </div>
  </LayoutDialog>
</template>
<script setup lang="ts">
import { SpeckleViewer } from '@speckle/shared'
import { useCameraUtilities } from '~/lib/viewer/composables/ui'
import type { LayoutTabItem } from '~~/lib/layout/helpers/components'
import { useInjectedViewerRequestedResources } from '~~/lib/viewer/composables/setup'

const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
}>()

const props = defineProps<{
  open: boolean
}>()

const { items } = useInjectedViewerRequestedResources()
const { zoom } = useCameraUtilities()
const { triggerNotification } = useGlobalToast()

const tabItems = ref<LayoutTabItem[]>([
  { title: '按模型添加', id: 'model' },
  { title: '按对象 URL 添加', id: 'object' }
])

const activeTab = ref(tabItems.value[0])

const open = computed({
  get: () => props.open,
  set: (newVal) => emit('update:open', newVal)
})

const triggerZoomNotification = () => {
  triggerNotification({
    type: ToastNotificationType.Success,
    title: '模型添加成功',
    cta: {
      title: '缩放以适应',
      onClick: () => {
        zoom()
      }
    }
  })
}

const onModelChosen = async (params: { modelId: string }) => {
  const { modelId } = params
  await items.update([
    ...items.value,
    ...SpeckleViewer.ViewerRoute.resourceBuilder().addModel(modelId).toResources()
  ])

  triggerZoomNotification()

  open.value = false
}

const onObjectsChosen = async (params: { objectIds: string[] }) => {
  const { objectIds } = params

  const resourcesApi = SpeckleViewer.ViewerRoute.resourceBuilder()
  for (const oid of objectIds) {
    resourcesApi.addObject(oid)
  }

  await items.update([...items.value, ...resourcesApi.toResources()])

  triggerZoomNotification()

  open.value = false
}
</script>
<style>
/* 视图器添加模型弹窗主题色：浅绿色覆盖 */
.viewer-add-model-theme {
  --primary: #00b4b6;
  --primary-focus: #009fa1;
  --primary-muted: #e6f7f8;
  --foreground-primary: #00b4b6;
  --info-lighter: #e6f7f8;
  /* 覆盖输入框/按钮的边框与焦点边框颜色 */
  --outline-1: #00b4b6;
  --outline-4: #00b4b6;
}
</style>
