<template>
  <div class="h-full flex flex-col relative">
    <WorkbenchUploadSyncProjectSubscriber
      :project-id="props.projectId"
      :on-version-update="refreshModels"
    />

    <!-- Header -->
    <div
      class="h-14 border-b border-gray-100 bg-gray-50 flex items-center justify-between shrink-0 px-4"
    >
      <div class="flex items-center space-x-4">
        <button
          class="flex items-center space-x-1 text-[#00b4b6] bg-[#e6f7f8] hover:bg-[#00b4b6] hover:text-white px-3 py-1.5 rounded-[8px] text-sm font-medium transition-colors"
          @click="goBack"
        >
          <ArrowLeftIcon class="w-4 h-4" />
          <span>返回</span>
        </button>
        <h2 class="text-base font-medium text-[#333]">{{ projectName }}</h2>
      </div>
      <div class="flex space-x-2">
        <template v-if="activeTab === 'models'">
          <button
            class="flex items-center space-x-1 bg-gradient-to-r from-[#00b4b6] to-[#009fa1] text-white px-3 py-1.5 rounded-[8px] text-sm font-medium transition-opacity shadow-sm"
            :disabled="!displayedModels.length"
            :class="
              !displayedModels.length
                ? 'opacity-50 cursor-not-allowed pointer-events-none'
                : 'hover:opacity-90'
            "
            @click="viewAllIn3D"
          >
            <EyeIcon class="w-4 h-4" />
            <span>在3D中查看全部</span>
          </button>
          <button
            class="flex items-center space-x-1 bg-white/80 backdrop-blur-md border border-gray-200 text-gray-600 hover:bg-[#e6f7f8] hover:text-[#00b4b6] px-3 py-1.5 rounded text-sm font-medium transition-colors"
            @click="showImportModal = true"
          >
            <InboxIcon class="w-4 h-4" />
            <span>从模型库导入</span>
          </button>
          <button
            v-if="canUploadModel"
            class="flex items-center space-x-1 bg-[#e6f7f8] text-[#00b4b6] hover:bg-[#00b4b6] hover:text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
            :disabled="!uploadProject"
            :class="{ 'opacity-60 cursor-not-allowed': !uploadProject }"
            @click="triggerUploadPicker"
          >
            <ArrowUpTrayIcon class="w-4 h-4" />
            <span>上传模型</span>
          </button>
        </template>
        <button
          v-else-if="canUploadModel"
          class="flex items-center space-x-1 bg-[#e6f7f8] text-[#00b4b6] hover:bg-[#00b4b6] hover:text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
          @click="triggerDrawingUpload"
        >
          <ArrowUpTrayIcon class="w-4 h-4" />
          <span>上传图纸</span>
        </button>
      </div>
    </div>

    <div
      v-if="activeTab === 'drawings' && isDrawingUploading"
      class="shrink-0 px-4 py-2 bg-white/80 backdrop-blur-md border-b border-gray-100"
    >
      <div class="flex items-center justify-between text-xs text-gray-600">
        <span>图纸上传中</span>
        <span>{{ drawingUploadProgress }}%</span>
      </div>
      <div class="mt-1 h-2 w-full rounded bg-gray-200 overflow-hidden">
        <div
          class="h-full bg-[#00b4b6] transition-all"
          :style="{ width: `${drawingUploadProgress}%` }"
        />
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Left: Directory Tree -->
      <div
        class="w-64 border-r border-gray-100 bg-[#fafbfc] overflow-y-auto flex flex-col"
      >
        <div class="px-2 pb-4 space-y-0.5 flex-1">
          <div
            v-for="row in visibleRows"
            :key="row.id"
            class="group w-full flex items-center justify-between px-2 py-1.5 rounded-[8px] text-sm transition-colors"
            :style="{ paddingLeft: `${row.level * 12 + 8}px` }"
            :class="
              isSelected(row.id)
                ? 'bg-[#e6f7f8] text-[#00b4b6] font-medium'
                : 'text-gray-600 hover:bg-gray-100'
            "
          >
            <div class="flex items-center space-x-2 overflow-hidden flex-1 min-w-0">
              <button
                class="p-0.5 hover:bg-gray-200 rounded text-gray-400 disabled:opacity-40"
                :disabled="!row.hasChildren"
                @click.stop="toggleDir(row.id)"
              >
                <ChevronDownIcon
                  v-if="row.hasChildren && isExpanded(row.id)"
                  class="w-3.5 h-3.5"
                />
                <ChevronRightIcon v-else-if="row.hasChildren" class="w-3.5 h-3.5" />
                <span v-else class="inline-block w-3.5 h-3.5" />
              </button>
              <FolderIcon
                :class="[
                  'w-4 h-4 shrink-0',
                  isSelected(row.id) ? 'text-[#00b4b6]' : 'text-gray-400'
                ]"
              />
              <button
                class="truncate text-left flex-1"
                :class="isSelected(row.id) ? 'text-[#00b4b6]' : 'text-gray-600'"
                @click="setActiveDir(row.id)"
              >
                {{ row.name }}
              </button>
            </div>
            <div class="flex items-center opacity-0 group-hover:opacity-100">
              <button
                class="p-1 text-gray-400 hover:text-[#00b4b6]"
                title="添加子目录"
                @click.stop="openAddDirModal(row.id)"
              >
                <PlusIcon class="w-3.5 h-3.5" />
              </button>
              <button
                v-if="row.id !== ROOT_ID"
                class="p-1 text-gray-400 hover:text-red-500"
                title="删除目录"
                @click.stop="openDeleteDirConfirm(row.id, row.name)"
              >
                <TrashIcon class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Model List -->
      <div class="flex-1 flex flex-col overflow-hidden bg-white/80 backdrop-blur-md">
        <div
          class="py-4 border-b border-gray-100 flex justify-between items-center bg-white/80 backdrop-blur-md shrink-0"
        >
          <div class="flex items-center space-x-4 px-6 min-w-0">
            <!-- <h3 class="text-sm font-medium text-[#333] truncate">
              {{ activeDirBaseName }}
            </h3> -->
            <div
              class="flex items-center bg-[#f5f7fa] border border-gray-200 rounded-[10px] p-0.5"
              role="tablist"
              aria-label="列表切换"
            >
              <button
                role="tab"
                type="button"
                class="px-3 py-1.5 rounded-[8px] text-sm font-medium transition-colors"
                :class="
                  activeTab === 'models'
                    ? 'bg-white text-[#00b4b6] shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                "
                :aria-selected="activeTab === 'models'"
                @click="activeTab = 'models'"
              >
                模型列表
              </button>
              <button
                role="tab"
                type="button"
                class="px-3 py-1.5 rounded-[8px] text-sm font-medium transition-colors"
                :class="
                  activeTab === 'drawings'
                    ? 'bg-white text-[#00b4b6] shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                "
                :aria-selected="activeTab === 'drawings'"
                @click="activeTab = 'drawings'"
              >
                图纸列表
              </button>
            </div>
          </div>
          <div class="flex items-center space-x-4 pr-4">
            <div class="relative">
              <MagnifyingGlassIcon
                class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
              />
              <label :for="searchInputId" class="sr-only">{{ searchLabel }}</label>
              <input
                :id="searchInputId"
                v-model="searchQuery"
                type="text"
                :placeholder="searchPlaceholder"
                class="search-input w-64 bg-[#f5f7fa] border border-transparent rounded-[8px] py-1.5 pl-9 pr-4 text-sm focus:outline-none focus:border-[#00b4b6] focus:bg-white/80 text-[#333] transition-all"
              />
            </div>
          </div>
        </div>

        <div class="flex-1 overflow-auto bg-[#f5f7fa] p-6">
          <template v-if="activeTab === 'models'">
            <div
              v-if="modelsLoading && !displayedModels.length"
              class="bg-white/80 backdrop-blur-md border border-gray-200 rounded-[8px] p-12 text-center text-gray-500"
            >
              模型加载中...
            </div>
            <div
              v-else-if="displayedModels.length === 0"
              class="bg-white/80 backdrop-blur-md border border-gray-200 rounded-[8px] p-12 text-center text-gray-500"
            >
              该目录下暂无模型，请从模型库导入或上传。
            </div>
            <div
              v-else-if="viewMode === 'grid'"
              class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              <div
                v-for="model in displayedModels"
                :key="model.id"
                class="bg-white/80 backdrop-blur-md border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow flex flex-col h-[280px] cursor-pointer"
                role="button"
                tabindex="0"
                @click="openModel(model)"
                @keydown.enter.prevent="openModel(model)"
                @keydown.space.prevent="openModel(model)"
              >
                <div class="p-3 flex justify-between items-start shrink-0">
                  <div class="min-w-0 pr-2">
                    <h3
                      class="text-sm font-medium text-[#333] line-clamp-2 whitespace-pre-line leading-snug"
                    >
                      <span>{{ model.name }}</span>
                      <span
                        v-if="getModelRuntimeStatus(model)"
                        class="ml-2 inline-flex items-center gap-1 align-middle"
                      >
                        <span class="text-xs font-normal text-gray-400">
                          {{ getModelRuntimeStatusText(model) }}
                        </span>
                        <button
                          v-if="shouldShowRetryAction(model)"
                          type="button"
                          class="inline-flex cursor-pointer items-center rounded-full border border-[#bfecee] bg-[#e6f7f8] px-2 py-0.5 text-[11px] font-medium leading-none text-[#00b4b6] transition-colors hover:bg-[#00b4b6] hover:text-white"
                          @click.stop="retryModelSync(model)"
                        >
                          重试
                        </button>
                      </span>
                    </h3>
                    <div
                      v-if="shouldShowProgressBar(getModelRuntimeStatus(model))"
                      class="mt-1 w-56"
                    >
                      <CommonModelRuntimeProgressBar
                        :status="getModelRuntimeStatus(model)"
                        :progress="getModelRuntimeProgress(model)"
                        :progress-phase="getModelRuntimeProgressPhase(model)"
                      />
                    </div>
                  </div>
                  <button class="text-gray-400 hover:text-gray-600 p-1 shrink-0">
                    <EllipsisHorizontalIcon class="h-4 w-4" />
                  </button>
                </div>
                <div
                  class="flex-1 flex flex-col items-center justify-center p-4 min-h-0 bg-gradient-to-br from-gray-50 to-gray-100"
                >
                  <div
                    v-if="model.previewUrl"
                    class="w-full h-full rounded-md overflow-hidden border border-gray-200"
                  >
                    <PreviewImage :preview-url="model.previewUrl" />
                  </div>
                  <CubeIcon v-else class="w-20 h-20 text-gray-300" />
                </div>
                <div
                  class="p-3 border-t border-gray-100 flex justify-between items-end shrink-0"
                >
                  <div class="flex flex-col">
                    <span class="text-xs text-gray-500">
                      {{ formatDate(model.updatedAt) }}
                    </span>
                  </div>
                  <div class="flex items-center space-x-3 text-gray-500">
                    <div class="flex items-center space-x-1" title="评论">
                      <ChatBubbleLeftIcon class="h-3.5 w-3.5" />
                      <span class="text-xs">{{ model.commentCount }}</span>
                    </div>
                    <div class="flex items-center space-x-1" title="版本">
                      <ClockIcon class="h-3.5 w-3.5" />
                      <span class="text-xs">{{ model.versionsCount || 0 }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div
              v-else
              class="bg-white/80 backdrop-blur-md border border-gray-200 rounded-lg overflow-hidden"
            >
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr
                    class="bg-[#f8f9fa] text-gray-500 text-sm border-b border-gray-200"
                  >
                    <th class="px-4 py-3 font-medium text-left min-w-[200px]">
                      模型名称
                    </th>
                    <th class="px-4 py-3 font-medium text-left w-[200px]">更新时间</th>
                    <th class="px-4 py-3 font-medium text-left w-[150px]">版本数</th>
                    <th class="px-4 py-3 font-medium text-left w-[250px]">操作</th>
                  </tr>
                </thead>
                <tbody class="text-sm text-[#333] divide-y divide-gray-100">
                  <tr
                    v-for="model in displayedModels"
                    :key="model.id"
                    class="hover:bg-[#fcfcfc] transition-colors group cursor-pointer"
                    @click="openModel(model)"
                  >
                    <td class="px-4 py-3">
                      <div class="flex items-center space-x-3">
                        <div
                          v-if="model.previewUrl"
                          class="w-12 h-8 rounded overflow-hidden border border-gray-200 bg-gray-50 shrink-0"
                        >
                          <PreviewImage :preview-url="model.previewUrl" />
                        </div>
                        <CubeIcon v-else class="h-4 w-4 text-gray-400 shrink-0" />
                        <div class="min-w-0">
                          <span class="font-medium whitespace-pre-line">
                            {{ model.name }}
                            <span
                              v-if="getModelRuntimeStatus(model)"
                              class="ml-2 inline-flex items-center gap-1 align-middle"
                            >
                              <span class="text-xs font-normal text-gray-400">
                                {{ getModelRuntimeStatusText(model) }}
                              </span>
                              <button
                                v-if="shouldShowRetryAction(model)"
                                type="button"
                                class="inline-flex cursor-pointer items-center rounded-full border border-[#bfecee] bg-[#e6f7f8] px-2 py-0.5 text-[11px] font-medium leading-none text-[#00b4b6] transition-colors hover:bg-[#00b4b6] hover:text-white"
                                @click.stop="retryModelSync(model)"
                              >
                                重试
                              </button>
                            </span>
                          </span>
                          <div
                            v-if="shouldShowProgressBar(getModelRuntimeStatus(model))"
                            class="mt-1 w-56"
                          >
                            <CommonModelRuntimeProgressBar
                              :status="getModelRuntimeStatus(model)"
                              :progress="getModelRuntimeProgress(model)"
                              :progress-phase="getModelRuntimeProgressPhase(model)"
                            />
                          </div>
                        </div>
                      </div>
                    </td>
                    <td class="px-4 py-3 text-left text-gray-500">
                      {{ formatDate(model.updatedAt) }}
                    </td>
                    <td class="px-4 py-3 text-left text-gray-500">
                      {{ model.versionsCount || 0 }}
                    </td>
                    <td class="px-4 py-3 text-left">
                      <div class="flex items-center justify-start space-x-2">
                        <button
                          title="查看"
                          class="p-1.5 text-[#00b4b6] hover:bg-[#e6f7f8] rounded"
                          @click.stop="openModel(model)"
                        >
                          <EyeIcon class="h-4 w-4" />
                        </button>
                        <button
                          v-if="
                            model.raw.permissions.canCreateVersion.authorized &&
                            hasModelOp('canEdit')
                          "
                          title="上传新版本"
                          class="p-1.5 text-[#00b4b6] hover:bg-[#e6f7f8] rounded"
                          @click.stop="triggerVersionUploadPicker(model)"
                        >
                          <ArrowUpTrayIcon class="h-4 w-4" />
                        </button>
                        <button
                          v-if="hasModelOp('canDownload')"
                          title="数据下载及导出"
                          class="p-1.5 text-[#00b4b6] hover:bg-[#e6f7f8] rounded"
                          @click.stop="downloadModelSource(model)"
                        >
                          <ArrowDownTrayIcon class="h-4 w-4" />
                        </button>
                        <button
                          v-if="canDeleteModel(model)"
                          title="删除"
                          class="p-1.5 text-red-500 hover:bg-red-50 rounded"
                          @click.stop="handleDeleteModel(model)"
                        >
                          <TrashIcon class="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <InfiniteLoading
              v-if="displayedModels.length && moreToLoad"
              :settings="{ identifier: infiniteLoaderId }"
              @infinite="infiniteLoad"
            />
          </template>

          <template v-else>
            <DrawingsTab
              :project-id="props.projectId"
              :active-dir="activeDir"
              :root-id="ROOT_ID"
              :view-mode="viewMode"
              :search-query="searchQuery"
              :refresh-key="drawingsRefreshKey"
            />
          </template>
        </div>
      </div>
    </div>

    <!-- Import Dialog -->
    <ImportDialog
      v-if="showImportModal"
      :active-dir-name="activeDirName"
      :importing="isImportingFromLibrary"
      @close="showImportModal = false"
      @import="handleImport"
    />
    <ProjectCardImportFileArea
      v-if="uploadProject"
      ref="uploadAreaRef"
      :project="uploadProject"
      :skip-dtp-model-sync="true"
      class="hidden"
      @uploading="onModelUploading"
    />
    <ProjectCardImportFileArea
      v-if="uploadProject && selectedVersionUploadModel"
      ref="versionUploadAreaRef"
      :key="selectedVersionUploadModel.id"
      :project="uploadProject"
      :model="selectedVersionUploadModel.raw"
      :skip-dtp-model-sync="true"
      class="hidden"
      @uploading="onModelUploading"
    />
    <label for="workbench-drawing-upload" class="sr-only">上传图纸</label>
    <input
      id="workbench-drawing-upload"
      ref="drawingFileInputRef"
      type="file"
      accept=".dxf,.dwg"
      class="hidden"
      @change="onDrawingFilePicked"
    />
    <DeleteDialog
      v-if="deleteTargetModel"
      v-model:open="showDeleteModelConfirm"
      :project-id="props.projectId"
      :model="deleteTargetModel.raw"
      @deleted="onModelDeleted"
    />
    <UploadsDialog
      v-if="selectedDownloadModel"
      v-model:open="downloadsDialogOpen"
      :project-id="props.projectId"
      :model-id="selectedDownloadModel.id"
      title="选择要下载的版本"
      :use-auth-download="true"
      @downloaded="onUploadDownloaded"
    />

    <!-- Delete Directory Confirm Modal -->
    <div
      v-if="showDeleteDirConfirm"
      class="absolute inset-0 z-50 flex items-center justify-center bg-white/40 backdrop-blur-sm"
    >
      <div
        class="bg-white/80 backdrop-blur-md rounded-[26px] shadow-2xl w-[400px] flex flex-col overflow-hidden"
      >
        <div class="p-4 border-b border-gray-100 flex justify-between items-center">
          <h3 class="text-lg font-medium text-[#333]">删除目录</h3>
          <button
            class="text-gray-400 hover:text-gray-600"
            @click="closeDeleteDirConfirm"
          >
            关闭
          </button>
        </div>
        <div class="p-6">
          <p class="text-sm text-gray-700">
            确定要删除目录
            <span class="font-medium text-[#333]">「{{ deleteDirTargetName }}」</span>
            吗？该操作不可恢复。
          </p>
        </div>
        <div
          class="p-4 border-t border-gray-100 flex justify-end space-x-3 bg-white/50"
        >
          <button
            class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            @click="closeDeleteDirConfirm"
          >
            取消
          </button>
          <button
            :disabled="deletingDir"
            :class="[
              'px-4 py-2 text-sm font-medium text-white rounded-md transition-colors',
              deletingDir
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-red-500 hover:bg-red-600'
            ]"
            @click="deleteDirectory"
          >
            {{ deletingDir ? '删除中...' : '确认删除' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Add Directory Modal -->
    <div
      v-if="showDirModal"
      class="absolute inset-0 z-50 flex items-center justify-center bg-white/40 backdrop-blur-sm"
    >
      <div
        class="bg-white/80 backdrop-blur-md rounded-[26px] shadow-2xl w-[400px] flex flex-col overflow-hidden"
      >
        <div class="p-4 border-b border-gray-100 flex justify-between items-center">
          <h3 class="text-lg font-medium text-[#333]">
            {{
              dirModalParentId && dirModalParentId !== ROOT_ID
                ? '新建子目录'
                : '新建目录'
            }}
          </h3>
          <button class="text-gray-400 hover:text-gray-600" @click="closeDirModal">
            关闭
          </button>
        </div>
        <div class="p-6">
          <label
            for="new-directory-name"
            class="block text-sm font-medium text-gray-700 mb-2"
          >
            目录名称
          </label>
          <input
            id="new-directory-name"
            v-model="newDirName"
            type="text"
            placeholder="请输入目录名称"
            class="w-full bg-white/80 backdrop-blur-md border border-gray-300 rounded-md py-2 px-3 text-sm focus:outline-none focus:border-[#00b4b6] focus:ring-1 focus:ring-[#00b4b6] text-[#333]"
            @keyup.enter="addDirectory"
          />
        </div>
        <div
          class="p-4 border-t border-gray-100 flex justify-end space-x-3 bg-white/50"
        >
          <button
            class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            @click="closeDirModal"
          >
            取消
          </button>
          <button
            :disabled="!newDirName.trim()"
            :class="[
              'px-4 py-2 text-sm font-medium text-white rounded-md transition-colors',
              newDirName.trim()
                ? 'bg-[#00b4b6] hover:bg-[#009fa1]'
                : 'bg-gray-300 cursor-not-allowed'
            ]"
            @click="addDirectory"
          >
            确认
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ArrowLeftIcon,
  EyeIcon,
  InboxIcon,
  ArrowUpTrayIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  EllipsisHorizontalIcon,
  CubeIcon,
  ChatBubbleLeftIcon,
  ClockIcon,
  ArrowDownTrayIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  FolderIcon,
  TrashIcon
} from '@heroicons/vue/24/outline'
import { useApolloClient, useQuery } from '@vue/apollo-composable'
import type {
  ProjectCardImportFileArea_ProjectFragment,
  ProjectPageLatestItemsModelItemFragment,
  GetModelUploadsQuery
} from '~/lib/common/generated/gql/graphql'
import { GetModelUploadsDocument } from '~/lib/common/generated/gql/graphql'
import {
  latestModelsPaginationQuery,
  latestModelsQuery
} from '~/lib/projects/graphql/queries'
import { FileUploadConvertedStatus } from '~/lib/core/api/fileImport'
import type { InfiniteLoaderState } from '~~/lib/global/helpers/components'
import { getModelItemRoute } from '~/lib/projects/helpers/models'
import dayjs from 'dayjs'
import type { FileAreaUploadingPayload } from '~/lib/form/helpers/fileUpload'
import { gql } from 'graphql-tag'
import DeleteDialog from '~/components/project/page/models/card/DeleteDialog.vue'
import UploadsDialog from '~/components/project/page/models/UploadsDialog.vue'
import ImportDialog from '~/components/projects/workbench/ImportDialog.vue'
import DrawingsTab from '~/components/projects/workbench/DrawingsTab.vue'
import ProjectCardImportFileArea from '~/components/project/CardImportFileArea.vue'
import WorkbenchUploadSyncProjectSubscriber from '~/components/singleton/WorkbenchUploadSyncProjectSubscriber.vue'
import { useWorkbenchDrawingsApi } from '~/components/projects/workbench/drawingsApi'
import {
  resumableUpload,
  type ResumableUploadBackend
} from '~/lib/core/api/resumableUpload'
import { useActiveUser } from '~~/lib/auth/composables/activeUser'
import { useUserPermissions } from '~~/lib/auth/composables/userPermissions'
import {
  mapClientUploadProgressToRuntimePercent,
  mapProgressPhaseToDescription,
  useWorkbenchUploadSync
} from '~~/lib/projects/composables/workbenchUploadSync'
import { ToastNotificationType, useGlobalToast } from '~~/lib/common/composables/toast'
import { ensureError, Roles } from '@speckle/shared'
import type { ModelLibraryListItem } from '~/lib/projects/composables/modelLibrary'
import { useApiOrigin } from '~~/composables/env'
import { useAuthCookie } from '~~/lib/auth/composables/auth'
import { useInternalUrlUtils } from '~~/lib/common/composables/url'
import { useFileDownload } from '~~/lib/core/composables/fileUpload'

