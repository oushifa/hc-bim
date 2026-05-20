<template>
  <ViewerLayoutSidePanel disable-scrollbar class="relative" @close="onClose">
    <template #title>
      <div class="flex items-center gap-2">
        <BetweenVerticalStart class="h-4 w-4 text-primary" />
        <span>联动配置</span>
      </div>
    </template>

    <template #actions>
      <div class="flex items-center gap-1">
        <template v-if="state.editorOpen">
          <button class="panel-btn" @click="closeSettingsPanel">返回</button>
        </template>
        <template v-else>
          <FormButton
            size="sm"
            color="subtle"
            :icon-left="RefreshCw"
            hide-text
            @click="loadLists"
          />
          <FormButton
            size="sm"
            color="primary"
            :icon-left="Plus"
            hide-text
            @click="openCreateDialog"
          />
        </template>
      </div>
    </template>

    <div ref="groupsScrollArea" class="min-h-0 flex-1 overflow-y-auto simple-scrollbar">
      <div class="flex flex-col gap-4 px-3 py-3">
        <div
          v-if="state.lastError"
          class="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-body-xs text-rose-300"
        >
          {{ state.lastError }}
        </div>

        <section v-if="!state.editorOpen" class="panel-section">
          <div class="section-header">
            <List class="h-3.5 w-3.5" />
            已保存联动
          </div>

          <div
            v-if="state.listLoading"
            class="rounded-lg border border-outline-2 bg-foundation-2 px-3 py-3 text-body-xs text-foreground-3"
          >
            正在读取图纸和联动配置...
          </div>

          <div
            v-else-if="!state.configs.length"
            class="rounded-lg border border-dashed border-outline-2 bg-foundation-2 px-3 py-4 text-center"
          >
            <p class="text-body-xs text-foreground-2">当前项目还没有已保存联动</p>
            <p class="mt-1 text-body-3xs text-foreground-3">
              点击右上角“新增”开始配置
            </p>
          </div>

          <button
            v-for="item in state.configs"
            :key="item.id"
            class="rounded-xl border px-3 py-3 text-left transition-colors"
            :class="
              item.id === state.activeConfigId
                ? 'border-primary bg-primary/10'
                : 'border-outline-2 bg-foundation-2 hover:bg-foundation'
            "
            @click="loadConfig(item.id)"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="truncate text-body-sm font-medium text-foreground">
                  {{ item.name }}
                </div>
                <div class="mt-1 text-body-3xs text-foreground-3">
                  {{ item.drawingDeleted ? '图纸已删除' : item.drawingName || '未关联图纸' }}
                </div>
              </div>
              <span
                class="rounded-full px-2 py-0.5 text-body-3xs"
                :class="
                  item.calibrationPoints.length >= 3
                    ? 'bg-emerald-500/15 text-emerald-300'
                    : 'bg-amber-500/15 text-amber-300'
                "
              >
                {{ item.calibrationPoints.length >= 3 ? '已校准' : '未完成校准' }}
              </span>
            </div>

            <div class="mt-3 flex flex-wrap gap-2">
              <button
                class="panel-btn"
                @click.stop="openEditById(item.id)"
              >
                设置
              </button>
              <button
                class="panel-btn panel-btn-danger"
                @click.stop="removeConfigById(item.id)"
              >
                删除
              </button>
            </div>
          </button>
        </section>

        <section v-else class="panel-section">
          <div class="section-header">
            <Info class="h-3.5 w-3.5" />
            配置信息
          </div>

          <label class="flex flex-col gap-1.5">
            <span class="text-body-xs text-foreground-2">名称</span>
            <input
              v-model.trim="editorForm.name"
              class="panel-input"
              placeholder="联动视图"
            />
          </label>

          <div class="rounded-lg border border-outline-2 bg-foundation-2 px-3 py-3">
            <div class="flex items-center justify-between gap-3">
              <div class="min-w-0">
                <div class="text-body-xs text-foreground-2">选择文件</div>
                <div class="mt-1 truncate text-body-sm text-foreground">
                  {{ selectedDrawingLabel }}
                </div>
              </div>
              <button class="panel-btn" @click="filePickerOpen = true">文件列表</button>
            </div>
          </div>

          <div class="rounded-lg border border-outline-2 bg-foundation-2 px-3 py-3">
            <div class="flex items-center justify-between gap-3">
              <div class="min-w-0">
                <div class="text-body-xs text-foreground-2">右侧截面</div>
                <div class="mt-1 text-body-sm text-foreground">
                  {{ savedSectionBoxLabel }}
                </div>
                <div class="mt-1 text-body-3xs text-foreground-3">
                  保存后会恢复右侧 BIM 的截面范围
                </div>
              </div>
              <div class="flex flex-wrap justify-end gap-2">
                <button class="panel-btn" @click="captureCurrentSectionBox">使用当前截面</button>
                <button
                  class="panel-btn"
                  :disabled="!editorForm.sectionBox"
                  @click="clearSavedSectionBox"
                >
                  清空截面
                </button>
              </div>
            </div>
          </div>

          <div class="rounded-lg border border-outline-2 bg-foundation-2 px-3 py-3">
            <div class="flex items-center justify-between">
              <span class="text-body-xs text-foreground-2">三点校准</span>
              <span class="text-body-3xs text-foreground-3">
                {{ state.calibration.points.length }}/3
              </span>
            </div>
            <div class="mt-3 grid grid-cols-3 gap-2">
              <div
                v-for="index in 3"
                :key="index"
                class="rounded-lg border px-2 py-2 text-center text-body-xs"
                :class="
                  state.calibration.points[index - 1]
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    : 'border-outline-2 bg-foundation text-foreground-3'
                "
              >
                点 {{ index }}
              </div>
            </div>
            <p class="mt-3 text-body-3xs text-foreground-3">
              {{
                state.calibration.active
                  ? calibrationHint
                  : state.calibration.awaitingCompletion
                  ? '三点已采集完成，请点击完成校准以确认结果'
                  : state.calibration.points.length >= 3
                  ? '已完成三点校准，如需调整可点击重新校准'
                  : '点击开始校准后，按 1、2、3 的顺序在左右屏选点'
              }}
            </p>
            <div class="mt-3 flex flex-wrap gap-2">
              <button class="panel-btn" @click="handleStartCalibration">
                {{ state.calibration.points.length >= 3 ? '重新校准' : '开始校准' }}
              </button>
              <button
                v-if="state.calibration.awaitingCompletion"
                class="panel-btn panel-btn-primary"
                @click="handleFinishCalibration"
              >
                完成校准
              </button>
            </div>
          </div>

          <div class="rounded-lg border border-dashed border-outline-2 bg-foundation-2 px-3 py-3 text-body-3xs text-foreground-3">
            校准后双击左屏会同步右屏聚焦并刷新左侧 marker，双击右屏会在左屏显示定位 marker。
          </div>

          <div class="flex flex-wrap gap-2">
            <button class="panel-btn" @click="closeSettingsPanel">取消</button>
            <button
              class="panel-btn panel-btn-primary"
              :disabled="state.editorSaving"
              @click="handleSubmit"
            >
              {{ state.editorSaving ? '保存中...' : '保存' }}
            </button>
          </div>
        </section>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="filePickerOpen"
        class="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 px-4"
      >
        <div class="w-full max-w-xl rounded-2xl border border-outline-2 bg-foundation shadow-xl">
          <div class="flex items-center justify-between border-b border-outline-2 px-4 py-3">
            <div>
              <div class="text-body font-semibold text-foreground">选择文件</div>
              <div class="text-body-3xs text-foreground-3">可从已上传文件中选择，也可直接上传新文件</div>
            </div>
            <button class="panel-btn" @click="filePickerOpen = false">关闭</button>
          </div>

          <div class="max-h-[50vh] overflow-y-auto px-4 py-3">
            <div v-if="!state.drawings.length" class="rounded-lg border border-dashed border-outline-2 px-3 py-4 text-center text-body-xs text-foreground-3">
              还没有已上传文件
            </div>
            <button
              v-for="drawing in state.drawings"
              :key="drawing.id"
              class="mb-2 w-full rounded-xl border px-3 py-3 text-left transition-colors"
              :class="
                drawing.id === editorForm.drawingId
                  ? 'border-primary bg-primary/10'
                  : 'border-outline-2 bg-foundation-2 hover:bg-foundation'
              "
              @click="selectDrawing(drawing.id)"
            >
              <div class="text-body-sm text-foreground">{{ drawing.fileName }}</div>
              <div class="mt-1 text-body-3xs text-foreground-3">
                {{ formatFileSize(drawing.fileSize) }}
              </div>
            </button>
          </div>

          <div class="flex items-center justify-between gap-2 border-t border-outline-2 px-4 py-3">
            <div class="flex items-center gap-2">
              <input
                ref="fileInputEl"
                type="file"
                accept=".dxf,.obj,.gltf,.glb"
                class="hidden"
                aria-label="上传文件"
                @change="onFileChange"
              />
              <button class="panel-btn" @click="fileInputEl?.click()">上传文件</button>
            </div>
            <button class="panel-btn panel-btn-primary" @click="filePickerOpen = false">确定</button>
          </div>
        </div>
      </div>
    </Teleport>
  </ViewerLayoutSidePanel>
