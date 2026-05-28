<template>
  <div
    ref="containerEl"
    class="relative w-full h-full overflow-hidden overscroll-none"
    :class="[
      isPickMode ? 'cursor-crosshair' : '',
      theme === 'dark' ? 'bg-[#0f111a]' : 'bg-white'
    ]"
  >
    <canvas
      ref="canvasEl"
      class="w-full h-full block"
      role="button"
      aria-label="CAD 画布"
      tabindex="0"
      @keydown.enter.prevent="onCanvasKeydown"
      @keydown.space.prevent="onCanvasKeydown"
    />

    <div class="absolute inset-0 pointer-events-none z-[5]">
      <div
        ref="hoverMarkerEl"
        class="absolute pointer-events-none hidden"
        aria-hidden="true"
      >
        <div
          class="relative w-7 h-7 rounded-full backdrop-blur-md flex items-center justify-center"
          :class="
            theme === 'dark'
              ? 'border border-sky-400/40 bg-black/20 shadow-[0_0_18px_rgba(56,189,248,0.25)]'
              : 'border border-sky-500/35 bg-white/70 shadow-[0_10px_30px_-18px_rgba(2,6,23,0.4)]'
          "
        >
          <div
            class="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.6)]"
          />
          <div
            class="absolute inset-0 rounded-full ring-2 ring-sky-400/20 animate-pulse"
          />
        </div>
      </div>
      <button
        v-for="a in visibleAnnotations"
        :key="a.id"
        :ref="(el) => setMarkerEl(a.id, el)"
        type="button"
        class="absolute pointer-events-auto group"
        @click.stop="onAnnotationClick(a.id)"
        @keydown.enter.prevent="onAnnotationClick(a.id)"
        @keydown.space.prevent="onAnnotationClick(a.id)"
      >
        <div
          class="relative w-7 h-7 rounded-full backdrop-blur-md flex items-center justify-center transition-transform duration-150"
          :class="[
            theme === 'dark'
              ? 'border border-white/20 bg-black/40'
              : 'border border-slate-900/15 bg-white/70 shadow-[0_6px_18px_-10px_rgba(2,6,23,0.35)]',
            a.id === selectedAnnotationId
              ? 'scale-110 ring-2 ring-sky-400/80 shadow-[0_0_18px_rgba(56,189,248,0.35)]'
              : 'hover:scale-125 hover:border-sky-400/60'
          ]"
        >
          <div
            class="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.6)]"
          />
          <div
            v-if="a.id === selectedAnnotationId"
            class="absolute inset-0 rounded-full ring-2 ring-sky-400/30 animate-pulse"
          />
        </div>

        <div class="absolute left-9 top-1/2 -translate-y-1/2 hidden group-hover:block">
          <div
            class="min-w-[220px] max-w-[280px] rounded-md backdrop-blur-md overflow-hidden opacity-95"
            :class="
              theme === 'dark'
                ? 'bg-black/70 border border-white/10 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)]'
                : 'bg-white/90 border border-slate-900/10 shadow-[0_16px_50px_-20px_rgba(2,6,23,0.35)]'
            "
          >
            <div
              class="px-3 py-2 text-[11px] font-semibold tracking-wide uppercase text-sky-400 flex items-center gap-2"
              :class="
                theme === 'dark'
                  ? 'border-b border-white/10 bg-white/5'
                  : 'border-b border-slate-900/10 bg-slate-900/5'
              "
            >
              <span
                class="w-1.5 h-1.5 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]"
              />
              <span class="truncate">{{ a.title }}</span>
            </div>
            <div
              class="px-3 py-2 text-xs leading-relaxed"
              :class="theme === 'dark' ? 'text-slate-300' : 'text-slate-700'"
            >
              {{ a.description || '暂无描述' }}
            </div>
          </div>
        </div>
      </button>
    </div>

    <div
      class="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10"
    >
      <div class="flex items-center gap-2 min-w-0">
        <div
          class="px-3 py-1.5 rounded-lg text-xs font-medium backdrop-blur-sm max-w-[420px] truncate"
          :class="
            theme === 'dark'
              ? 'bg-black/40 text-gray-200'
              : 'bg-white/80 text-slate-800 border border-slate-900/10 shadow-[0_10px_30px_-18px_rgba(2,6,23,0.4)]'
          "
        >
          {{ fileName || '图纸' }}
        </div>
        <button
          class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors backdrop-blur-sm"
          :class="[
            theme === 'dark'
              ? 'bg-black/40 hover:bg-black/55 text-gray-200'
              : 'bg-white/80 hover:bg-white text-slate-800 border border-slate-900/10 shadow-[0_10px_30px_-18px_rgba(2,6,23,0.4)]',
            isLoading ? 'opacity-60 cursor-not-allowed' : ''
          ]"
          :disabled="isLoading"
          @click="fitToModel"
        >
          适应视图
        </button>
        <div
          v-if="isPickMode"
          class="px-3 py-1.5 rounded-lg text-xs font-medium border border-sky-400/20 backdrop-blur-sm"
          :class="
            theme === 'dark'
              ? 'bg-sky-500/15 text-sky-200'
              : 'bg-sky-500/10 text-sky-700'
          "
        >
          单击图纸选择标注位置
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          v-if="layerNames.length"
          class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors backdrop-blur-sm"
          :class="
            theme === 'dark'
              ? 'bg-black/40 hover:bg-black/55 text-gray-200'
              : 'bg-white/80 hover:bg-white text-slate-800 border border-slate-900/10 shadow-[0_10px_30px_-18px_rgba(2,6,23,0.4)]'
          "
          @click="layersOpen = !layersOpen"
        >
          图层
        </button>
        <button
          class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors backdrop-blur-sm"
          :class="
            theme === 'dark'
              ? 'bg-black/40 hover:bg-black/55 text-gray-200'
              : 'bg-white/80 hover:bg-white text-slate-800 border border-slate-900/10 shadow-[0_10px_30px_-18px_rgba(2,6,23,0.4)]'
          "
          @click="annotationsOpen = !annotationsOpen"
        >
          标注
        </button>
        <button
          type="button"
          class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors backdrop-blur-sm flex items-center justify-center"
          :class="
            theme === 'dark'
              ? 'bg-black/40 hover:bg-black/55 text-gray-200'
              : 'bg-white/80 hover:bg-white text-slate-800 border border-slate-900/10 shadow-[0_10px_30px_-18px_rgba(2,6,23,0.4)]'
          "
          :title="theme === 'dark' ? '切换到浅色主题' : '切换到深色主题'"
          @click="toggleTheme"
        >
          <Moon v-if="theme === 'dark'" :size="14" />
          <Sun v-else :size="14" />
        </button>
      </div>
    </div>

    <div
      v-if="isLoading"
      class="absolute inset-0 flex items-center justify-center text-sm backdrop-blur-sm z-20"
      :class="
        theme === 'dark' ? 'bg-black/40 text-gray-200' : 'bg-white/70 text-slate-700'
      "
    >
      加载中...
    </div>
    <div
      v-else-if="error"
      class="absolute inset-0 flex items-center justify-center text-sm backdrop-blur-sm z-20"
      :class="
        theme === 'dark' ? 'bg-black/40 text-red-200' : 'bg-white/70 text-red-600'
      "
    >
      {{ error }}
    </div>

    <div
      v-if="layersOpen && layerNames.length"
      class="absolute top-14 left-3 bottom-3 w-[320px] max-h-[calc(100vh-200px)] rounded-xl backdrop-blur-md overflow-hidden z-10 flex flex-col"
      :class="
        theme === 'dark'
          ? 'bg-black/45 border border-white/10'
          : 'bg-white/90 border border-slate-900/10 shadow-[0_18px_55px_-25px_rgba(2,6,23,0.35)]'
      "
    >
      <div
        class="px-3 py-2 flex items-center justify-between"
        :class="
          theme === 'dark' ? 'border-b border-white/10' : 'border-b border-slate-900/10'
        "
      >
        <div
          class="text-xs font-medium"
          :class="theme === 'dark' ? 'text-gray-200' : 'text-slate-800'"
        >
          图层
        </div>
        <div class="flex items-center gap-2">
          <button
            class="text-xs"
            :class="
              theme === 'dark'
                ? 'text-gray-200 hover:text-white'
                : 'text-slate-700 hover:text-slate-900'
            "
            @click="setAllLayersVisible(true)"
          >
            全显
          </button>
          <button
            class="text-xs"
            :class="
              theme === 'dark'
                ? 'text-gray-200 hover:text-white'
                : 'text-slate-700 hover:text-slate-900'
            "
            @click="setAllLayersVisible(false)"
          >
            全隐
          </button>
        </div>
      </div>
      <div class="overflow-y-auto overflow-x-hidden flex-1 min-h-0 pb-2">
        <button
          v-for="name in layerNames"
          :key="name"
          class="w-full px-3 py-2 flex items-center gap-2 text-left"
          :class="theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-slate-900/5'"
          @click="toggleLayer(name)"
        >
          <input
            :id="`dxf-layer-${name}`"
            type="checkbox"
            class="h-4 w-4 rounded text-[#00b4b6] focus:ring-[#00b4b6]"
            :class="
              theme === 'dark'
                ? 'border-white/20 bg-white/10'
                : 'border-slate-300 bg-white'
            "
            :checked="!hiddenLayers[name]"
            @change.stop="toggleLayer(name)"
          />
          <span
            class="w-3.5 h-3.5 rounded-sm shrink-0"
            :class="
              theme === 'dark' ? 'border border-white/20' : 'border border-slate-300'
            "
            :style="{ backgroundColor: layerColors[name] || '#ffffff' }"
          />
          <label
            :for="`dxf-layer-${name}`"
            class="text-xs truncate flex-1"
            :class="theme === 'dark' ? 'text-gray-200' : 'text-slate-800'"
          >
            {{ name }}
          </label>
          <span
            class="text-[11px] shrink-0"
            :class="theme === 'dark' ? 'text-gray-400' : 'text-slate-500'"
          >
            {{ layerCounts[name] || 0 }}
          </span>
        </button>
      </div>
    </div>

    <div
      v-if="annotationsOpen"
      class="absolute top-14 right-3 bottom-3 w-[360px] max-h-[calc(100vh-200px)] rounded-xl backdrop-blur-md overflow-hidden z-10 flex flex-col"
      :class="
        theme === 'dark'
          ? 'bg-black/45 border border-white/10'
          : 'bg-white/90 border border-slate-900/10 shadow-[0_18px_55px_-25px_rgba(2,6,23,0.35)]'
      "
    >
      <div
        class="px-3 py-2"
        :class="
          theme === 'dark' ? 'border-b border-white/10' : 'border-b border-slate-900/10'
        "
      >
        <div class="flex gap-2">
          <div class="relative flex-1">
            <label for="cadviewer-annotation-search" class="sr-only">搜索标注</label>
            <Search
              class="absolute left-3 top-1/2 -translate-y-1/2"
              :class="theme === 'dark' ? 'text-slate-500' : 'text-slate-400'"
              :size="14"
            />
            <input
              id="cadviewer-annotation-search"
              v-model="annotationSearch"
              type="text"
              placeholder="搜索标注..."
              class="w-full rounded-md py-2 pl-9 pr-3 text-xs focus:outline-none focus:border-blue-500 transition-all"
              :class="
                theme === 'dark'
                  ? 'bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500'
                  : 'bg-white border border-slate-200 text-slate-900 placeholder-slate-400'
              "
            />
          </div>
          <button
            class="px-3 py-2 rounded-md text-xs font-bold shadow-sm transition-colors whitespace-nowrap"
            :class="
              isPickMode
                ? theme === 'dark'
                  ? 'bg-white/10 text-slate-200 hover:bg-white/15 shadow-none'
                  : 'bg-slate-900/5 text-slate-700 hover:bg-slate-900/10 shadow-none'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'
            "
            @click="togglePickAnnotation"
          >
            <span class="flex items-center gap-1.5">
              <Plus v-if="!isPickMode" :size="14" :stroke-width="2.5" />
              <span>{{ isPickMode ? '取消' : '新建' }}</span>
            </span>
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-3">
        <div
          v-if="!filteredAnnotations.length"
          class="text-center py-12 border border-dashed rounded-xl"
          :class="
            theme === 'dark'
              ? 'border-slate-800 bg-slate-900/30'
              : 'border-slate-200 bg-white'
          "
        >
          <div
            class="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
            :class="
              theme === 'dark'
                ? 'bg-slate-800 text-slate-500'
                : 'bg-slate-100 text-slate-400'
            "
          >
            <div
              class="w-5 h-5 rounded-full"
              :class="
                theme === 'dark' ? 'border border-slate-600' : 'border border-slate-300'
              "
            />
          </div>
          <p
            class="text-sm font-medium"
            :class="theme === 'dark' ? 'text-slate-400' : 'text-slate-700'"
          >
            当前视图无标注
          </p>
          <p
            class="text-xs mt-1"
            :class="theme === 'dark' ? 'text-slate-600' : 'text-slate-500'"
          >
            点击右上角新建按钮添加标注
          </p>
        </div>

        <div
          v-for="a in filteredAnnotations"
          :key="a.id"
          class="rounded-lg p-3 transition-all group cursor-pointer"
          :class="[
            theme === 'dark'
              ? 'bg-slate-800/50 border border-slate-700/50 hover:border-slate-600'
              : 'bg-white border border-slate-200 hover:border-slate-300',
            a.id === selectedAnnotationId ? 'border-blue-500/60' : ''
          ]"
          role="button"
          tabindex="0"
          @click="onAnnotationClick(a.id)"
          @keydown.enter.prevent="onAnnotationClick(a.id)"
          @keydown.space.prevent="onAnnotationClick(a.id)"
        >
          <div class="flex justify-between items-start mb-2">
            <div class="flex-1 min-w-0 mr-2">
              <h3
                class="text-sm font-semibold truncate pr-2 group-hover:text-blue-500 transition-colors"
                :class="theme === 'dark' ? 'text-slate-200' : 'text-slate-900'"
              >
                {{ a.title }}
              </h3>
              <div class="flex items-center gap-2 mt-1.5">
                <span
                  class="text-[10px] px-1.5 py-0.5 rounded border bg-blue-500/10 text-blue-400 border-blue-500/20"
                >
                  CAD
                </span>
                <span
                  class="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400"
                >
                  {{ a.visible ? '可见' : '隐藏' }}
                </span>
              </div>
            </div>
            <div class="flex flex-col items-end gap-1">
              <div class="flex items-center gap-1 mb-1">
                <button
                  class="p-1 rounded transition-colors"
                  :class="
                    theme === 'dark'
                      ? 'text-slate-400 hover:text-blue-400 hover:bg-slate-700'
                      : 'text-slate-500 hover:text-blue-600 hover:bg-slate-100'
                  "
                  :title="a.visible ? '隐藏标注' : '显示标注'"
                  @click.stop="toggleAnnotationVisibility(a.id)"
                >
                  <Eye v-if="a.visible" :size="14" />
                  <EyeOff v-else :size="14" />
                </button>
                <button
                  class="p-1 rounded transition-colors"
                  :class="
                    theme === 'dark'
                      ? 'text-slate-400 hover:text-red-400 hover:bg-slate-700'
                      : 'text-slate-500 hover:text-red-600 hover:bg-slate-100'
                  "
                  title="删除"
                  @click.stop="deleteAnnotation(a.id)"
                >
                  <Trash2 :size="14" />
                </button>
              </div>
              <span
                class="text-[10px] font-mono"
                :class="theme === 'dark' ? 'text-slate-500' : 'text-slate-500'"
              >
                {{ a.date }}
              </span>
            </div>
          </div>

          <p
            class="text-xs line-clamp-2 mb-3 leading-relaxed"
            :class="theme === 'dark' ? 'text-slate-400' : 'text-slate-600'"
          >
            {{ a.description || '暂无描述' }}
          </p>

          <div
            class="flex items-center justify-between pt-2"
            :class="
              theme === 'dark'
                ? 'border-t border-slate-700/30'
                : 'border-t border-slate-200'
            "
          >
            <div class="flex items-center gap-2">
              <div
                class="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-[10px] text-indigo-300 font-bold border border-indigo-500/30"
              >
                {{ a.creatorInitial }}
              </div>
              <span
                class="text-xs"
                :class="theme === 'dark' ? 'text-slate-400' : 'text-slate-600'"
              >
                未指派
              </span>
            </div>
            <div
              class="text-[10px] px-2 py-1 rounded font-mono"
              :class="
                theme === 'dark'
                  ? 'text-slate-500 bg-slate-900/50'
                  : 'text-slate-500 bg-slate-100 border border-slate-200'
              "
            >
              {{ a.point.x.toFixed(2) }},{{ a.point.y.toFixed(2) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="createFormOpen"
      class="fixed inset-0 z-[60] flex items-center justify-center"
    >
      <button
        type="button"
        class="absolute inset-0 backdrop-blur-[2px]"
        :class="theme === 'dark' ? 'bg-black/55' : 'bg-slate-900/30'"
        aria-label="关闭弹窗"
        @click="cancelCreate"
      ></button>
      <div
        class="relative w-[520px] max-w-[calc(100vw-32px)] rounded-xl overflow-hidden"
        :class="
          theme === 'dark'
            ? 'bg-[#111827] border border-white/10 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)]'
            : 'bg-white border border-slate-900/10 shadow-[0_20px_60px_-25px_rgba(2,6,23,0.35)]'
        "
        role="dialog"
        aria-modal="true"
        aria-label="新增标注"
      >
        <div
          class="px-4 py-3 flex items-center justify-between"
          :class="
            theme === 'dark'
              ? 'border-b border-white/10'
              : 'border-b border-slate-900/10'
          "
        >
          <div
            class="text-sm font-semibold"
            :class="theme === 'dark' ? 'text-slate-100' : 'text-slate-900'"
          >
            新增标注
          </div>
          <button
            type="button"
            class="px-2 py-1 rounded-md text-xs font-medium"
            :class="
              theme === 'dark'
                ? 'bg-white/5 text-slate-200 hover:bg-white/10'
                : 'bg-slate-900/5 text-slate-700 hover:bg-slate-900/10'
            "
            @click="cancelCreate"
          >
            关闭
          </button>
        </div>
        <div class="p-4 space-y-3">
          <div
            class="text-xs"
            :class="theme === 'dark' ? 'text-slate-300' : 'text-slate-600'"
          >
            已选择位置，填写信息后保存
          </div>
          <div class="space-y-2">
            <label
              for="cadviewer-annotation-title"
              class="text-xs"
              :class="theme === 'dark' ? 'text-slate-300' : 'text-slate-700'"
            >
              标题
            </label>
            <input
              id="cadviewer-annotation-title"
              ref="annotationTitleInputEl"
              v-model="draftTitle"
              type="text"
              placeholder="请输入标题"
              class="w-full rounded-md py-2 px-3 text-sm focus:outline-none focus:border-blue-500 transition-all"
              :class="
                theme === 'dark'
                  ? 'bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500'
                  : 'bg-white border border-slate-200 text-slate-900 placeholder-slate-400'
              "
            />
          </div>
          <div class="space-y-2">
            <label
              for="cadviewer-annotation-desc"
              class="text-xs"
              :class="theme === 'dark' ? 'text-slate-300' : 'text-slate-700'"
            >
              描述
            </label>
            <textarea
              id="cadviewer-annotation-desc"
              v-model="draftDescription"
              rows="4"
              placeholder="请输入描述"
              class="w-full rounded-md py-2 px-3 text-sm focus:outline-none focus:border-blue-500 transition-all resize-none"
              :class="
                theme === 'dark'
                  ? 'bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500'
                  : 'bg-white border border-slate-200 text-slate-900 placeholder-slate-400'
              "
            />
          </div>
        </div>
        <div
          class="px-4 py-3 flex items-center justify-end gap-2"
          :class="
            theme === 'dark'
              ? 'border-t border-white/10'
              : 'border-t border-slate-900/10'
          "
        >
          <button
            type="button"
            class="px-3 py-2 rounded-md text-sm font-medium"
            :class="
              theme === 'dark'
                ? 'bg-white/5 text-slate-200 hover:bg-white/10'
                : 'bg-slate-900/5 text-slate-700 hover:bg-slate-900/10'
            "
            @click="cancelCreate"
          >
            取消
          </button>
          <button
            type="button"
            class="px-3 py-2 rounded-md text-sm font-semibold bg-blue-600 text-white hover:bg-blue-500"
            @click="confirmCreate"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import DxfParser from 'dxf-parser'
import { Eye, EyeOff, Moon, Plus, Search, Sun, Trash2 } from 'lucide-vue-next'
import {
  AmbientLight,
  Box3,
  BufferGeometry,
  Color,
  DirectionalLight,
  Float32BufferAttribute,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
  Raycaster,
  Vector2,
  Group
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { ToastNotificationType, useGlobalToast } from '~~/lib/common/composables/toast'
import { useAuthCookie } from '~/lib/auth/composables/auth'
import { useActiveUser } from '~~/lib/auth/composables/activeUser'

const props = defineProps<{
  projectId: string
  drawingId: string
  blobId: string
  fileName: string
}>()

const apiOrigin = useApiOrigin()
const authCookie = useAuthCookie()
const { triggerNotification } = useGlobalToast()
const activeUser = useActiveUser()

const theme = ref<'dark' | 'light'>('light')
if (import.meta.client) {
  const saved = window.localStorage.getItem('cadViewerTheme')
  if (saved === 'dark' || saved === 'light') theme.value = saved
}

const toggleTheme = () => {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
}

async function request<T>(path: string, options?: Parameters<typeof $fetch<T>>[1]) {
  return await $fetch<T>(`${apiOrigin}${path}`, {
    ...options,
    headers: {
      ...(options?.headers || {}),
      ...(authCookie.value ? { Authorization: `Bearer ${authCookie.value}` } : {})
    }
  })
}

const containerEl = useTemplateRef<HTMLDivElement>('containerEl')
const canvasEl = useTemplateRef<HTMLCanvasElement>('canvasEl')
const hoverMarkerEl = useTemplateRef<HTMLDivElement>('hoverMarkerEl')
const annotationTitleInputEl = useTemplateRef<HTMLInputElement>(
  'annotationTitleInputEl'
)

const isLoading = ref(false)
const error = ref<string | null>(null)
const layersOpen = ref(true)
const annotationsOpen = ref(true)

let renderer: WebGLRenderer | null = null
let scene: Scene | null = null
let camera: PerspectiveCamera | null = null
let controls: OrbitControls | null = null
let rafId: number | null = null
let mergedView: LineSegments | null = null
let annotationGroup: Group | null = null
const markerElById = new Map<string, HTMLElement>()

type RawSegment = {
  layer: string
  block: string | null
  colorHex: number
  x1: number
  y1: number
  z1: number
  x2: number
  y2: number
  z2: number
}

const rawSegments = ref<RawSegment[]>([])
const hiddenLayers = reactive<Record<string, boolean>>({})
const layerColors = reactive<Record<string, string>>({})
const layerCounts = reactive<Record<string, number>>({})

type AnnotationItem = {
  id: string
  title: string
  description: string
  visible: boolean
  point: { x: number; y: number; z: number }
  camera: {
    position: { x: number; y: number; z: number }
    target: { x: number; y: number; z: number }
  }
  creator: string
  updater: string
  createdAt: string
  updatedAt: string
  date: string
  creatorInitial: string
}

const annotations = ref<AnnotationItem[]>([])
const selectedAnnotationId = ref<string | null>(null)
const annotationSearch = ref('')
const isPickMode = ref(false)
const createFormOpen = ref(false)
const draftTitle = ref('')
const draftDescription = ref('')
const pickedPoint = ref<Vector3 | null>(null)
const hoverPoint = ref<Vector3 | null>(null)
const pickedCameraState = ref<{
  position: { x: number; y: number; z: number }
  target: { x: number; y: number; z: number }
} | null>(null)

const layerNames = computed(() =>
  Object.keys(layerCounts).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))
)

const visibleAnnotations = computed(() => annotations.value.filter((a) => a.visible))

const filteredAnnotations = computed(() => {
  const q = annotationSearch.value.trim().toLowerCase()
  const list = annotations.value
  if (!q) return list
  return list.filter((a) => {
    const title = a.title.toLowerCase()
    const desc = a.description.toLowerCase()
    return title.includes(q) || desc.includes(q)
  })
})

type ApiAnnotation = {
  id: string
  projectId: string
  drawingId: string
  title: string
  description: string
  visible: boolean
  point: { x: number; y: number; z: number }
  camera: {
    position: { x: number; y: number; z: number }
    target: { x: number; y: number; z: number }
  }
  creator: string
  updater: string
  createdAt: string
  updatedAt: string
}

const toUiAnnotation = (a: ApiAnnotation): AnnotationItem => {
  const date = a.createdAt ? a.createdAt.slice(0, 10) : ''
  const creatorInitial =
    a.creator && activeUser.userId.value && a.creator === activeUser.userId.value
      ? '我'
      : '？'
  return {
    id: a.id,
    title: a.title,
    description: a.description || '',
    visible: a.visible,
    point: a.point,
    camera: a.camera,
    creator: a.creator,
    updater: a.updater,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
    date,
    creatorInitial
  }
}

const loadAnnotations = async () => {
  try {
    const res = await request<{ data: { items: ApiAnnotation[] } }>(
      `/api/v1/projects/${props.projectId}/drawings/${props.drawingId}/annotations`
    )
    annotations.value = res.data.items.map(toUiAnnotation)
  } catch (e) {
    triggerNotification({
      type: ToastNotificationType.Danger,
      title: '标注加载失败',
      description: (e as Error).message
    })
  }
}

const ACI_COLORS: number[] = [
  0xffffff, 0xff0000, 0xffff00, 0x00ff00, 0x00ffff, 0x0000ff, 0xff00ff, 0xffffff,
  0x808080, 0xc0c0c0, 0xff0000, 0xff3f3f, 0xff7f7f, 0xffbfbf, 0xffdfdf, 0xbf0000,
  0xbf2f2f, 0xbf5f5f, 0xbf8f8f, 0xbfafaf, 0x7f0000, 0x7f1f1f, 0x7f3f3f, 0x7f5f5f,
  0x7f7f7f, 0x3f0000, 0x3f0f0f, 0x3f1f1f, 0x3f2f2f, 0x3f3f3f, 0xff3f00, 0xff5f00,
  0xff7f00, 0xff9f00, 0xffbf00, 0xbf2f00, 0xbf4700, 0xbf5f00, 0xbf7700, 0xbf8f00,
  0x7f1f00, 0x7f2f00, 0x7f3f00, 0x7f4f00, 0x7f5f00, 0x3f0f00, 0x3f1700, 0x3f1f00,
  0x3f2700, 0x3f2f00, 0xff7f00, 0xff9f00, 0xffbf00, 0xffdf00, 0xffff00, 0xbf5f00,
  0xbf7700, 0xbf8f00, 0xbfa700, 0xbfbf00, 0x7f3f00, 0x7f4f00, 0x7f5f00, 0x7f6f00,
  0x7f7f00, 0x3f1f00, 0x3f2700, 0x3f2f00, 0x3f3700, 0x3f3f00, 0xbfff00, 0x7fff00,
  0x3fff00, 0x00ff00, 0x00ff3f, 0x8fbf00, 0x5fbf00, 0x2fbf00, 0x00bf00, 0x00bf2f,
  0x5f7f00, 0x3f7f00, 0x1f7f00, 0x007f00, 0x007f1f, 0x2f3f00, 0x1f3f00, 0x0f3f00,
  0x003f00, 0x003f0f, 0x00ff7f, 0x00ffbf, 0x00ffff, 0x00bfff, 0x007fff, 0x00bf5f,
  0x00bf8f, 0x00bfbf, 0x008fbf, 0x005fbf, 0x007f3f, 0x007f5f, 0x007f7f, 0x005f7f,
  0x003f7f, 0x003f1f, 0x003f2f, 0x003f3f, 0x002f3f, 0x001f3f, 0x003fff, 0x0000ff,
  0x3f00ff, 0x7f00ff, 0xbf00ff, 0x002fbf, 0x0000bf, 0x2f00bf, 0x5f00bf, 0x8f00bf,
  0x001f7f, 0x00007f, 0x1f007f, 0x3f007f, 0x5f007f, 0x000f3f, 0x00003f, 0x0f003f,
  0x1f003f, 0x2f003f, 0xff00ff, 0xff00bf, 0xff007f, 0xff003f, 0xff0000, 0xbf00bf,
  0xbf008f, 0xbf005f, 0xbf002f, 0xbf0000, 0x7f007f, 0x7f005f, 0x7f003f, 0x7f001f,
  0x7f0000, 0x3f003f, 0x3f002f, 0x3f001f, 0x3f000f, 0x3f0000, 0xff3f3f, 0xff3f00,
  0xff3f7f, 0xff3fbf, 0xff3fff, 0xbf2f2f, 0xbf2f00, 0xbf2f5f, 0xbf2f8f, 0xbf2fbf,
  0x7f1f1f, 0x7f1f00, 0x7f1f3f, 0x7f1f5f, 0x7f1f7f, 0x3f0f0f, 0x3f0f00, 0x3f0f1f,
  0x3f0f2f, 0x3f0f3f, 0xff7f3f, 0xff7f00, 0xff7f7f, 0xff7fbf, 0xff7fff, 0xbf5f2f,
  0xbf5f00, 0xbf5f5f, 0xbf5f8f, 0xbf5fbf, 0x7f3f1f, 0x7f3f00, 0x7f3f3f, 0x7f3f5f,
  0x7f3f7f, 0x3f1f0f, 0x3f1f00, 0x3f1f1f, 0x3f1f2f, 0x3f1f3f, 0xffbf3f, 0xffbf00,
  0xffbf7f, 0xffbfbf, 0xffbfff, 0xbf8f2f, 0xbf8f00, 0xbf8f5f, 0xbf8f8f, 0xbf8fbf,
  0x7f5f1f, 0x7f5f00, 0x7f5f3f, 0x7f5f5f, 0x7f5f7f, 0x3f2f0f, 0x3f2f00, 0x3f2f1f,
  0x3f2f2f, 0x3f2f3f, 0xffff3f, 0xffff00, 0xffff7f, 0xffffbf, 0xffffff, 0xbfbf2f,
  0xbfbf00, 0xbfbf5f, 0xbfbf8f, 0xbfbfbf, 0x7f7f1f, 0x7f7f00, 0x7f7f3f, 0x7f7f5f,
  0x7f7f7f, 0x3f3f0f, 0x3f3f00, 0x3f3f1f, 0x3f3f2f, 0x3f3f3f, 0x333333, 0x505050,
  0x696969, 0x828282, 0xb4b4b4, 0xffffff
]

const getAciColor = (colorIndex: number | undefined | null): number => {
  if (typeof colorIndex !== 'number') return 0xffffff
  if (colorIndex > 255) return colorIndex
  return ACI_COLORS[colorIndex] ?? 0xffffff
}

const initThree = () => {
  const container = containerEl.value
  const canvas = canvasEl.value
  if (!container || !canvas) return

  scene = new Scene()
  camera = new PerspectiveCamera(60, 1, 0.01, 100000)
  camera.position.set(0, 10, 20)

  renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: false
  })
  renderer.setPixelRatio(window.devicePixelRatio || 1)

  controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.dampingFactor = 0.08

  const ambient = new AmbientLight(0xffffff, 0.7)
  const directional = new DirectionalLight(0xffffff, 0.8)
  directional.position.set(10, 20, 10)
  scene.add(ambient)
  scene.add(directional)
  annotationGroup = new Group()
  annotationGroup.name = '__cad_annotations__'
  scene.add(annotationGroup)

  const resize = () => {
    if (!renderer || !camera) return
    const rect = container.getBoundingClientRect()
    renderer.setSize(rect.width, rect.height, false)
    camera.aspect = rect.width / rect.height
    camera.updateProjectionMatrix()
  }

  const observer = new ResizeObserver(() => resize())
  observer.observe(container)
  resize()

  const loop = () => {
    rafId = requestAnimationFrame(loop)
    controls?.update()
    if (renderer && scene && camera) {
      renderer.render(scene, camera)
      updateMarkerPositions()
    }
  }
  loop()

  onBeforeUnmount(() => {
    observer.disconnect()
  })
}