const props = defineProps<{
  projectId: string
}>()

const router = useRouter()
const logger = useLogger()
const apollo = useApolloClient().client
const { triggerNotification } = useGlobalToast()
const apiOrigin = useApiOrigin()
const authToken = useAuthCookie()
const { updateUrlSearchParams } = useInternalUrlUtils()
const { downloadWithAuth } = useFileDownload()
const { activeUser, isLoggedIn } = useActiveUser()
const { ensureLoaded: ensureUserPermsLoaded, hasModelOp } = useUserPermissions()
void ensureUserPermsLoaded()

const goBack = () => {
  router.push('/projects')
}

type RawTreeItem = {
  id: string
  name: string
  parent: string | null
  relative: string[]
}

type VisibleRow = {
  id: string
  name: string
  level: number
  hasChildren: boolean
}

type ModelListItem = {
  id: string
  name: string
  seedId: string
  updatedAt: string
  versionsCount: number
  commentCount: number
  previewUrl?: string | null
  raw: ProjectPageLatestItemsModelItemFragment
}

type ActiveModelUpload = FileAreaUploadingPayload['upload'] & {
  model?: {
    id?: string | null
  } | null
}

const ROOT_ID = 'all'
const projectName = computed(() => uploadProject.value?.name || '项目工作台')