</template>

<script setup lang="ts">
import {
  BetweenVerticalStart,
  RefreshCw,
  Plus,
  List,
  Info
} from 'lucide-vue-next'
import { CameraController, SectionTool } from '@speckle/viewer'
import type {
  AlignmentCameraState,
  AlignmentSectionBox
} from '~/components/viewer/alignments/api'
import { useKeepAliveScrollState } from '~/lib/common/composables/dom'
import { DEFAULT_OFFSET } from '~/components/viewer/alignments/CoordinateOffset'
import { useAlignmentApi } from '~/components/viewer/alignments/api'
import { useAlignmentState } from '~/lib/viewer/composables/setup/alignment'
import { useSectionBoxUtilities } from '~/lib/viewer/composables/ui'
import { useInjectedViewerState } from '~~/lib/viewer/composables/setup'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const {
  state,
  disableSplitScreen,
  enableSplitScreen,
  setLists,
  setListLoading,
  setLastError,
  applyConfig,
  upsertDrawing,
  upsertConfig,
  removeConfig,
  setSplitRatio,
  setOffset,
  openEditor,
  closeEditor,
  setEditorSaving,
  startCalibration,
  finishCalibration
} = useAlignmentState()

const {
  projectId,
  viewer: { instance: viewerInstance },
  ui: { sectionBox, sectionBoxContext }
} = useInjectedViewerState()
const api = useAlignmentApi()
const { box3ToSectionBoxData, sectionBoxDataToBox3 } = useSectionBoxUtilities()
const groupsScrollArea = useTemplateRef('groupsScrollArea')
const fileInputEl = useTemplateRef<HTMLInputElement>('fileInputEl')
useKeepAliveScrollState(groupsScrollArea)
const filePickerOpen = ref(false)