const clearScene = () => {
  if (mergedView && scene) {
    mergedView.geometry.dispose()
    ;(mergedView.material as LineBasicMaterial).dispose()
    scene.remove(mergedView)
    mergedView = null
  }
}

const rebuildMergedView = () => {
  if (!scene) return
  clearScene()

  const visibleSegments = rawSegments.value.filter((s) => !hiddenLayers[s.layer])
  if (!visibleSegments.length) return

  const hexToRgb01 = (v: number) => ({
    r: ((v >> 16) & 255) / 255,
    g: ((v >> 8) & 255) / 255,
    b: (v & 255) / 255
  })

  const srgbToLinear = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)

  const relativeLuminance = (v: number) => {
    const { r, g, b } = hexToRgb01(v)
    const R = srgbToLinear(r)
    const G = srgbToLinear(g)
    const B = srgbToLinear(b)
    return 0.2126 * R + 0.7152 * G + 0.0722 * B
  }

  const contrastRatio = (a: number, b: number) => {
    const L1 = relativeLuminance(a)
    const L2 = relativeLuminance(b)
    const hi = Math.max(L1, L2)
    const lo = Math.min(L1, L2)
    return (hi + 0.05) / (lo + 0.05)
  }

  const mixHex = (a: number, b: number, t: number) => {
    const ar = (a >> 16) & 255
    const ag = (a >> 8) & 255
    const ab = a & 255
    const br = (b >> 16) & 255
    const bg = (b >> 8) & 255
    const bb = b & 255
    const r = Math.round(ar + (br - ar) * t)
    const g = Math.round(ag + (bg - ag) * t)
    const bl = Math.round(ab + (bb - ab) * t)
    return (r << 16) + (g << 8) + bl
  }

  const minRatio = 2.6
  const bgHex = theme.value === 'light' ? 0xffffff : 0x0f111a
  const targetHex = theme.value === 'light' ? 0x000000 : 0xffffff

  const ensureContrast = (lineHex: number) => {
    if (contrastRatio(lineHex, bgHex) >= minRatio) return lineHex
    let lo = 0
    let hi = 1
    let best = lineHex
    for (let i = 0; i < 10; i++) {
      const mid = (lo + hi) / 2
      const candidate = mixHex(lineHex, targetHex, mid)
      if (contrastRatio(candidate, bgHex) >= minRatio) {
        best = candidate
        hi = mid
      } else {
        lo = mid
      }
    }
    return best
  }

  const adjustLineColor = (hex: number) => ensureContrast(hex)

  const positions: number[] = []
  const colors: number[] = []
  for (const s of visibleSegments) {
    positions.push(s.x1, s.y1, s.z1, s.x2, s.y2, s.z2)
    const c = new Color(adjustLineColor(s.colorHex))
    colors.push(c.r, c.g, c.b, c.r, c.g, c.b)
  }

  const geom = new BufferGeometry()
  geom.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geom.setAttribute('color', new Float32BufferAttribute(colors, 3))
  const mat = new LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 1
  })
  mergedView = new LineSegments(geom, mat)
  scene.add(mergedView)
}