const activeDir = ref(ROOT_ID)
const activeTab = ref<'models' | 'drawings'>('models')
const viewMode = ref<'grid' | 'list'>('list')
const searchQuery = ref('')

const showImportModal = ref(false)
const showDirModal = ref(false)
const dirModalParentId = ref<string | null>(null)
const newDirName = ref('')
const infiniteLoaderId = ref('')
const loadCacheBuster = ref(0)
const isModelUploading = ref(false)
const activeModelUpload = ref<ActiveModelUpload | null>(null)
const uploadAreaRef = ref<null | { triggerPicker: () => void }>(null)
const versionUploadAreaRef = ref<null | { triggerPicker: () => void }>(null)
const selectedVersionUploadModel = ref<ModelListItem | null>(null)
const showDeleteModelConfirm = ref(false)
const deleteTargetModel = ref<ModelListItem | null>(null)
const isImportingFromLibrary = ref(false)
const drawingsRefreshKey = ref(0)
const isDrawingUploading = ref(false)
const drawingUploadProgress = ref(0)
const drawingFileInputRef = ref<HTMLInputElement | null>(null)
const drawingsApi = useWorkbenchDrawingsApi()

const {
  getLatestTask,
  isModelSyncing,
  retryTask,
  syncVisibleTasks,
  cleanupVisibleTaskSubscriptions,
  getModelRuntimeProgress: getTaskRuntimeProgress,
  getModelRuntimeProgressMessage
} = useWorkbenchUploadSync()

