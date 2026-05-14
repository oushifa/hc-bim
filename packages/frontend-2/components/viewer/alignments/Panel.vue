<template>
  <ViewerLayoutSidePanel disable-scrollbar class="relative" @close="onClose">
    <template #title>
      <div class="flex items-center gap-2">
        <BetweenVerticalStart class="w-4 h-4 text-primary" />
        <span>联动配置</span>
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
          @click="saveConfig"
        />
      </div>
    </template>

    <!-- Scrollable content -->
    <div
      ref="groupsScrollArea"
      class="text-body-sm flex-1 min-h-0 overflow-y-auto simple-scrollbar"
    >
      <div class="px-3 py-3 flex flex-col gap-4">
        <!-- ── 显示设置 ── -->
        <section class="panel-section">
          <div class="section-header">
            <Layout class="w-3.5 h-3.5" />
            显示设置
          </div>

          <div class="flex flex-col gap-2">
            <!-- Split screen toggle -->
            <div class="flex items-center justify-between gap-3">
              <div class="flex flex-col gap-0.5">
                <span class="text-foreground-2 text-body-xs">分屏模式</span>
                <span class="text-foreground-3 text-body-3xs">
                  左 CAD / 右 srjViewer
                </span>
              </div>
              <button
                id="alignment-splitscreen-toggle"
                class="toggle-btn"
                :class="{ active: state.splitScreenEnabled }"
                :aria-label="state.splitScreenEnabled ? '关闭分屏' : '开启分屏'"
                :aria-pressed="state.splitScreenEnabled"
                @click="toggleSplitScreen"
                @keydown.space.prevent="toggleSplitScreen"
                @keydown.enter.prevent="toggleSplitScreen"
              >
                <span class="toggle-thumb" />
              </button>
            </div>

            <!-- Split ratio slider -->
            <Transition name="fade">
              <div v-if="state.splitScreenEnabled" class="flex flex-col gap-1.5">
                <div class="flex items-center justify-between">
                  <span class="text-foreground-3 text-body-xs">分屏比例</span>
                  <span class="text-foreground-3 text-body-xs tabular-nums">
                    {{ Math.round(state.splitRatio * 100) }}% /
                    {{ Math.round((1 - state.splitRatio) * 100) }}%
                  </span>
                </div>
                <input
                  v-model="splitRatioInput"
                  type="range"
                  min="20"
                  max="80"
                  step="1"
                  class="split-range-input"
                  aria-label="分屏比例"
                  @input="onSplitRatioInput"
                />
                <div
                  class="flex justify-between text-foreground-3 text-body-3xs mt-0.5"
                >
                  <span>◀ CAD</span>
                  <span>srjViewer ▶</span>
                </div>
              </div>
            </Transition>
          </div>
        </section>

        <!-- ── 相机同步 ── -->
        <section class="panel-section">
          <div class="section-header">
            <Link2 class="w-3.5 h-3.5" />
            相机同步
          </div>

          <div class="flex items-center justify-between gap-3">
            <div class="flex flex-col gap-0.5">
              <span class="text-foreground-2 text-body-xs">同步相机</span>
              <span class="text-foreground-3 text-body-3xs">两视图实时联动</span>
            </div>
            <button
              id="alignment-camera-sync-toggle"
              class="toggle-btn"
              :class="{
                active: state.cameraSyncEnabled,
                'ring-2 ring-primary/50': state.cameraSyncEnabled,
                'opacity-40 pointer-events-none': !state.splitScreenEnabled
              }"
              :aria-label="state.cameraSyncEnabled ? '关闭相机同步' : '开启相机同步'"
              :aria-pressed="state.cameraSyncEnabled"
              :disabled="!state.splitScreenEnabled"
              @click="toggleCameraSync"
              @keydown.space.prevent="toggleCameraSync"
              @keydown.enter.prevent="toggleCameraSync"
            >
              <span class="toggle-thumb" :class="{ 'transition-transform': true }" />
            </button>
          </div>

          <!-- Camera sync status -->
          <Transition name="slide-down">
            <div
              v-if="state.cameraSyncEnabled"
              class="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/30 text-primary text-body-xs"
            >
              <Link2 class="w-3.5 h-3.5 flex-shrink-0" />
              相机已联动，两视图实时同步
            </div>
          </Transition>

          <!-- Usage guide -->
          <div
            class="flex flex-col gap-1.5 px-3 py-2.5 rounded-lg bg-foundation-2 border border-outline-2"
          >
            <p class="text-body-3xs text-foreground-2 font-medium">使用方式</p>
            <ol class="text-body-3xs text-foreground-3 space-y-1 pl-3 list-decimal">
              <li>开启分屏，左屏上传 DXF 文件</li>
              <li>左右两屏分别拖动到相同视角</li>
              <li>开启"同步相机"即可实时联动</li>
            </ol>
          </div>
        </section>

        <!-- ── 坐标偏移 ── -->
        <section class="panel-section">
          <div class="section-header">
            <Move3d class="w-3.5 h-3.5" />
            坐标偏移
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div class="offset-field">
              <label class="offset-label" for="alignment-offset-dx">dx</label>
              <input
                id="alignment-offset-dx"
                v-model.number="state.offset.dx"
                type="number"
                step="0.001"
                class="offset-input"
                placeholder="0"
              />
            </div>
            <div class="offset-field">
              <label class="offset-label" for="alignment-offset-dy">dy</label>
              <input
                id="alignment-offset-dy"
                v-model.number="state.offset.dy"
                type="number"
                step="0.001"
                class="offset-input"
                placeholder="0"
              />
            </div>
            <div class="offset-field">
              <label class="offset-label" for="alignment-offset-dz">dz</label>
              <input
                id="alignment-offset-dz"
                v-model.number="state.offset.dz"
                type="number"
                step="0.001"
                class="offset-input"
                placeholder="0"
              />
            </div>
            <div class="offset-field">
              <label class="offset-label" for="alignment-offset-scale">scale</label>
              <input
                id="alignment-offset-scale"
                v-model.number="state.offset.scale"
                type="number"
                step="0.0001"
                min="0.0001"
                class="offset-input"
                placeholder="1"
              />
            </div>
          </div>

          <button
            class="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-body-xs font-medium border transition-colors"
            :class="
              state.splitScreenEnabled
                ? state.calibration.active
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                  : 'bg-foundation-2 border-outline-2 text-foreground hover:bg-foundation'
                : 'bg-foundation-2 border-outline-2 text-foreground-3 opacity-40 pointer-events-none'
            "
            :disabled="!state.splitScreenEnabled"
            @click="toggleCalibration"
          >
            <Crosshair class="w-3.5 h-3.5" />
            {{ state.calibration.active ? '取消校准' : '一键校准' }}
          </button>

          <Transition name="slide-down">
            <div
              v-if="state.calibration.active"
              class="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-body-xs"
            >
              <Crosshair class="w-3.5 h-3.5 flex-shrink-0" />
              {{
                state.calibration.step === 'cad'
                  ? '校准第 1 步：请先点击左侧 CAD 中的特征点'
                  : '校准第 2 步：请再点击右侧 srjViewer 中对应的特征点'
              }}
            </div>
          </Transition>

          <!-- Reset offset -->
          <button
            class="text-body-3xs text-foreground-3 hover:text-foreground-2 transition-colors underline underline-offset-2 text-center w-full"
            @click="resetOffset"
          >
            重置偏移
          </button>
        </section>
      </div>
    </div>
  </ViewerLayoutSidePanel>