const fitToModel = () => {
  if (!mergedView || !camera || !controls) return
  const box = new Box3().setFromObject(mergedView)
  const center = box.getCenter(new Vector3())
  const size = box.getSize(new Vector3())
  const maxDim = Math.max(size.x, size.y, size.z)
  if (!Number.isFinite(maxDim) || maxDim <= 0) return

  const fov = (camera.fov * Math.PI) / 180
  const cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.6
  camera.position.set(center.x, center.y + maxDim * 0.3, center.z + cameraZ)
  camera.near = cameraZ * 0.001
  camera.far = cameraZ * 100
  camera.updateProjectionMatrix()
  controls.target.copy(center)
  controls.update()
}

const toggleLayer = (layer: string) => {
  hiddenLayers[layer] = !hiddenLayers[layer]
  rebuildMergedView()
}

const setAllLayersVisible = (visible: boolean) => {
  for (const name of layerNames.value) {
    hiddenLayers[name] = !visible
  }
  rebuildMergedView()
}

const setMarkerEl = (id: string, el: Element | ComponentPublicInstance | null) => {
  if (!el) {
    markerElById.delete(id)
    return
  }
  if (el instanceof HTMLElement) {
    markerElById.set(id, el)
  }
}

const startPickAnnotation = () => {
  if (isPickMode.value) return
  isPickMode.value = true
  createFormOpen.value = false
  pickedPoint.value = null
  hoverPoint.value = null
  draftTitle.value = ''
  draftDescription.value = ''
  if (controls) controls.enabled = false
}