const downloadsDialogOpen = ref(false)
const selectedDownloadModel = ref<ModelListItem | null>(null)

const openDownloadsDialog = (model: ModelListItem) => {
  selectedDownloadModel.value = model
  downloadsDialogOpen.value = true
}

const downloadCustomAttributesExcel = async (model: ModelListItem) => {
  const response = await fetch(
    `${apiOrigin}/api/v1/projects/${props.projectId}/models/${model.id}/custom-attributes-excel`,
    {
      method: 'GET',
      credentials: 'same-origin',
      headers: authToken.value
        ? {
            Authorization: `Bearer ${authToken.value}`
          }
        : undefined
    }
  )

  if (!response.ok) {
    let message = `导出自定义属性失败 (${response.status})`
    try {
      const body = (await response.json()) as {
        message?: string
        statusMessage?: string
      }
      if (body.message) message = body.message
      else if (body.statusMessage) message = body.statusMessage
    } catch {
      // ignore non-json body
    }
    throw new Error(message)
  }

  const blob = await response.blob()
  const disposition = response.headers.get('content-disposition') || ''
  const fileNameMatch =
    disposition.match(/filename\*=UTF-8''([^;]+)/i) ||
    disposition.match(/filename="?([^"]+)"?/i)
  const fileName = fileNameMatch?.[1]
    ? decodeURIComponent(fileNameMatch[1])
    : `${(model.name || model.id).trim() || model.id}-自定义属性.xlsx`
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(objectUrl)
}

const onUploadDownloaded = async () => {
  const model = selectedDownloadModel.value
  if (!model) return

  try {
    await downloadCustomAttributesExcel(model)
  } catch (e) {
    triggerNotification({
      type: ToastNotificationType.Danger,
      title: '自定义属性导出失败',
      description: ensureError(e).message
    })
  }
}