const editorForm = reactive({
  name: '联动视图',
  drawingId: '',
  sectionBox: null as AlignmentSectionBox | null
})

const activeConfig = computed(
  () => state.configs.find((item) => item.id === state.activeConfigId) || null
)

const selectedDrawing = computed(
  () => state.drawings.find((item) => item.id === editorForm.drawingId) || null
)

const selectedDrawingLabel = computed(
  () => selectedDrawing.value?.fileName || '未选择文件'
)

const savedSectionBoxLabel = computed(() =>
  editorForm.sectionBox ? '已保存当前截面配置' : '未保存截面配置'
)

const cloneSectionBox = (
  value: AlignmentSectionBox | { min: number[]; max: number[]; rotation?: number[] } | null
): AlignmentSectionBox | null =>
  value
    ? {
        min: [...value.min],
        max: [...value.max],
        ...(value.rotation ? { rotation: [...value.rotation] } : {})
      }
    : null

const applySectionBoxSnapshot = (
  value: AlignmentSectionBox | null,
  options?: { visible?: boolean }
) => {
  const nextValue = cloneSectionBox(value)
  const nextVisible = options?.visible ?? (!!nextValue && state.editorOpen)
  sectionBox.value = nextValue
  sectionBoxContext.visible.value = nextVisible

  try {
    const sectionTool = viewerInstance.getExtension(SectionTool)
    if (nextValue) {
      sectionTool.setBox(sectionBoxDataToBox3(nextValue))
      sectionTool.enabled = true
      sectionTool.visible = nextVisible
    } else {
      sectionTool.enabled = false
      sectionTool.visible = false
    }
    viewerInstance.requestRender()
  } catch {
    // noop
  }

  if (!nextValue) {
    sectionBoxContext.edited.value = false
  }
}