const cancelPickAnnotation = () => {
  if (!isPickMode.value) return
  isPickMode.value = false
  hoverPoint.value = null
  if (controls) controls.enabled = true
}

const togglePickAnnotation = () => {
  if (isPickMode.value) cancelPickAnnotation()
  else startPickAnnotation()
}

const removeAnnotation = (id: string) => {
  markerElById.delete(id)
  annotations.value = annotations.value.filter((a) => a.id !== id)
  if (selectedAnnotationId.value === id) selectedAnnotationId.value = null
}

const getPickHitPoint = (clientX: number, clientY: number) => {
  if (!canvasEl.value || !camera || !mergedView) return null
  const rect = canvasEl.value.getBoundingClientRect()
  const mouse = new Vector2(
    ((clientX - rect.left) / rect.width) * 2 - 1,
    -(((clientY - rect.top) / rect.height) * 2 - 1)
  )

  const raycaster = new Raycaster()
  const distance = controls
    ? camera.position.distanceTo(controls.target)
    : camera.position.length()
  const worldHeightAtDistance =
    2 * distance * Math.tan((camera.fov * Math.PI) / 180 / 2)
  const unitsPerPixel = rect.height ? worldHeightAtDistance / rect.height : 0.1
  const threshold = Math.min(Math.max(unitsPerPixel * 12, 0.5), 50)
  if (raycaster.params.Line) raycaster.params.Line.threshold = threshold
  raycaster.setFromCamera(mouse, camera)
  const hits = raycaster.intersectObject(mergedView, false)
  return hits[0]?.point || null
}