const getModelRuntimeStatus = (model: ModelListItem) => {
  if (activeModelUpload.value?.model?.id === model.id) {
    return '上传中'
  }

  const pendingUpload = model.raw.pendingImportedVersions?.[0]
  const hasVersion = !!model.raw.lastVersion?.items?.[0]?.id
  const latestTask = getLatestModelTask(model)
  const isOrphanPendingUpload =
    !!pendingUpload &&
    !pendingUpload.convertedCommitId &&
    !isModelSyncing({ projectId: props.projectId, modelId: model.id }) &&
    activeModelUpload.value?.model?.id !== model.id &&
    (hasVersion || !latestTask || latestTask.status === 'succeeded')

  if (
    pendingUpload &&
    !isOrphanPendingUpload &&
    [FileUploadConvertedStatus.Queued, FileUploadConvertedStatus.Converting].includes(
      pendingUpload.convertedStatus as FileUploadConvertedStatus
    )
  ) {
    return '模型处理中'
  }

  const latestVersion = model.raw.lastVersion?.items?.[0]
  const latestUpload = model.raw.lastUpload?.items?.[0]
  if (!latestVersion?.id && !pendingUpload && !latestUpload?.id) {
    return '暂无模型'
  }

  if (model.raw.lastVersion?.items?.[0]?.seedId?.trim()) {
    return '已同步'
  }

  const latestUploadStatus = latestUpload?.convertedStatus
  if (latestUploadStatus === FileUploadConvertedStatus.Error) {
    return '转换失败'
  }

  if (
    isModelSyncing({
      projectId: props.projectId,
      modelId: model.id
    })
  ) {
    return '同步中'
  }

  if (latestTask && ['speckle_converting', 'failed'].includes(latestTask.status)) {
    return '待同步'
  }

  return null
}

const getModelRuntimeStatusDescription = (model: ModelListItem) => {
  const pendingUpload = model.raw.pendingImportedVersions?.[0]
  const isRvtFile =
    pendingUpload?.fileType?.toLowerCase() === 'rvt' ||
    /\.rvt$/i.test(pendingUpload?.fileName || '') ||
    /\.rvt$/i.test(model.name || '')
  if (!isRvtFile) return null

  const convertedStatus = pendingUpload?.convertedStatus
  const latestTask = getLatestModelTask(model)
  const isConvertingStage =
    convertedStatus === FileUploadConvertedStatus.Queued ||
    convertedStatus === FileUploadConvertedStatus.Converting ||
    latestTask?.status === 'speckle_converting'

  if (!isConvertingStage) return null

  const message = getModelRuntimeProgressMessage({
    projectId: props.projectId,
    modelId: model.id
  })
  if (message?.trim()) return message.trim()

  if (pendingUpload?.progressMessage?.trim()) return pendingUpload.progressMessage.trim()

  const phaseDescription = mapProgressPhaseToDescription(pendingUpload?.progressPhase)
  if (phaseDescription) return phaseDescription

  return null
}

const getModelRuntimeStatusText = (model: ModelListItem) => {
  const status = getModelRuntimeStatus(model)
  if (!status) return null
  const desc = getModelRuntimeStatusDescription(model)
  return desc ? `${status}（${desc}）` : status
}

const mapIfcConversionProgressToRuntimePercent = (
  progress: number | null | undefined
) => {
  if (typeof progress !== 'number' || Number.isNaN(progress)) return null

  const normalizedProgress = Math.max(0, Math.min(100, progress))
  const runtimeStart = 20
  const runtimeEnd = 60
  if (normalizedProgress >= 100) return runtimeEnd

  return Math.min(
    runtimeEnd,
    Math.round(runtimeStart + (normalizedProgress / 100) * (runtimeEnd - runtimeStart))
  )
}

const getLocalUploadRuntimeProgress = (model: ModelListItem) => {
  if (activeModelUpload.value?.model?.id !== model.id) return null
  return mapClientUploadProgressToRuntimePercent(activeModelUpload.value.progress)
}

const getModelRuntimeProgress = (model: ModelListItem) => {
  const localUploadProgress = getLocalUploadRuntimeProgress(model)
  if (localUploadProgress !== null) return localUploadProgress

  const taskProgress = getTaskRuntimeProgress({
    projectId: props.projectId,
    modelId: model.id
  })?.percent
  if (typeof taskProgress === 'number') return taskProgress

  return mapIfcConversionProgressToRuntimePercent(
    model.raw.pendingImportedVersions?.[0]?.progressPercent
  )
}

const getModelRuntimeProgressPhase = (model: ModelListItem) =>
  getTaskRuntimeProgress({
    projectId: props.projectId,
    modelId: model.id
  })?.phase ?? null

const getLatestModelTask = (model: ModelListItem) =>
  getLatestTask({
    projectId: props.projectId,
    modelId: model.id
  })

const shouldShowRetryAction = (model: ModelListItem) =>
  getLatestModelTask(model)?.status === 'failed'

const shouldShowProgressBar = (status: string | null) => {
  if (!status) return false
  return ['上传中', '模型处理中', '同步中', '待同步', '转换失败'].includes(status)
}

const canDeleteModel = (model: ModelListItem) => {
  return (
    model.raw.permissions.canDelete.authorized ||
    activeUser.value?.role === Roles.Server.User ||
    activeUser.value?.role === Roles.Server.Admin
  )
}

const triggerUploadPicker = () => {
  uploadAreaRef.value?.triggerPicker()
}

const triggerDrawingUpload = () => {
  if (isDrawingUploading.value) return
  drawingFileInputRef.value?.click()
}

const onDrawingFilePicked = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  isDrawingUploading.value = true
  drawingUploadProgress.value = 0
  try {
    const backend: ResumableUploadBackend = {
      createMultipart: async () => {
        const { blobId, uploadId } = await drawingsApi.createMultipartUpload(
          props.projectId,
          file.name
        )
        return { fileId: blobId, uploadId }
      },
      getPartUploadUrl: ({ fileId, uploadId, partNumber }) =>
        drawingsApi
          .getPartUploadUrl(props.projectId, {
            blobId: fileId,
            uploadId,
            partNumber
          })
          .then((res) => res.url),
      listUploadedParts: ({ fileId, uploadId }) =>
        drawingsApi.listUploadedParts(props.projectId, {
          blobId: fileId,
          uploadId
        }),
      completeMultipart: ({ fileId, uploadId, parts }) =>
        drawingsApi.completeMultipartUpload(props.projectId, {
          blobId: fileId,
          uploadId,
          parts
        }),
      abortMultipart: ({ fileId, uploadId }) =>
        drawingsApi.abortMultipartUpload(props.projectId, {
          blobId: fileId,
          uploadId
        })
    }

    const uploaded = await resumableUpload(backend, {
      file,
      onProgress: (pct) => {
        drawingUploadProgress.value = Math.min(99, pct)
      },
      storageKey: `drawing-upload:${props.projectId}:${file.name}:${file.size}`
    })

    const blobId = uploaded.fileId
    const completed = uploaded.result as {
      fileSize: number | null
      fileHash: string | null
    }

    const name = file.name.replace(/\.[^/.]+$/, '')
    await drawingsApi.createDrawing(props.projectId, {
      blobId,
      fileName: file.name,
      contentType: file.type || 'application/octet-stream',
      fileSize: completed?.fileSize ?? file.size,
      folderId: activeDir.value === ROOT_ID ? null : activeDir.value,
      name: name.trim() || file.name
    })
    drawingUploadProgress.value = 100

    drawingsRefreshKey.value++
    triggerNotification({
      type: ToastNotificationType.Success,
      title: '上传成功',
      description: file.name
    })
  } catch (err) {
    triggerNotification({
      type: ToastNotificationType.Danger,
      title: '上传失败',
      description: ensureError(err).message
    })
  } finally {
    isDrawingUploading.value = false
    drawingUploadProgress.value = 0
  }
}