const getCurrentSectionBoxSnapshot = (): AlignmentSectionBox | null => {
  try {
    const sectionTool = viewerInstance.getExtension(SectionTool)
    const currentBox = sectionTool?.getBox?.()
    if (currentBox) {
      return cloneSectionBox(box3ToSectionBoxData(currentBox))
    }
  } catch {
    // noop
  }

  return cloneSectionBox(sectionBox.value)
}

const getCurrentSpeckleCameraState = (): AlignmentCameraState | null => {
  try {
    const cameraController = viewerInstance.getExtension(CameraController)
    const renderingCamera = viewerInstance.getRenderer().renderingCamera
    if (!cameraController || !renderingCamera) return null

    const cameraState: AlignmentCameraState = {
      position: {
        x: cameraController.getPosition().x,
        y: cameraController.getPosition().y,
        z: cameraController.getPosition().z
      },
      target: {
        x: cameraController.getTarget().x,
        y: cameraController.getTarget().y,
        z: cameraController.getTarget().z
      },
      projection:
        'isOrthographicCamera' in renderingCamera &&
        renderingCamera.isOrthographicCamera === true
          ? 'orthographic'
          : 'perspective'
    }

    if ('fov' in renderingCamera && typeof renderingCamera.fov === 'number') {
      cameraState.fov = renderingCamera.fov
    }
    if ('zoom' in renderingCamera && typeof renderingCamera.zoom === 'number') {
      cameraState.zoom = renderingCamera.zoom
    }

    return cameraState
  } catch {
    return null
  }
}

const calibrationHint = computed(() => {
  const pointNumber = Math.min(state.calibration.pointIndex + 1, 3)
  return state.calibration.step === 'cad'
    ? `第 ${pointNumber} 个点：请先点击左侧 CAD 中的目标位置`
    : `第 ${pointNumber} 个点：请再点击右侧 BIM 中对应位置`
})

const loadLists = async () => {
  const currentProjectId = projectId.value
  if (!currentProjectId) return
  setListLoading(true)
  setLastError(null)

  try {
    const [drawings, configs] = await Promise.all([
      api.fetchDrawings(currentProjectId),
      api.fetchConfigs(currentProjectId)
    ])
    setLists({ drawings, configs, loaded: true })
  } catch (error) {
    setLastError(error instanceof Error ? error.message : '读取联动列表失败')
  } finally {
    setListLoading(false)
  }
}

const loadConfig = async (configId: string) => {
  const currentProjectId = projectId.value
  if (!currentProjectId) return
  setLastError(null)

  try {
    const config = await api.fetchConfigDetail(currentProjectId, configId)
    upsertConfig(config)
    if (config.drawingDeleted) {
      applyConfig(null)
      applySectionBoxSnapshot(null)
      setLastError('该联动引用的图纸已删除，请编辑联动并重新选择图纸。')
      return
    }
    applyConfig(config)
    applySectionBoxSnapshot(config.sectionBox)
  } catch (error) {
    setLastError(error instanceof Error ? error.message : '加载联动配置失败')
  }
}

const onClose = () => {
  if (state.splitScreenEnabled) disableSplitScreen()
  emit('close')
}

const openCreateDialog = () => {
  applyConfig(null)
  setSplitRatio(0.5)
  setOffset({ ...DEFAULT_OFFSET })
  openEditor('create')
  editorForm.name = '联动视图'
  editorForm.drawingId = ''
  editorForm.sectionBox = cloneSectionBox(sectionBox.value)
}

const openEditDialog = () => {
  if (!activeConfig.value) return
  openEditor('edit', activeConfig.value.id)
  editorForm.name = activeConfig.value.name || '联动视图'
  editorForm.drawingId = activeConfig.value.drawingId || ''
  editorForm.sectionBox = cloneSectionBox(activeConfig.value.sectionBox)
}

const openEditById = async (configId: string) => {
  if (state.activeConfigId !== configId) {
    await loadConfig(configId)
  }
  openEditDialog()
}

const handleUploadFile = async (file: File) => {
  const currentProjectId = projectId.value
  if (!currentProjectId) return
  setLastError(null)
  try {
    const drawing = await api.uploadDrawingFile(currentProjectId, file)
    upsertDrawing(drawing)
    editorForm.drawingId = drawing.id
    filePickerOpen.value = false
  } catch (error) {
    setLastError(error instanceof Error ? error.message : '上传图纸失败')
  }
}