const onCanvasPointerDown = (e: PointerEvent) => {
  if (!isPickMode.value) return
  e.preventDefault()
  e.stopPropagation()

  const point = getPickHitPoint(e.clientX, e.clientY)
  if (!point) return

  pickedPoint.value = point.clone()
  hoverPoint.value = null
  if (camera && controls) {
    pickedCameraState.value = {
      position: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
      target: { x: controls.target.x, y: controls.target.y, z: controls.target.z }
    }
  }
  isPickMode.value = false
  createFormOpen.value = true
  if (controls) controls.enabled = true
}

const onCanvasPointerMove = (e: PointerEvent) => {
  if (!isPickMode.value) return
  const point = getPickHitPoint(e.clientX, e.clientY)
  hoverPoint.value = point ? point.clone() : null
}

const onCanvasPointerLeave = () => {
  hoverPoint.value = null
}

const onCanvasKeydown = () => {
  if (!isPickMode.value) return
  if (!canvasEl.value) return
  const rect = canvasEl.value.getBoundingClientRect()
  const point = getPickHitPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
  if (!point) return
  pickedPoint.value = point.clone()
  if (camera && controls) {
    pickedCameraState.value = {
      position: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
      target: { x: controls.target.x, y: controls.target.y, z: controls.target.z }
    }
  }
  isPickMode.value = false
  createFormOpen.value = true
  if (controls) controls.enabled = true
}