const triggerVersionUploadPicker = async (model: ModelListItem) => {
  selectedVersionUploadModel.value = model
  await nextTick()
  versionUploadAreaRef.value?.triggerPicker()
}

const onModelUploading = async (payload: FileAreaUploadingPayload) => {
  const wasUploading = isModelUploading.value
  isModelUploading.value = payload.isUploading
  activeModelUpload.value = payload.isUploading
    ? (payload.upload as ActiveModelUpload)
    : null
  if (wasUploading && !payload.isUploading) {
    selectedVersionUploadModel.value = null
    loadCacheBuster.value++
    await Promise.all([loadFolders(), refreshModels()])
  }
}

const workbenchUploadProjectQuery = gql`
  query WorkbenchUploadProject($projectId: String!) {
    project(id: $projectId) {
      id
      name
      permissions {
        canCreateModel {
          authorized
          code
          message
          payload
          errorMessage
        }
      }
    }
  }
`

const { result: uploadProjectResult } = useQuery(workbenchUploadProjectQuery, () => ({
  projectId: props.projectId
}))
const uploadProject = computed(
  () =>
    (uploadProjectResult.value?.project as ProjectCardImportFileArea_ProjectFragment & {
      name?: string
    }) || null
)
const canUploadModel = computed(() => isLoggedIn.value && hasModelOp('canUpload'))

const searchInputId = computed(() =>
  activeTab.value === 'models' ? 'workbench-model-search' : 'workbench-drawing-search'
)
const searchLabel = computed(() =>
  activeTab.value === 'models' ? '搜索模型' : '搜索图纸'
)
const searchPlaceholder = computed(() =>
  activeTab.value === 'models' ? '搜索模型...' : '搜索图纸...'
)

const projectFoldersByParentQuery = gql`
  query WorkbenchProjectFoldersByParent($projectId: String!, $parentId: String) {
    project(id: $projectId) {
      id
      folders(limit: 100, filter: { parentId: $parentId }) {
        items {
          id
          name
          projectId
          parentId
          models {
            id
          }
        }
      }
    }
  }
`

const createFolderMutation = gql`
  mutation WorkbenchCreateFolder($input: CreateFolderInput!) {
    folderMutations {
      create(input: $input) {
        id
      }
    }
  }
`

const deleteFolderMutation = gql`
  mutation WorkbenchDeleteFolder($input: DeleteFolderInput!) {
    folderMutations {
      delete(input: $input)
    }
  }
`

const importSourceModelQuery = gql`
  query WorkbenchImportSourceModel($projectId: String!, $modelId: String!) {
    project(id: $projectId) {
      id
      model(id: $modelId) {
        id
        name
        versions(limit: 1) {
          items {
            id
            referencedObject
          }
        }
      }
    }
  }
`

const createImportedModelMutation = gql`
  mutation WorkbenchCreateImportedModel($input: CreateModelInput!) {
    modelMutations {
      create(input: $input) {
        id
        name
      }
    }
  }
`

const createImportedVersionMutation = gql`
  mutation WorkbenchCreateImportedVersion($input: CreateVersionInput!) {
    versionMutations {
      create(input: $input) {
        id
      }
    }
  }
`

const createObjectsMutation = gql`
  mutation WorkbenchCreateObjects($input: ObjectCreateInput!) {
    objectCreate(objectInput: $input)
  }
`

const addModelToFolderMutation = gql`
  mutation WorkbenchAddModelToFolder($input: AddModelToFolderInput!) {
    folderMutations {
      addModel(input: $input)
    }
  }
`

type ProjectModelObjectsResponse = {
  projectId: string
  modelId: string
  modelName: string
  versionId: string | null
  rootObjectId: string | null
  totalCount: number
  limit: number
  cursor: string | null
  items: Array<{
    id: string
    data: Record<string, unknown> | null
  }>
}

type ProjectModelObjectResponse = {
  projectId: string
  modelId: string
  modelName: string
  versionId: string | null
  rootObjectId: string | null
  item: {
    id: string
    data: Record<string, unknown> | null
  }
}

const getApiHeaders = () => {
  const headers: Record<string, string> = {}
  if (authToken.value) headers.Authorization = `Bearer ${authToken.value}`
  return headers
}

async function requestJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: getApiHeaders()
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || `Request failed with status ${response.status}`)
  }

  return (await response.json()) as T
}

const loadSourceModelObjectTree = async (params: {
  projectId: string
  modelId: string
  rootObjectId: string
}) => {
  const rootObjectUrl: string = `${apiOrigin}/api/v1/projects/${params.projectId}/models/${params.modelId}/objects/${params.rootObjectId}`
  const rootResponse = await requestJson<ProjectModelObjectResponse>(rootObjectUrl)

  const objects: Record<string, unknown>[] = []
  if (rootResponse.item.data) {
    objects.push(rootResponse.item.data)
  }

  let cursor: string | null = null
  do {
    const objectsUrl = updateUrlSearchParams(
      `${apiOrigin}/api/v1/projects/${params.projectId}/models/${params.modelId}/objects`,
      (searchParams) => {
        searchParams.set('limit', '100')
        if (cursor) searchParams.set('cursor', cursor)
      }
    )
    const response = await requestJson<ProjectModelObjectsResponse>(objectsUrl)
    response.items.forEach((item: ProjectModelObjectsResponse['items'][number]) => {
      if (item.data) objects.push(item.data)
    })
    cursor = response.cursor || null
  } while (cursor)

  return objects
}

const retryModelSync = async (model: ModelListItem) => {
  const latestTask = getLatestModelTask(model)
  if (!latestTask || latestTask.status !== 'failed') return

  try {
    await retryTask(latestTask.id)
  } catch (e) {
    triggerNotification({
      type: ToastNotificationType.Danger,
      title: '重试失败',
      description: ensureError(e).message
    })
  }
}

const downloadModelSource = async (model: ModelListItem) => {
  if (model.versionsCount > 1) {
    openDownloadsDialog(model)
    return
  }

  try {
    const result = (await apollo.query({
      query: GetModelUploadsDocument,
      variables: {
        projectId: props.projectId,
        modelId: model.id,
        input: {
          cursor: null,
          limit: 2
        }
      },
      fetchPolicy: 'no-cache'
    })) as { data?: GetModelUploadsQuery }

    const uploads = result.data?.project?.model.uploads.items || []
    if (uploads.length > 1) {
      openDownloadsDialog(model)
      return
    }

    const upload = uploads[0]
    if (upload?.id && upload.fileName) {
      await downloadWithAuth({
        blobId: upload.id,
        fileName: upload.fileName,
        projectId: props.projectId
      })
      await downloadCustomAttributesExcel(model)
      return
    }
  } catch (e) {
    triggerNotification({
      type: ToastNotificationType.Danger,
      title: '加载版本列表失败',
      description: ensureError(e).message
    })
    return
  }

  triggerNotification({
    type: ToastNotificationType.Info,
    title: '暂无可下载源文件',
    description: '该模型当前没有可下载的源文件。'
  })
  try {
    await downloadCustomAttributesExcel(model)
  } catch (e) {
    triggerNotification({
      type: ToastNotificationType.Danger,
      title: '自定义属性导出失败',
      description: ensureError(e).message
    })
  }
}