</template>

<script setup lang="ts">
import {
  Save,
  BetweenVerticalStart,
  Link2,
  Layout,
  Move3d,
  Crosshair
} from 'lucide-vue-next'
import { useKeepAliveScrollState } from '~/lib/common/composables/dom'
import { useAlignmentState } from '~/lib/viewer/composables/setup/alignment'

// --------------------------------------------------------------------------
// Emits
// --------------------------------------------------------------------------
const emit = defineEmits<{
  (e: 'close'): void
}>()

// --------------------------------------------------------------------------
// Alignment state (shared singleton)
// --------------------------------------------------------------------------
const {
  state,
  toggleSplitScreen,
  toggleCameraSync,
  startCalibration,
  cancelCalibration,
  setSplitRatio
} = useAlignmentState()

// --------------------------------------------------------------------------
// Local derived state
// --------------------------------------------------------------------------
const { getTooltipProps } = useSmartTooltipDelay()
const groupsScrollArea = useTemplateRef('groupsScrollArea')
useKeepAliveScrollState(groupsScrollArea)

const splitRatioInput = ref(Math.round(state.splitRatio * 100))

watch(
  () => state.splitRatio,
  (v) => {
    splitRatioInput.value = Math.round(v * 100)
  }
)

// --------------------------------------------------------------------------
// Actions
// --------------------------------------------------------------------------
const onClose = () => {
  // Closing the panel also disables split screen
  if (state.splitScreenEnabled) {
    toggleSplitScreen()
  }
  emit('close')
}

const onSplitRatioInput = () => {
  setSplitRatio(splitRatioInput.value / 100)
}

const toggleCalibration = () => {
  if (state.calibration.active) {
    cancelCalibration()
  } else {
    startCalibration()
  }
}

const resetOffset = () => {
  state.offset.dx = 0
  state.offset.dy = 0
  state.offset.dz = 0
  state.offset.scale = 1
  cancelCalibration()
}

const saveConfig = () => {
  // TODO: persist via REST API
}
</script>

<style scoped>
.panel-section {
  @apply flex flex-col gap-2 pb-4 border-b border-outline-2 last:border-0 last:pb-0;
}

.section-header {
  @apply flex items-center gap-1.5 text-body-xs font-semibold text-foreground uppercase tracking-wide mb-1;
}

/* ── Toggle button ── */
.toggle-btn {
  @apply relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent;
  @apply transition-colors duration-200 ease-in-out cursor-pointer;
  @apply bg-outline-3 focus:outline-none;
}

.toggle-btn.active {
  @apply bg-primary;
}

.toggle-thumb {
  @apply pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow;
  @apply translate-x-0 transition-transform duration-200 ease-in-out;
}

.toggle-btn.active .toggle-thumb {
  @apply translate-x-4;
}

/* ── Range slider ── */
.split-range-input {
  @apply w-full h-1.5 rounded-full appearance-none cursor-pointer bg-outline-3;
}

.split-range-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: white;
  border: 2px solid hsl(var(--color-primary, 196 100% 50%));
  cursor: col-resize;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.split-range-input::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: white;
  border: 2px solid hsl(var(--color-primary, 196 100% 50%));
  cursor: col-resize;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

/* ── Offset fields ── */
.offset-field {
  @apply flex flex-col gap-1;
}

.offset-label {
  @apply text-body-3xs text-foreground-3 font-medium uppercase tracking-wide;
}

.offset-input {
  @apply w-full px-2 py-1.5 rounded-md text-body-xs;
  @apply bg-foundation-2 border border-outline-2 text-foreground;
  @apply transition-colors duration-150;
  outline: none;
}

.offset-input:focus {
  border-color: rgb(var(--color-primary, 14 165 233) / 0.5);
  box-shadow: 0 0 0 1px rgb(var(--color-primary, 14 165 233) / 0.3);
}

/* ── Transitions ── */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.25s ease;
}
.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