const cancelCreate = () => {
  createFormOpen.value = false
  pickedPoint.value = null
  pickedCameraState.value = null
  hoverPoint.value = null
  draftTitle.value = ''
  draftDescription.value = ''
}

const confirmCreate = async () => {
  if (!pickedPoint.value || !camera || !controls) return
  const title = draftTitle.value.trim() || '未命名标注'
  const description = draftDescription.value.trim()

  const camPos = pickedCameraState.value?.position || {
    x: camera.position.x,
    y: camera.position.y,
    z: camera.position.z
  }
  const target = pickedCameraState.value?.target || {
    x: controls.target.x,
    y: controls.target.y,
    z: controls.target.z
  }
  const point = pickedPoint.value

  try {
    const res = await request<{ data: ApiAnnotation }>(
      `/api/v1/projects/${props.projectId}/drawings/${props.drawingId}/annotations`,
      {
        method: 'POST',
        body: {
          title,
          description,
          visible: true,
          point: { x: point.x, y: point.y, z: point.z },
          camera: { position: camPos, target }
        }
      }
    )

    const item = toUiAnnotation(res.data)
    annotations.value = [item, ...annotations.value]

    selectedAnnotationId.value = item.id
    createFormOpen.value = false
    pickedPoint.value = null
    pickedCameraState.value = null
    draftTitle.value = ''
    draftDescription.value = ''
  } catch (e) {
    triggerNotification({
      type: ToastNotificationType.Danger,
      title: '标注创建失败',
      description: (e as Error).message
    })
  }
}