const folderRows = ref<RawTreeItem[]>([])
const expandedDirIds = ref<Set<string>>(new Set([ROOT_ID]))

const setActiveDir = (id: string) => {
  activeDir.value = id
}

const toggleDir = (id: string) => {
  if (!visibleRows.value.find((row) => row.id === id)?.hasChildren) return
  if (expandedDirIds.value.has(id)) {
    expandedDirIds.value.delete(id)
  } else {
    expandedDirIds.value.add(id)
  }
  expandedDirIds.value = new Set(expandedDirIds.value)
}

const openAddDirModal = (parentId: string | null) => {
  dirModalParentId.value = parentId
  newDirName.value = ''
  showDirModal.value = true
}

const closeDirModal = () => {
  showDirModal.value = false
  dirModalParentId.value = null
  newDirName.value = ''
}

const showDeleteDirConfirm = ref(false)
const deleteDirTargetId = ref<string | null>(null)
const deleteDirTargetName = ref('')
const deletingDir = ref(false)

const openDeleteDirConfirm = (id: string, name: string) => {
  deleteDirTargetId.value = id
  deleteDirTargetName.value = name
  showDeleteDirConfirm.value = true
}

const closeDeleteDirConfirm = () => {
  showDeleteDirConfirm.value = false
  deleteDirTargetId.value = null
  deleteDirTargetName.value = ''
}

const deleteDirectory = async () => {
  if (!deleteDirTargetId.value) return
  deletingDir.value = true
  try {
    await apollo.mutate({
      mutation: deleteFolderMutation,
      variables: {
        input: {
          projectId: props.projectId,
          id: deleteDirTargetId.value
        }
      }
    })
    // If the active dir was the deleted one, reset to ROOT
    if (activeDir.value === deleteDirTargetId.value) {
      activeDir.value = ROOT_ID
    }
    expandedDirIds.value.delete(deleteDirTargetId.value)
    expandedDirIds.value = new Set(expandedDirIds.value)
    await loadFolders()
    triggerNotification({
      type: ToastNotificationType.Success,
      title: '删除成功',
      description: `目录「${deleteDirTargetName.value}」已删除`
    })
    closeDeleteDirConfirm()
  } catch (err) {
    const error = ensureError(err)
    triggerNotification({
      type: ToastNotificationType.Danger,
      title: '删除失败',
      description: error.message
    })
  } finally {
    deletingDir.value = false
  }
}

const loadFolders = async () => {
  if (!props.projectId) return

  const rows: RawTreeItem[] = []
  const traverse = async (parentId: string | null) => {
    const res = await apollo.query<{
      project?: {
        folders?: {
          items: Array<{
            id: string
            name: string
            parentId?: string | null
            models?: Array<{ id: string }>
          }>
        }
      }
    }>({
      query: projectFoldersByParentQuery,
      variables: {
        projectId: props.projectId,
        parentId
      },
      fetchPolicy: 'no-cache'
    })
    const items = res.data?.project?.folders?.items || []
    rows.push(
      ...items.map((item) => ({
        id: item.id,
        name: item.name,
        parent: item.parentId || null,
        relative: (item.models || []).map((m) => m.id)
      }))
    )
    for (const item of items) {
      await traverse(item.id)
    }
  }

  await traverse(null)
  folderRows.value = rows
}

const childrenMap = computed(() => {
  const map = new Map<string, RawTreeItem[]>()
  const ensure = (key: string) => {
    if (!map.has(key)) map.set(key, [])
    return map.get(key) as RawTreeItem[]
  }

  ensure(ROOT_ID)
  folderRows.value.forEach((item) => {
    const parentKey = item.parent || ROOT_ID
    ensure(parentKey).push(item)
  })
  return map
})

const visibleRows = computed<VisibleRow[]>(() => {
  const rows: VisibleRow[] = []
  const walk = (parentId: string, level: number) => {
    const children = childrenMap.value.get(parentId) || []
    children.forEach((child) => {
      const hasChildren = (childrenMap.value.get(child.id)?.length || 0) > 0
      rows.push({
        id: child.id,
        name: child.name,
        level,
        hasChildren
      })
      if (expandedDirIds.value.has(child.id)) {
        walk(child.id, level + 1)
      }
    })
  }
  rows.push({
    id: ROOT_ID,
    name: projectName.value,
    level: 0,
    hasChildren: (childrenMap.value.get(ROOT_ID)?.length || 0) > 0
  })
  if (expandedDirIds.value.has(ROOT_ID)) {
    walk(ROOT_ID, 1)
  }
  return rows
})

const isSelected = (id: string) => activeDir.value === id
const isExpanded = (id: string) => expandedDirIds.value.has(id)

const addDirectory = async () => {
  if (!newDirName.value.trim()) return

  const parentId =
    !dirModalParentId.value || dirModalParentId.value === ROOT_ID
      ? null
      : dirModalParentId.value

  await apollo.mutate({
    mutation: createFolderMutation,
    variables: {
      input: {
        projectId: props.projectId,
        name: newDirName.value.trim(),
        parentId
      }
    }
  })

  if (parentId) {
    expandedDirIds.value.add(parentId)
    expandedDirIds.value = new Set(expandedDirIds.value)
  }

  await loadFolders()
  closeDirModal()
}

const selectedDirModelIds = computed<string[] | null>(() => {
  if (activeDir.value === ROOT_ID) return null
  return folderRows.value.find((item) => item.id === activeDir.value)?.relative || []
})

const latestModelsQueryVariables = computed(() => {
  const ids = selectedDirModelIds.value
  const trimmedSearch = searchQuery.value.trim()
  const hasFilter = !!trimmedSearch || !!ids
  return {
    projectId: props.projectId,
    filter: hasFilter
      ? {
          search: trimmedSearch || null,
          ids: ids && ids.length ? ids : null
        }
      : null
  }
})

const shouldSkipModelsQuery = computed(
  () => activeDir.value !== ROOT_ID && !selectedDirModelIds.value?.length
)

const {
  result: baseModelsResult,
  variables: baseModelsVariables,
  loading: baseModelsLoading,
  onResult: onBaseModelsResult,
  refetch: refetchBaseModels
} = useQuery(
  latestModelsQuery,
  () => latestModelsQueryVariables.value,
  () => ({ enabled: !shouldSkipModelsQuery.value })
)

const {
  result: extraModelsResult,
  fetchMore: fetchMoreModels,
  loading: extraModelsLoading,
  onResult: onExtraModelsResult,
  refetch: refetchExtraModels
} = useQuery(
  latestModelsPaginationQuery,
  () => ({
    ...latestModelsQueryVariables.value,
    cursor: null as string | null
  }),
  () => ({ enabled: !shouldSkipModelsQuery.value })
)

const displayedModelFragments = computed<ProjectPageLatestItemsModelItemFragment[]>(
  () => {
    if (shouldSkipModelsQuery.value) return []
    return extraModelsResult.value
      ? extraModelsResult.value?.project?.models?.items || []
      : baseModelsResult.value?.project?.models?.items || []
  }
)

const displayedModels = computed<ModelListItem[]>(() =>
  displayedModelFragments.value.map((model) => ({
    id: model.id,
    name: model.displayName || model.name,
    seedId: model.lastVersion?.items?.[0]?.seedId || '',
    updatedAt: model.updatedAt,
    versionsCount: model.versionCount.totalCount,
    commentCount: model.commentThreadCount.totalCount,
    previewUrl: model.previewUrl,
    raw: model
  }))
)