const handleStartCalibration = () => {
  if (!editorForm.drawingId) {
    setLastError('请先选择一张左屏图纸，再开始三点校准。')
    return
  }

  state.activeDrawingId = editorForm.drawingId
  setSplitRatio(0.5)
  enableSplitScreen()
  startCalibration()
}

const handleFinishCalibration = () => {
  finishCalibration()
}

const captureCurrentSectionBox = () => {
  const currentSectionBox = getCurrentSectionBoxSnapshot()
  if (!currentSectionBox) {
    setLastError('右侧当前没有启用截面，无法保存。')
    return
  }

  editorForm.sectionBox = currentSectionBox
  setLastError(null)
}

const clearSavedSectionBox = () => {
  editorForm.sectionBox = null
}

const handleSubmit = async () => {
  const currentProjectId = projectId.value
  if (!currentProjectId) return
  if (!editorForm.drawingId) {
    setLastError('请先选择图纸。')
    return
  }

  const drawing = state.drawings.find((item) => item.id === editorForm.drawingId)
  setEditorSaving(true)
  setLastError(null)

  try {
    const requestPayload = {
      name: editorForm.name.trim() || '联动视图',
      description: null,
      drawingId: editorForm.drawingId,
      drawingName: drawing?.fileName || null,
      splitRatio: state.splitRatio,
      calibrationPoints: state.calibration.points,
      transform: { ...state.offset },
      sectionBox: getCurrentSectionBoxSnapshot() || cloneSectionBox(editorForm.sectionBox),
      cameraState: {
        cad: state.cadCameraState,
        speckle: getCurrentSpeckleCameraState()
      }
    }

    const saved =
      state.editorMode === 'create' || !state.activeConfigId
        ? await api.createConfig(currentProjectId, requestPayload)
        : await api.updateConfig(currentProjectId, state.activeConfigId, requestPayload)

    upsertConfig(saved)
    applyConfig(saved)
    applySectionBoxSnapshot(saved.sectionBox)
    closeEditor()
  } catch (error) {
    setLastError(error instanceof Error ? error.message : '保存联动失败')
  } finally {
    setEditorSaving(false)
  }
}

const closeSettingsPanel = () => {
  closeEditor()
}

const removeConfigById = async (configId: string) => {
  const currentProjectId = projectId.value
  if (!currentProjectId) return
  const isActiveConfig = state.activeConfigId === configId
  await api.deleteConfig(currentProjectId, configId)
  removeConfig(configId)
  if (isActiveConfig) {
    applySectionBoxSnapshot(null)
  }
}

const selectDrawing = (drawingId: string) => {
  editorForm.drawingId = drawingId
}

const formatFileSize = (size: number | null) => {
  if (!size) return '未知大小'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

const onFileChange = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) {
    void handleUploadFile(file)
  }
  ;(event.target as HTMLInputElement).value = ''
}

watch(
  () => projectId.value,
  () => {
    void loadLists()
  },
  { immediate: true }
)

watch(
  () => state.editorOpen,
  (isOpen) => {
    sectionBoxContext.visible.value = isOpen && !!sectionBox.value
    if (!isOpen) {
      filePickerOpen.value = false
      return
    }

    if (state.editorMode === 'edit' && activeConfig.value) {
      editorForm.name = activeConfig.value.name || '联动视图'
      editorForm.drawingId = activeConfig.value.drawingId || ''
      editorForm.sectionBox = cloneSectionBox(activeConfig.value.sectionBox)
      return
    }

    editorForm.name = '联动视图'
    editorForm.drawingId = ''
    editorForm.sectionBox = cloneSectionBox(sectionBox.value)
  }
)
</script>

<style scoped>
.panel-section {
  @apply flex flex-col gap-2 border-b border-outline-2 pb-4 last:border-0 last:pb-0;
}

.section-header {
  @apply mb-1 flex items-center gap-1.5 text-body-xs font-semibold uppercase tracking-wide text-foreground;
}

.panel-btn {
  @apply rounded-lg border border-outline-2 bg-foundation-2 px-3 py-2 text-body-xs text-foreground transition-colors hover:bg-foundation;
}

.panel-btn-primary {
  @apply border-primary bg-primary text-white hover:opacity-90;
}

.panel-btn-danger {
  @apply border-rose-500/30 text-rose-300 hover:bg-rose-500/10;
}

.panel-input {
  @apply rounded-lg border border-outline-2 bg-foundation-2 px-3 py-2 text-body-sm text-foreground outline-none;
}
</style>