const toggleAnnotationVisibility = async (id: string) => {
  const targetAnn = annotations.value.find((a) => a.id === id) || null
  if (!targetAnn) return
  const nextVisible = !targetAnn.visible

  annotations.value = annotations.value.map((a) =>
    a.id === id ? { ...a, visible: nextVisible } : a
  )
  try {
    const res = await request<{ data: ApiAnnotation }>(
      `/api/v1/projects/${props.projectId}/drawings/${props.drawingId}/annotations/${id}`,
      { method: 'PATCH', body: { visible: nextVisible } }
    )
    const updated = toUiAnnotation(res.data)
    annotations.value = annotations.value.map((a) => (a.id === id ? updated : a))
  } catch (e) {
    annotations.value = annotations.value.map((a) =>
      a.id === id ? { ...a, visible: !nextVisible } : a
    )
    triggerNotification({
      type: ToastNotificationType.Danger,
      title: '更新失败',
      description: (e as Error).message
    })
  }
}

const deleteAnnotation = async (id: string) => {
  try {
    await request(
      `/api/v1/projects/${props.projectId}/drawings/${props.drawingId}/annotations/${id}`,
      {
        method: 'DELETE'
      }
    )
    removeAnnotation(id)
  } catch (e) {
    triggerNotification({
      type: ToastNotificationType.Danger,
      title: '删除失败',
      description: (e as Error).message
    })
  }
}