const visibleModelSyncTargets = computed(() =>
  displayedModels.value.length
    ? [
        {
          projectId: props.projectId,
          modelIds: displayedModels.value.map((model) => model.id)
        }
      ]
    : []
)

const visibleModelSyncTargetsSignature = computed(() =>
  visibleModelSyncTargets.value
    .map((target) => `${target.projectId}:${[...target.modelIds].sort().join(',')}`)
    .join('|')
)

watch(
  visibleModelSyncTargetsSignature,
  () => {
    void syncVisibleTasks(visibleModelSyncTargets.value)
  },
  {
    immediate: true
  }
)

onUnmounted(() => {
  cleanupVisibleTaskSubscriptions()
})

const refreshModels = async () => {
  await Promise.allSettled([refetchBaseModels(), refetchExtraModels()])
}

const modelsLoading = computed(() => {
  if (shouldSkipModelsQuery.value) return false
  return baseModelsLoading.value || extraModelsLoading.value
})

const moreToLoad = computed(() => {
  if (shouldSkipModelsQuery.value) return false
  if (!baseModelsResult.value?.project) return true
  const loadedCount =
    extraModelsResult.value?.project?.models?.items.length ||
    baseModelsResult.value.project.models.items.length
  return loadedCount < baseModelsResult.value.project.models.totalCount
})

const calculateLoaderId = () => {
  const id = JSON.stringify(baseModelsVariables.value?.filter || {})
  infiniteLoaderId.value = `${id}-${loadCacheBuster.value}`
}

const infiniteLoad = async (state: InfiniteLoaderState) => {
  const cursor =
    extraModelsResult.value?.project?.models?.cursor ||
    baseModelsResult.value?.project?.models?.cursor ||
    null

  if (!moreToLoad.value || !cursor) return state.complete()

  try {
    await fetchMoreModels({
      variables: {
        cursor
      }
    })
  } catch (e) {
    logger.error(e)
    state.error()
    return
  }

  state.loaded()
  if (!moreToLoad.value) state.complete()
}

const handleImport = async (models: ModelLibraryListItem[]) => {
  if (!models.length || isImportingFromLibrary.value) return

  isImportingFromLibrary.value = true
  const targetFolderId = activeDir.value === ROOT_ID ? null : activeDir.value
  let successCount = 0

  try {
    for (const sourceModel of models) {
      const sourceRes = await apollo.query<{
        project?: {
          model?: {
            id: string
            name: string
            versions?: {
              items: Array<{
                id: string
                referencedObject?: string | null
              }>
            }
          } | null
        } | null
      }>({
        query: importSourceModelQuery,
        variables: {
          projectId: sourceModel.projectId,
          modelId: sourceModel.id
        },
        fetchPolicy: 'no-cache'
      })

      const sourceVersion = sourceRes.data?.project?.model?.versions?.items?.[0]
      const referencedObject = sourceVersion?.referencedObject?.trim()
      if (!referencedObject) {
        throw new Error(`模型 ${sourceModel.title} 缺少可导入的快照数据`)
      }

      const sourceObjects = await loadSourceModelObjectTree({
        projectId: sourceModel.projectId,
        modelId: sourceModel.id,
        rootObjectId: referencedObject
      })
      if (!sourceObjects.length) {
        throw new Error(`模型 ${sourceModel.title} 的对象数据为空，无法导入`)
      }

      const createObjectsRes = await apollo.mutate<{
        objectCreate?: string[]
      }>({
        mutation: createObjectsMutation,
        variables: {
          input: {
            streamId: props.projectId,
            objects: sourceObjects
          }
        }
      })

      if (!createObjectsRes.data?.objectCreate?.includes(referencedObject)) {
        throw new Error(`模型 ${sourceModel.title} 的对象复制失败`)
      }

      const createModelRes = await apollo.mutate<{
        modelMutations?: {
          create?: {
            id: string
            name: string
          } | null
        }
      }>({
        mutation: createImportedModelMutation,
        variables: {
          input: {
            projectId: props.projectId,
            name: sourceModel.title
          }
        }
      })

      const createdModelId = createModelRes.data?.modelMutations?.create?.id
      if (!createdModelId) {
        throw new Error(`模型 ${sourceModel.title} 创建失败`)
      }

      await apollo
        .mutate({
          mutation: createImportedVersionMutation,
          variables: {
            input: {
              projectId: props.projectId,
              modelId: createdModelId,
              objectId: referencedObject,
              message: '从模型库导入快照'
            }
          }
        })
        .then((res) => {
          const versionId = res.data?.versionMutations?.create?.id
          if (!versionId) {
            throw new Error(`模型 ${sourceModel.title} 的版本创建失败`)
          }
        })

      if (targetFolderId) {
        await apollo.mutate({
          mutation: addModelToFolderMutation,
          variables: {
            input: {
              projectId: props.projectId,
              folderId: targetFolderId,
              modelId: createdModelId
            }
          }
        })
      }

      successCount++
    }

    showImportModal.value = false
    triggerNotification({
      type: ToastNotificationType.Success,
      title: '导入成功',
      description: `已从模型库导入 ${successCount} 个模型快照`
    })
    loadCacheBuster.value++
    await Promise.all([loadFolders(), refetchBaseModels(), refetchExtraModels()])
  } catch (e) {
    triggerNotification({
      type: ToastNotificationType.Danger,
      title: '导入失败',
      description: ensureError(e).message
    })
  } finally {
    isImportingFromLibrary.value = false
  }
}

const activeDirName = computed(() => {
  if (activeDir.value === ROOT_ID) return '全部模型'
  return folderRows.value.find((dir) => dir.id === activeDir.value)?.name || '全部模型'
})

const openModel = (model: ModelListItem) => {
  // console.log(model)
  router.push(getModelItemRoute(model.raw))
}

const handleDeleteModel = (model: ModelListItem) => {
  deleteTargetModel.value = model
  showDeleteModelConfirm.value = true
}

const onModelDeleted = async () => {
  const model = deleteTargetModel.value
  if (!model) return

  if (selectedVersionUploadModel.value?.id === model.id) {
    selectedVersionUploadModel.value = null
  }

  showDeleteModelConfirm.value = false
  deleteTargetModel.value = null
  loadCacheBuster.value++

  await Promise.all([loadFolders(), refetchBaseModels(), refetchExtraModels()])
}

watch(showDeleteModelConfirm, (open) => {
  if (!open) {
    deleteTargetModel.value = null
  }
})

const formatDate = (dateStr: string) => {
  return dayjs(dateStr).format('YYYY-MM-DD HH:mm')
}

const viewAllIn3D = () => {
  if (!displayedModels.value.length) return
  router.push(`/projects/${props.projectId}/models/all`)
}

onBaseModelsResult(calculateLoaderId)
onExtraModelsResult(calculateLoaderId)
onMounted(loadFolders)
</script>

<style scoped>
/* 强制覆盖搜索框聚焦时的边框颜色与背景色 */
input.search-input:focus,
input.search-input:focus-visible {
  border: 1px solid #00b4b6 !important;
  background-color: #ffffff !important;
  outline: none !important;
  box-shadow: none !important;
}
</style>