const flyTo = (annotationId: string) => {
  if (!camera || !controls) return
  const ann = annotations.value.find((a) => a.id === annotationId)
  if (!ann) return

  const cam = camera
  const ctrls = controls
  const fromPos = cam.position.clone()
  const fromTarget = ctrls.target.clone()
  const toPos = new Vector3(
    ann.camera.position.x,
    ann.camera.position.y,
    ann.camera.position.z
  )
  const toTarget = new Vector3(
    ann.camera.target.x,
    ann.camera.target.y,
    ann.camera.target.z
  )

  const duration = 320
  const start = performance.now()
  const step = () => {
    const t = Math.min((performance.now() - start) / duration, 1)
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
    cam.position.copy(fromPos.clone().lerp(toPos, eased))
    ctrls.target.copy(fromTarget.clone().lerp(toTarget, eased))
    ctrls.update()
    if (t < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

const onAnnotationClick = (id: string) => {
  selectedAnnotationId.value = id
  flyTo(id)
}

const updateMarkerPositions = () => {
  if (!camera || !containerEl.value) return
  const rect = containerEl.value.getBoundingClientRect()
  const w = rect.width
  const h = rect.height

  const hoverEl = hoverMarkerEl.value
  if (hoverEl && isPickMode.value && hoverPoint.value) {
    const p = hoverPoint.value.clone().project(camera)
    if (p.z < -1 || p.z > 1) {
      hoverEl.style.display = 'none'
    } else {
      const x = (p.x * 0.5 + 0.5) * w
      const y = (-p.y * 0.5 + 0.5) * h
      hoverEl.style.display = 'block'
      hoverEl.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`
    }
  } else if (hoverEl) {
    hoverEl.style.display = 'none'
  }

  for (const a of visibleAnnotations.value) {
    const el = markerElById.get(a.id)
    if (!el) continue

    const p = new Vector3(a.point.x, a.point.y, a.point.z).project(camera)
    if (p.z < -1 || p.z > 1) {
      el.style.display = 'none'
      continue
    }
    const x = (p.x * 0.5 + 0.5) * w
    const y = (-p.y * 0.5 + 0.5) * h
    el.style.display = 'block'
    el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`
  }
}

const fetchDxfText = async () => {
  const headers = new Headers()
  if (authCookie.value) headers.set('Authorization', `Bearer ${authCookie.value}`)

  const res = await fetch(
    `${apiOrigin}/api/stream/${props.projectId}/blob/${props.blobId}`,
    {
      method: 'GET',
      headers
    }
  )
  if (!res.ok) throw new Error('读取图纸文件失败')
  return await res.text()
}

type ParsedDxf = {
  entities?: unknown[]
  blocks?: Record<
    string,
    {
      entities?: unknown[]
      position?: { x?: number; y?: number; z?: number }
    }
  >
  tables?: {
    layer?: { layers?: Record<string, { color?: number }> }
  }
}

type DxfEntity = Record<string, unknown>

const parseDxf = (text: string) => {
  const parser = new DxfParser()
  const dxf = parser.parseSync(text) as ParsedDxf | null
  if (!dxf) {
    throw new Error('DXF parse failed')
  }
  const segments: RawSegment[] = []
  const counts: Record<string, number> = {}
  const colors: Record<string, string> = {}
  const blocks = dxf.blocks || {}

  const addSegment = (
    layer: string,
    block: string | null,
    colorHex: number,
    p1: Vector3,
    p2: Vector3
  ) => {
    segments.push({
      layer,
      block,
      colorHex,
      x1: p1.x,
      y1: p1.y,
      z1: p1.z,
      x2: p2.x,
      y2: p2.y,
      z2: p2.z
    })
    counts[layer] = (counts[layer] || 0) + 1
    if (!colors[layer]) colors[layer] = `#${new Color(colorHex).getHexString()}`
  }

  const traverse = (
    entities: unknown[],
    mat: Matrix4,
    parentLayer: string,
    activeBlock: string | null
  ) => {
    for (const e of entities) {
      const ent = e as DxfEntity
      const layerName =
        (typeof ent.layer === 'string' ? ent.layer : null) || parentLayer || '0'

      let colorNum: number | undefined | null =
        typeof ent.color === 'number' ? ent.color : null
      if (colorNum === undefined || colorNum === null || colorNum === 256) {
        const layerDef = dxf.tables?.layer?.layers?.[layerName]
        colorNum = layerDef?.color
      }
      const colorHex = getAciColor(colorNum)

      const type = typeof ent.type === 'string' ? ent.type : ''

      if (type === 'INSERT') {
        const name = typeof ent.name === 'string' ? ent.name : null
        if (!name || !blocks[name]?.entities) continue
        const block = blocks[name]
        const bm = new Matrix4()
        const pos = (ent.position as Record<string, unknown> | undefined) || {}
        const px = typeof pos.x === 'number' ? pos.x : 0
        const py = typeof pos.y === 'number' ? pos.y : 0
        const pz = typeof pos.z === 'number' ? pos.z : 0
        bm.setPosition(px, py, pz)
        if (typeof ent.rotation === 'number' && ent.rotation) {
          const rad = (ent.rotation * Math.PI) / 180
          bm.makeRotationZ(rad)
          bm.setPosition(px, py, pz)
        }
        const xs = typeof ent.xScale === 'number' ? ent.xScale : 1
        const ys = typeof ent.yScale === 'number' ? ent.yScale : 1
        const zs = typeof ent.zScale === 'number' ? ent.zScale : 1
        bm.scale(new Vector3(xs, ys, zs))
        const offsetM = new Matrix4().setPosition(
          new Vector3(
            -(block.position?.x || 0),
            -(block.position?.y || 0),
            -(block.position?.z || 0)
          )
        )
        const newMat = mat.clone().multiply(bm).multiply(offsetM)
        traverse(block.entities || [], newMat, layerName, name)
        continue
      }

      const vertices = Array.isArray(ent.vertices) ? ent.vertices : []

      if (type === 'LINE' && vertices.length >= 2) {
        const v0 = vertices[0] as Record<string, unknown>
        const v1 = vertices[1] as Record<string, unknown>
        const p1 = new Vector3(
          typeof v0.x === 'number' ? v0.x : 0,
          typeof v0.y === 'number' ? v0.y : 0,
          typeof v0.z === 'number' ? v0.z : 0
        ).applyMatrix4(mat)
        const p2 = new Vector3(
          typeof v1.x === 'number' ? v1.x : 0,
          typeof v1.y === 'number' ? v1.y : 0,
          typeof v1.z === 'number' ? v1.z : 0
        ).applyMatrix4(mat)
        addSegment(layerName, activeBlock, colorHex, p1, p2)
        continue
      }

      if (
        (type === 'LWPOLYLINE' || type === 'lwpolyline' || type === 'POLYLINE') &&
        vertices.length >= 2
      ) {
        const flags = typeof ent.flags === 'number' ? ent.flags : 0
        const closed = ent.shape === true || (flags & 1) === 1
        for (let i = 0; i < vertices.length - 1; i++) {
          const vA = vertices[i] as Record<string, unknown>
          const vB = vertices[i + 1] as Record<string, unknown>
          const p1 = new Vector3(
            typeof vA.x === 'number' ? vA.x : 0,
            typeof vA.y === 'number' ? vA.y : 0,
            typeof vA.z === 'number' ? vA.z : 0
          ).applyMatrix4(mat)
          const p2 = new Vector3(
            typeof vB.x === 'number' ? vB.x : 0,
            typeof vB.y === 'number' ? vB.y : 0,
            typeof vB.z === 'number' ? vB.z : 0
          ).applyMatrix4(mat)
          addSegment(layerName, activeBlock, colorHex, p1, p2)
        }
        if (closed) {
          const last = vertices[vertices.length - 1] as Record<string, unknown>
          const first = vertices[0] as Record<string, unknown>
          const p1 = new Vector3(
            typeof last.x === 'number' ? last.x : 0,
            typeof last.y === 'number' ? last.y : 0,
            typeof last.z === 'number' ? last.z : 0
          ).applyMatrix4(mat)
          const p2 = new Vector3(
            typeof first.x === 'number' ? first.x : 0,
            typeof first.y === 'number' ? first.y : 0,
            typeof first.z === 'number' ? first.z : 0
          ).applyMatrix4(mat)
          addSegment(layerName, activeBlock, colorHex, p1, p2)
        }
        continue
      }

      const radius = typeof ent.radius === 'number' ? ent.radius : null
      if ((type === 'CIRCLE' || type === 'ARC') && radius) {
        const startAngle = typeof ent.startAngle === 'number' ? ent.startAngle : 0
        let endAngle = typeof ent.endAngle === 'number' ? ent.endAngle : 2 * Math.PI
        if (startAngle > endAngle) endAngle += 2 * Math.PI
        const cRaw = (ent.center as Record<string, unknown> | undefined) || {}
        const cx = typeof cRaw.x === 'number' ? cRaw.x : 0
        const cy = typeof cRaw.y === 'number' ? cRaw.y : 0
        const cz = typeof cRaw.z === 'number' ? cRaw.z : 0
        const segs = 48
        const step = (endAngle - startAngle) / segs
        let angle = startAngle
        let lastP = new Vector3(
          cx + Math.cos(angle) * radius,
          cy + Math.sin(angle) * radius,
          cz
        ).applyMatrix4(mat)
        for (let i = 0; i < segs; i++) {
          angle += step
          const nextP = new Vector3(
            cx + Math.cos(angle) * radius,
            cy + Math.sin(angle) * radius,
            cz
          ).applyMatrix4(mat)
          addSegment(layerName, activeBlock, colorHex, lastP, nextP)
          lastP = nextP
        }
      }
    }
  }

  if (dxf.entities) traverse(dxf.entities, new Matrix4(), '0', null)

  rawSegments.value = segments
  for (const [k, v] of Object.entries(counts)) layerCounts[k] = v
  for (const [k, v] of Object.entries(colors)) layerColors[k] = v
  for (const name of Object.keys(counts)) {
    if (hiddenLayers[name] === undefined) hiddenLayers[name] = false
  }
}

const load = async () => {
  const ext = props.fileName.split('.').pop()?.toLowerCase()
  if (ext !== 'dxf') {
    error.value = '暂不支持在线预览'
    return
  }

  isLoading.value = true
  error.value = null
  try {
    const text = await fetchDxfText()
    parseDxf(text)
    rebuildMergedView()
    await nextTick()
    fitToModel()
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  initThree()
  if (canvasEl.value) {
    canvasEl.value.addEventListener('pointerdown', onCanvasPointerDown, true)
    canvasEl.value.addEventListener('pointermove', onCanvasPointerMove, true)
    canvasEl.value.addEventListener('pointerleave', onCanvasPointerLeave, true)
  }

  const onKeydown = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return
    if (isPickMode.value) cancelPickAnnotation()
    else if (createFormOpen.value) cancelCreate()
  }
  window.addEventListener('keydown', onKeydown)

  await Promise.all([load(), loadAnnotations()])
  onBeforeUnmount(() => {
    if (canvasEl.value) {
      canvasEl.value.removeEventListener('pointerdown', onCanvasPointerDown, true)
      canvasEl.value.removeEventListener('pointermove', onCanvasPointerMove, true)
      canvasEl.value.removeEventListener('pointerleave', onCanvasPointerLeave, true)
    }
    window.removeEventListener('keydown', onKeydown)
  })
})

watch(
  () => [props.projectId, props.drawingId, props.blobId, props.fileName],
  async () => {
    await Promise.all([load(), loadAnnotations()])
  }
)

watch(theme, (value) => {
  if (import.meta.client) window.localStorage.setItem('cadViewerTheme', value)
  if (import.meta.client) {
    window.dispatchEvent(new CustomEvent('cadViewerThemeChanged', { detail: value }))
  }
  rebuildMergedView()
})

watch(createFormOpen, async (open) => {
  if (!open) return
  await nextTick()
  annotationTitleInputEl.value?.focus()
})

onBeforeUnmount(() => {
  if (rafId) cancelAnimationFrame(rafId)
  clearScene()
  if (annotationGroup && scene) scene.remove(annotationGroup)
  controls?.dispose()
  renderer?.dispose()
  renderer = null
  scene = null
  camera = null
  controls = null
})
</script>
