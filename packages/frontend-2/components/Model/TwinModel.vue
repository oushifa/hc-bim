<template>
  <div class="h-full flex flex-col bg-[#E7EBEB] overflow-hidden">
    <!-- Top Filters -->
    <div
      class="bg-white/80 backdrop-blur-md p-4 rounded-[26px] shadow-sm mb-3 shrink-0 flex flex-col space-y-4 relative z-20"
    >
      <!-- Tabs -->
      <div class="flex items-center space-x-1 border-b border-gray-100 pb-2">
        <button
          class="px-4 py-2 text-sm font-medium transition-colors relative"
          :class="
            activeTab === 'user'
              ? 'text-[#00b4b6]'
              : 'text-gray-500 hover:text-gray-700'
          "
          @click="switchTab('user')"
        >
          用户模型
          <div
            v-if="activeTab === 'user'"
            class="absolute bottom-[-9px] left-0 w-full h-0.5 bg-[#00b4b6] rounded-t-full"
          />
        </button>
        <button
          class="px-4 py-2 text-sm font-medium transition-colors relative"
          :class="
            activeTab === 'official'
              ? 'text-[#00b4b6]'
              : 'text-gray-500 hover:text-gray-700'
          "
          @click="switchTab('official')"
        >
          官方模型
          <div
            v-if="activeTab === 'official'"
            class="absolute bottom-[-9px] left-0 w-full h-0.5 bg-[#00b4b6] rounded-t-full"
          />
        </button>
      </div>

      <!-- Filter Controls -->
      <div class="flex flex-wrap items-center gap-6">
        <!-- 公共：模型名称/ID -->
        <div class="flex items-center space-x-2">
          <span class="text-sm text-gray-600 whitespace-nowrap">模型名称/ID：</span>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="请输入模型名称/ID"
            class="focus-brand w-48 px-3 py-1.5 border rounded-[8px] text-sm focus:outline-none transition-colors"
            :class="
              searchQuery
                ? 'border-[#00b4b6] bg-white'
                : 'border-transparent bg-gray-50'
            "
          />
        </div>

        <!-- 用户模型筛选项 -->
        <template v-if="activeTab === 'user'">
          <div class="flex items-center space-x-2">
            <span class="text-sm text-gray-600 whitespace-nowrap">状态：</span>
            <select
              v-model="statusFilter"
              class="focus-brand w-32 px-3 py-1.5 border rounded-[8px] text-sm text-gray-600 focus:outline-none cursor-pointer transition-colors"
              :class="
                statusFilter
                  ? 'border-[#00b4b6] bg-white'
                  : 'border-transparent bg-gray-50'
              "
            >
              <option value="">请选择</option>
              <option value="1">已上架</option>
              <option value="2">已下架</option>
            </select>
          </div>
          <div class="flex items-center space-x-2">
            <span class="text-sm text-gray-600 whitespace-nowrap">构件数据：</span>
            <select
              v-model="componentDataFilter"
              class="focus-brand w-32 px-3 py-1.5 border rounded-[8px] text-sm text-gray-600 focus:outline-none cursor-pointer transition-colors"
              :class="
                componentDataFilter
                  ? 'border-[#00b4b6] bg-white'
                  : 'border-transparent bg-gray-50'
              "
            >
              <option value="">请选择</option>
              <option value="1">有</option>
              <option value="0">无</option>
            </select>
          </div>
        </template>

        <!-- 官方模型筛选项 -->
        <template v-else>
          <div class="flex items-center space-x-2">
            <span class="text-sm text-gray-600 whitespace-nowrap">上架状态：</span>
            <select
              v-model="publishStatusFilter"
              class="focus-brand w-32 px-3 py-1.5 border rounded-[8px] text-sm text-gray-600 focus:outline-none cursor-pointer transition-colors"
              :class="
                publishStatusFilter
                  ? 'border-[#00b4b6] bg-white'
                  : 'border-transparent bg-gray-50'
              "
            >
              <option value="">请选择状态</option>
              <option value="已上架">已上架</option>
              <option value="已下架">已下架</option>
            </select>
          </div>
          <div class="flex items-center space-x-2">
            <span class="text-sm text-gray-600 whitespace-nowrap">分类：</span>
            <select
              v-model="categoryFilter"
              class="focus-brand w-32 px-3 py-1.5 border rounded-[8px] text-sm text-gray-600 focus:outline-none cursor-pointer transition-colors"
              :class="
                categoryFilter
                  ? 'border-[#00b4b6] bg-white'
                  : 'border-transparent bg-gray-50'
              "
            >
              <option value="">请选择分类</option>
              <option v-for="cat in flatCategoryList" :key="cat.id" :value="cat.name">
                {{ cat.name }}
              </option>
            </select>
          </div>
        </template>

        <div class="flex-1 flex justify-end">
          <button
            v-if="activeTab === 'user'"
            :disabled="selectedIds.size === 0"
            class="px-4 py-1.5 border border-gray-200 rounded-[8px] text-sm text-gray-600 hover:text-[#00b4b6] hover:border-[#00b4b6] transition-colors bg-white/80 backdrop-blur-md disabled:opacity-50 disabled:cursor-not-allowed"
            @click="showOffshelfPopover('batch', $event)"
          >
            批量下架
          </button>
        </div>
      </div>
    </div>

    <!-- Main Table Area -->
    <div
      class="flex-1 bg-white/80 backdrop-blur-md rounded-[26px] shadow-sm flex flex-col overflow-hidden"
    >
      <div class="flex-1 overflow-auto">
        <table class="w-full text-left border-collapse min-w-[1000px]">
          <thead class="bg-[#f8f9fa] sticky top-0 z-10">
            <tr class="border-b border-gray-100 text-sm text-gray-600 font-medium">
              <!-- 仅用户模型显示全选框 -->
              <th v-if="activeTab === 'user'" class="py-3 px-4 w-12 text-center">
                <div
                  class="w-4 h-4 border-2 rounded-sm cursor-pointer flex items-center justify-center mx-auto transition-colors"
                  :class="
                    isAllSelected
                      ? 'bg-[#00b4b6] border-[#00b4b6]'
                      : isIndeterminate
                      ? 'bg-[#00b4b6] border-[#00b4b6]'
                      : 'border-gray-300 hover:border-[#00b4b6]'
                  "
                  @click="toggleSelectAll"
                >
                  <svg
                    v-if="isAllSelected"
                    class="w-3 h-3 text-white"
                    fill="none"
                    viewBox="0 0 12 12"
                    stroke="currentColor"
                    stroke-width="2.5"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M2 6l3 3 5-5"
                    />
                  </svg>
                  <svg
                    v-else-if="isIndeterminate"
                    class="w-3 h-3 text-white"
                    fill="currentColor"
                    viewBox="0 0 12 12"
                  >
                    <rect x="2" y="5" width="8" height="2" rx="1" />
                  </svg>
                </div>
              </th>
              <th class="py-3 px-4">模型名称/ID</th>
              <th v-if="activeTab === 'official'" class="py-3 px-4">分类</th>
              <th class="py-3 px-4">系统</th>
              <th v-if="activeTab === 'official'" class="py-3 px-4">数据版本</th>
              <th v-if="activeTab === 'user'" class="py-3 px-4">原始格式</th>
              <th class="py-3 px-4">资产大小</th>
              <th v-if="activeTab === 'user'" class="py-3 px-4">构件数据</th>
              <th class="py-3 px-4">
                {{ activeTab === 'user' ? '生成时间' : '上架时间' }}
              </th>
              <th class="py-3 px-4">
                {{ activeTab === 'user' ? '状态' : '上架状态' }}
              </th>

              <th class="py-3 px-4">操作</th>
            </tr>
          </thead>
          <tbody>
            <!-- Loading 状态 -->
            <tr v-if="(activeTab === 'user' && userLoading) || (activeTab === 'official' && officialLoading)">
              <td
                :colspan="activeTab === 'user' ? 9 : 9"
                class="py-16 text-center"
              >
                <svg class="animate-spin h-8 w-8 text-[#00b4b6] mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </td>
            </tr>
            
            <!-- 数据行 -->
            <template v-else>
            <tr
              v-for="model in filteredModels"
              :key="model.id"
              class="border-b border-gray-50 hover:bg-gray-50 transition-colors"
            >
              <!-- 仅用户模型显示行勾选框 -->
              <td v-if="activeTab === 'user'" class="py-4 px-4 text-center">
                <div
                  class="w-4 h-4 border-2 rounded-sm cursor-pointer flex items-center justify-center mx-auto transition-colors"
                  :class="
                    selectedIds.has(model.id)
                      ? 'bg-[#00b4b6] border-[#00b4b6]'
                      : 'border-gray-300 hover:border-[#00b4b6]'
                  "
                  @click="toggleSelect(model.id)"
                >
                  <svg
                    v-if="selectedIds.has(model.id)"
                    class="w-3 h-3 text-white"
                    fill="none"
                    viewBox="0 0 12 12"
                    stroke="currentColor"
                    stroke-width="2.5"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M2 6l3 3 5-5"
                    />
                  </svg>
                </div>
              </td>
              <td class="py-4 px-4">
                <div class="flex items-center space-x-3">
                  <div
                    class="w-10 h-10 rounded-[8px] bg-gray-100 overflow-hidden shrink-0"
                  >
                    <img
                      v-if="activeTab === 'official' && (model as OfficialModel).thumbnailUrl"
                      :src="(model as OfficialModel).thumbnailUrl"
                      :alt="model.name"
                      class="w-full h-full object-cover"
                    />
                    <CubeIcon v-else class="w-full h-full p-2 text-gray-400" />
                  </div>
                  <div class="flex flex-col">
                    <span class="text-sm font-medium text-[#333]">
                      {{ model.name }}
                    </span>
                    <span class="text-xs text-gray-400">SeedID:{{ model.seedId }}</span>
                  </div>
                </div>
              </td>
              <td
                v-if="activeTab === 'official'"
                class="py-4 px-4 text-sm text-gray-600"
              >
                {{ (model as OfficialModel).category }}
              </td>
              <td class="py-4 px-4 text-sm text-gray-600">{{ model.system }}</td>
              <td
                v-if="activeTab === 'official'"
                class="py-4 px-4 text-sm text-gray-600"
              >
                {{ (model as OfficialModel).dataVersion }}
              </td>
              <td v-if="activeTab === 'user'" class="py-4 px-4 text-sm text-gray-600">
                {{ (model as UserModel).originalFormat }}
              </td>
              <td class="py-4 px-4 text-sm text-gray-600">{{ model.assetSize }}</td>
              <td v-if="activeTab === 'user'" class="py-4 px-4 text-sm text-gray-600">
                {{ (model as UserModel).componentData }}
              </td>
              <td class="py-4 px-4 text-sm text-gray-600">
                {{
                  activeTab === 'user'
                    ? (model as UserModel).generationTime
                    : (model as OfficialModel).publishTime
                }}
              </td>
              <td class="py-4 px-4 text-sm text-gray-600">{{ model.status }}</td>

              <td class="py-4 px-4 text-sm space-x-3">
                <template v-if="activeTab === 'user'">
                  <div v-if="hasModelOp('canFile')" class="relative inline-block">
                    <button
                      class="text-[#00b4b6] hover:underline cursor-pointer"
                      @click="showOffshelfPopover(model.id, $event)"
                    >
                      下架
                    </button>
                  </div>
                  <button
                    v-if="hasModelOp('canEdit')"
                    class="text-[#00b4b6] hover:underline"
                    @click="openEditModal(model as UserModel)"
                  >
                    编辑
                  </button>
                </template>
                <template v-else>
                  <button class="text-[#00b4b6] hover:underline cursor-pointer" @click="openVersionModal(model as OfficialModel)">
                    版本管理
                  </button>
                  <button
                    v-if="hasModelOp('canEdit')"
                    class="text-[#00b4b6] hover:underline cursor-pointer"
                    @click="openOfficialEditModal(model as OfficialModel)"
                  >
                    编辑
                  </button>
                </template>
              </td>
            </tr>
            <tr v-if="filteredModels.length === 0 && !((activeTab === 'user' && userLoading) || (activeTab === 'official' && officialLoading))">
              <td
                :colspan="activeTab === 'user' ? 9 : 9"
                class="py-16 text-center text-gray-400 text-sm"
              >
                暂无孪生模型数据
              </td>
            </tr>
            </template>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div
        class="h-14 border-t border-gray-100 flex items-center justify-end px-6 shrink-0 bg-white/80 backdrop-blur-md"
      >
        <div class="flex items-center space-x-4 text-sm text-gray-500">
          <span>
            共 {{ totalRecords }} 条记录 / 第 {{ startRecord }} - {{ endRecord }} 条
          </span>
          <div class="flex items-center space-x-1">
            <!-- 上一页 -->
            <button
              class="p-1 border border-gray-200 rounded-[8px] text-gray-400 hover:text-[#00b4b6] hover:border-[#00b4b6] disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="currentPage <= 1"
              @click="changePage(currentPage - 1)"
            >
              <ChevronLeftIcon class="w-4 h-4" />
            </button>
            
            <!-- 页码按钮 -->
            <template v-for="page in visiblePages" :key="page">
              <button
                v-if="page === '...'"
                class="w-8 h-8 flex items-center justify-center border-0 text-gray-400"
              >
                <EllipsisHorizontalIcon class="w-4 h-4" />
              </button>
              <button
                v-else
                class="w-8 h-8 flex items-center justify-center border rounded hover:border-[#00b4b6] hover:text-[#00b4b6] transition-colors"
                :class="
                  page === currentPage
                    ? 'border-[#00b4b6] text-[#00b4b6] bg-[#e6f7f8]'
                    : 'border-gray-200 text-gray-600'
                "
                @click="changePage(page as number)"
              >
                {{ page }}
              </button>
            </template>
            
            <!-- 下一页 -->
            <button
              class="p-1 border border-gray-200 rounded text-gray-600 hover:text-[#00b4b6] hover:border-[#00b4b6] disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="currentPage >= totalPages"
              @click="changePage(currentPage + 1)"
            >
              <ChevronRightIcon class="w-4 h-4" />
            </button>
          </div>
          <select
            v-model="currentPageSize"
            class="border border-[#00b4b6] rounded-[8px] px-2 py-1 text-sm focus:outline-none focus:border-[#00b4b6] cursor-pointer"
            @change="onPageSizeChange"
          >
            <option :value="20">20 / page</option>
            <option :value="50">50 / page</option>
            <option :value="100">100 / page</option>
          </select>
        </div>
      </div>
    </div>
  </div>

  <!-- 下架确认 Popover（固定定位，跟随按钮位置，智能判断上下方向）-->
  <Transition
    enter-active-class="transition-all duration-150"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition-all duration-100"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <div
      v-if="
        offshelfPopoverTarget !== null && offshelfAnchorRects[offshelfPopoverTarget]
      "
      class="fixed z-50 w-44 bg-white rounded-[10px] shadow-[0_4px_20px_rgba(0,0,0,0.12)] border border-gray-100"
      :style="popoverStyle"
    >
      <!-- 箭头：根据方向显示上方或下方 -->
      <div
        v-if="popoverDirection === 'up'"
        class="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-r border-b border-gray-100 rotate-45"
      />
      <div
        v-else
        class="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-l border-t border-gray-100 rotate-45"
      />
      <div class="px-4 pt-3 pb-2">
        <p class="text-sm font-medium text-gray-800 mb-3">确定下架？</p>
        <div class="flex justify-end space-x-2">
          <button
            class="px-3 py-1 text-xs border border-gray-200 rounded-[6px] text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
            @click="hideOffshelfPopover"
          >
            取消
          </button>
          <button
            class="px-3 py-1 text-xs bg-[#00b4b6] text-white rounded-[6px] hover:bg-[#009a9c] transition-colors cursor-pointer"
            @click="confirmOffshelf"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  </Transition>

  <!-- 遮罩层：点击空白关闭 Popover -->
  <div
    v-if="offshelfPopoverTarget !== null"
    class="fixed inset-0 z-40"
    @click="hideOffshelfPopover"
  />

  <!-- 编辑 Modal -->
  <Transition
    enter-active-class="transition-all duration-200"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-all duration-150"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="editModalVisible"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      @click.self="closeEditModal"
    >
      <Transition
        enter-active-class="transition-all duration-200"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition-all duration-150"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="editModalVisible"
          class="bg-white rounded-[16px] shadow-2xl w-[420px] max-w-[90vw] overflow-hidden"
        >
          <!-- Modal Header -->
          <div
            class="flex items-center justify-between px-6 py-4 border-b border-gray-100"
          >
            <h3 class="text-base font-semibold text-gray-800">编辑用户模型</h3>
            <button
              class="text-gray-400 hover:text-gray-600 transition-colors"
              @click="closeEditModal"
            >
              <XMarkIcon class="w-5 h-5" />
            </button>
          </div>

          <!-- Modal Body -->
          <div class="px-6 py-5 space-y-5">
            <!-- 名称字段 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">
                名称
                <span class="text-red-500 ml-0.5">*</span>
              </label>
              <input
                v-model="editForm.name"
                type="text"
                placeholder="请输入名称"
                class="focus-brand w-full px-3 py-2 border rounded-[8px] text-sm focus:outline-none transition-colors"
                :class="
                  editNameError
                    ? 'border-red-400 focus-error'
                    : 'border-gray-200'
                "
                @input="editNameError = ''"
              />
              <p v-if="editNameError" class="mt-1 text-xs text-red-500">
                {{ editNameError }}
              </p>
            </div>

            <!-- 缩略图字段 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">
                缩略图
              </label>
              <div
                class="relative w-full h-36 border-2 border-dashed border-gray-200 rounded-[10px] overflow-hidden cursor-pointer hover:border-[#00b4b6] transition-colors group"
                @click="thumbnailInput?.click()"
              >
                <img
                  v-if="thumbnailPreview"
                  :src="thumbnailPreview"
                  alt="缩略图"
                  class="w-full h-full object-cover"
                  @click.stop="lightboxVisible = true"
                />
                <div
                  v-else
                  class="flex flex-col items-center justify-center h-full space-y-2 text-gray-400 group-hover:text-[#00b4b6] transition-colors"
                >
                  <svg
                    class="w-8 h-8"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="1.5"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                    />
                  </svg>
                  <span class="text-xs">点击上传缩略图</span>
                </div>
                <!-- 已上传时的操作遮罩 -->
                <div
                  v-if="thumbnailPreview"
                  class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100"
                >
                  <button
                    class="px-3 py-1 bg-white/90 text-xs text-gray-700 rounded-[6px] hover:bg-white"
                    @click.stop="lightboxVisible = true"
                  >
                    查看
                  </button>
                  <button
                    class="px-3 py-1 bg-white/90 text-xs text-gray-700 rounded-[6px] hover:bg-white"
                    @click.stop="thumbnailInput?.click()"
                  >
                    更换
                  </button>
                </div>
              </div>
              <input
                ref="thumbnailInput"
                type="file"
                accept="image/*"
                class="hidden"
                @change="onThumbnailChange"
              />
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="flex justify-end space-x-3 px-6 py-4 border-t border-gray-100">
            <button
              class="px-5 py-2 text-sm border border-gray-200 rounded-[8px] text-gray-600 hover:bg-gray-50 transition-colors"
              @click="closeEditModal"
            >
              取消
            </button>
            <button
              class="px-5 py-2 text-sm bg-[#00b4b6] text-white rounded-[8px] hover:bg-[#009a9c] transition-colors"
              @click="handleEditConfirm"
            >
              确定
            </button>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>

  <!-- 官方模型编辑 Modal -->
  <Transition
    enter-active-class="transition-all duration-200"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-all duration-150"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="officialEditModalVisible"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      @click.self="closeOfficialEditModal"
    >
      <Transition
        enter-active-class="transition-all duration-200"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition-all duration-150"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="officialEditModalVisible"
          class="bg-white rounded-[16px] shadow-2xl w-[480px] max-w-[90vw] max-h-[90vh] overflow-y-auto"
        >
          <!-- Header -->
          <div
            class="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10"
          >
            <h3 class="text-base font-semibold text-gray-800">编辑官方模型</h3>
            <button
              class="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              @click="closeOfficialEditModal"
            >
              <XMarkIcon class="w-5 h-5" />
            </button>
          </div>

          <!-- Body -->
          <div class="px-6 py-5 space-y-5">
            <!-- 名称 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">
                名称
                <span class="text-red-500 ml-0.5">*</span>
              </label>
              <input
                v-model="officialEditForm.name"
                type="text"
                placeholder="请输入名称"
                class="focus-brand w-full px-3 py-2 border rounded-[8px] text-sm focus:outline-none transition-colors"
                :class="
                  officialEditErrors.name
                    ? 'border-red-400 focus-error'
                    : 'border-gray-200'
                "
                @input="officialEditErrors.name = ''"
              />
              <p v-if="officialEditErrors.name" class="mt-1 text-xs text-red-500">
                {{ officialEditErrors.name }}
              </p>
            </div>

            <!-- 英文名称 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">
                英文名称
                <span class="text-red-500 ml-0.5">*</span>
              </label>
              <input
                v-model="officialEditForm.nameEn"
                type="text"
                placeholder="请输入英文名称"
                class="focus-brand w-full px-3 py-2 border rounded-[8px] text-sm focus:outline-none transition-colors"
                :class="
                  officialEditErrors.nameEn
                    ? 'border-red-400 focus-error'
                    : 'border-gray-200'
                "
                @input="officialEditErrors.nameEn = ''"
              />
              <p v-if="officialEditErrors.nameEn" class="mt-1 text-xs text-red-500">
                {{ officialEditErrors.nameEn }}
              </p>
            </div>

            <!-- 分类（下拉选择） -->
            <div class="relative">
              <label class="block text-sm font-medium text-gray-700 mb-1.5">分类</label>
              <div
                class="w-full px-3 py-1.5 border border-gray-200 rounded-[8px] text-sm focus:outline-none focus:border-[#00b4b6] cursor-pointer transition-colors flex items-center justify-between"
                :class="officialEditForm.category ? 'text-gray-600' : 'text-gray-400'"
                @click.stop="officialCategoryDropdownOpen = !officialCategoryDropdownOpen"
              >
                <span>{{ officialEditForm.category || flatCategoryList[0]?.name || '' }}</span>
                <svg class="w-4 h-4 text-gray-400 transition-transform" :class="officialCategoryDropdownOpen ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <div
                v-if="officialCategoryDropdownOpen && flatCategoryList.length"
                class="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-[8px] shadow-lg z-50 max-h-60 overflow-y-auto"
              >
                <div
                  v-for="cat in flatCategoryList"
                  :key="cat.id"
                  class="px-3 py-2 text-sm cursor-pointer hover:bg-[#00b4b6]/10 transition-colors"
                  :class="officialEditForm.category === cat.name ? 'text-[#00b4b6] bg-[#00b4b6]/5 font-medium' : 'text-gray-600'"
                  @click.stop="officialEditForm.category = cat.name; officialCategoryDropdownOpen = false"
                >
                  {{ cat.name }}
                </div>
              </div>
            </div>

            <!-- 缩略图 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">
                缩略图
              </label>
              <div
                class="relative w-36 h-36 border-2 border-dashed border-gray-200 rounded-[10px] overflow-hidden cursor-pointer hover:border-[#00b4b6] transition-colors group"
                @click="officialThumbnailInput?.click()"
              >
                <img
                  v-if="officialThumbnailPreview"
                  :src="officialThumbnailPreview"
                  alt="缩略图"
                  class="w-full h-full object-cover"
                  @click.stop="officialLightboxVisible = true"
                />
                <div
                  v-else
                  class="flex flex-col items-center justify-center h-full space-y-2 text-gray-400 group-hover:text-[#00b4b6] transition-colors"
                >
                  <svg
                    class="w-8 h-8"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="1.5"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                    />
                  </svg>
                  <span class="text-xs">点击上传缩略图</span>
                </div>
                <div
                  v-if="officialThumbnailPreview"
                  class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100"
                >
                  <button
                    class="px-3 py-1 bg-white/90 text-xs text-gray-700 rounded-[6px] hover:bg-white cursor-pointer"
                    @click.stop="officialLightboxVisible = true"
                  >
                    查看
                  </button>
                  <button
                    class="px-3 py-1 bg-white/90 text-xs text-gray-700 rounded-[6px] hover:bg-white cursor-pointer"
                    @click.stop="officialThumbnailInput?.click()"
                  >
                    更换
                  </button>
                </div>
              </div>
              <input
                ref="officialThumbnailInput"
                type="file"
                accept="image/*"
                class="hidden"
                @change="onOfficialThumbnailChange"
              />
            </div>
          </div>

          <!-- Footer -->
          <div class="flex justify-end space-x-3 px-6 py-4 border-t border-gray-100">
            <button
              class="px-5 py-2 text-sm border border-gray-200 rounded-[8px] text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
              @click="closeOfficialEditModal"
              :disabled="officialEditLoading"
            >
              取消
            </button>
            <button
              class="px-5 py-2 text-sm bg-[#00b4b6] text-white rounded-[8px] hover:bg-[#009a9c] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              @click="handleOfficialEditConfirm"
              :disabled="officialEditLoading"
            >
              <span v-if="officialEditLoading" class="flex items-center">
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                提交中...
              </span>
              <span v-else>确定</span>
            </button>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>

  <!-- 官方模型缩略图灯箱 -->
  <Transition
    enter-active-class="transition-all duration-200"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-all duration-150"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="officialLightboxVisible"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-sm"
      @click="officialLightboxVisible = false"
    >
      <button
        class="absolute top-4 right-4 text-white/80 hover:text-white cursor-pointer"
        @click="officialLightboxVisible = false"
      >
        <XMarkIcon class="w-7 h-7" />
      </button>
      <img
        :src="officialThumbnailPreview"
        alt="缩略图预览"
        class="max-w-[85vw] max-h-[85vh] rounded-[12px] shadow-2xl object-contain"
        @click.stop
      />
    </div>
  </Transition>

  <!-- 缩略图灯箱 -->
  <Transition
    enter-active-class="transition-all duration-200"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-all duration-150"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="lightboxVisible"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-sm"
      @click="lightboxVisible = false"
    >
      <button
        class="absolute top-4 right-4 text-white/80 hover:text-white"
        @click="lightboxVisible = false"
      >
        <XMarkIcon class="w-7 h-7" />
      </button>
      <img
        :src="thumbnailPreview"
        alt="缩略图预览"
        class="max-w-[85vw] max-h-[85vh] rounded-[12px] shadow-2xl object-contain"
        @click.stop
      />
    </div>
  </Transition>

  <!-- 版本管理 Modal -->
  <Transition
    enter-active-class="transition-all duration-200"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-all duration-150"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="versionModalVisible"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      @click.self="closeVersionModal"
    >
      <Transition
        enter-active-class="transition-all duration-200"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition-all duration-150"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="versionModalVisible"
          class="bg-white rounded-[16px] shadow-2xl w-[900px] max-w-[90vw] max-h-[90vh] overflow-hidden flex flex-col"
        >
          <!-- Header -->
          <div
            class="flex items-center justify-between px-6 py-4 border-b border-gray-100"
          >
            <h3 class="text-base font-semibold text-gray-800">版本管理</h3>
            <button
              class="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              @click="closeVersionModal"
            >
              <XMarkIcon class="w-5 h-5" />
            </button>
          </div>

          <!-- Body -->
          <div class="flex-1 overflow-auto px-6 py-4">
            <!-- Loading 状态 -->
            <div v-if="versionLoading" class="flex items-center justify-center py-16">
              <svg class="animate-spin h-8 w-8 text-[#00b4b6]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            
            <!-- 表格内容 -->
            <table v-else class="w-full text-left border-collapse">
              <thead class="bg-[#f8f9fa] sticky top-0 z-10">
                <tr class="border-b border-gray-100 text-sm text-gray-600 font-medium">
                  <th class="py-3 px-4">模型名称</th>
                  <th class="py-3 px-4">数据版本</th>
                  <th class="py-3 px-4">分类</th>
                  <th class="py-3 px-4">上架时间</th>
                  <th class="py-3 px-4">文件大小</th>
                  <th class="py-3 px-4">上架状态</th>
                  <th class="py-3 px-4">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="version in versionData"
                  :key="version.id"
                  class="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                >
                  <td class="py-3 px-4 text-sm text-gray-800">{{ version.name }}</td>
                  <td class="py-3 px-4 text-sm text-gray-600">{{ version.version }}</td>
                  <td class="py-3 px-4 text-sm text-gray-600">{{ version.category }}</td>
                  <td class="py-3 px-4 text-sm text-gray-600">{{ version.publishTime }}</td>
                  <td class="py-3 px-4 text-sm text-gray-600">{{ version.fileSize }}</td>
                  <td class="py-3 px-4 text-sm text-gray-600">{{ version.status }}</td>
                  <td class="py-3 px-4 text-sm space-x-2">
                    <button 
                      v-if="version.status === '已上架'"
                      class="text-[#00b4b6] hover:underline cursor-pointer"
                      @click="handleVersionToggle(version)"
                    >
                      下架
                    </button>
                    <button 
                      v-else
                      class="text-[#00b4b6] hover:underline cursor-pointer"
                      @click="handleVersionToggle(version)"
                    >
                      上架
                    </button>
                  </td>
                </tr>
                <tr v-if="versionData.length === 0">
                  <td colspan="7" class="py-16 text-center text-gray-400 text-sm">
                    暂无版本数据
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Footer -->
          <!-- <div class="flex justify-end px-6 py-4 border-t border-gray-100">
            <button
              class="px-5 py-2 text-sm bg-[#00b4b6] text-white rounded-[8px] hover:bg-[#009a9c] transition-colors cursor-pointer"
              @click="closeVersionModal"
            >
              关闭
            </button>
          </div> -->
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import {
  CubeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EllipsisHorizontalIcon,
  XMarkIcon
} from '@heroicons/vue/24/outline'
import { useUserPermissions } from '~~/lib/auth/composables/userPermissions'

const { ensureLoaded: ensureUserPermsLoaded, hasModelOp } = useUserPermissions()
void ensureUserPermsLoaded()

// 使用插件提供的 $dtpFetch
const { $dtpFetch } = useNuxtApp()

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 M'
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(2)} M`
}

// 分类树数据
const categoryTreeData = ref<any[]>([])

// 扁平化的分类列表（用于筛选器和编辑弹窗）
const flatCategoryList = computed(() => {
  const result: Array<{ name: string; id: number }> = []
  
  // 递归遍历分类树
  const flatten = (nodes: any[], parentName?: string) => {
    if (!nodes || !Array.isArray(nodes)) return
    for (const node of nodes) {
      // 只收集有 parentId 的子节点
      if (node.parentId && node.name) {
        // 显示为 "父级/子级" 格式
        const fullName = parentName ? `${parentName}/${node.name}` : node.name
        result.push({ name: fullName, id: node.id })
      }
      // 使用 child 字段（不是 children）
      if (node.child && node.child.length > 0) {
        // 传递当前节点名称作为父级名称
        const currentParentName = node.name || parentName
        flatten(node.child, currentParentName)
      }
    }
  }
  
  flatten(categoryTreeData.value)
  return result
})

// 获取分类树数据
const fetchCategoryTree = async () => {
  try {
    const data = await $dtpFetch('/v1/daas/category/my/tree', {
      method: 'POST',
      body: {
        categoryType: 'model'
      }
    })
    
    // 解析分类树数据
    const responseData = data as any
    if (responseData && responseData.result && responseData.result.nodes) {
      categoryTreeData.value = responseData.result.nodes
    }
  } catch (error) {
    console.error('获取分类树数据失败:', error)
  }
}

// 用户模型列表数据
const userModelsData = ref<any[]>([])
const userLoading = ref(false)
const teamIds = ref<string[]>([])

// 获取团队列表
const fetchTeamList = async () => {
  try {
    const data = await $dtpFetch('/v1/team/unit/list', {
      method: 'GET'
    })
    
    const responseData = data as any
    if (responseData && responseData.success && responseData.results) {
      // 收集所有的 teamId
      const allTeamIds: string[] = []
      responseData.results.forEach((unit: any) => {
        if (unit.teamList && Array.isArray(unit.teamList)) {
          unit.teamList.forEach((team: any) => {
            if (team.teamId) {
              allTeamIds.push(team.teamId)
            }
          })
        }
      })
      teamIds.value = allTeamIds
    }
  } catch (error) {
    console.error('获取团队列表失败:', error)
  }
}

// 获取用户模型列表
const fetchUserModels = async () => {
  userLoading.value = true
  try {
    const data = await $dtpFetch('/v1/daas/asset/model/personal/list', {
      method: 'POST',
      body: {
        keyword: searchQuery.value || '',
        publishedSet: [true, false],
        hierarchySet: [true, false],
        teamId: teamIds.value,
        pageNumber: currentPage.value,
        pageSize: currentPageSize.value
      }
    })
    
    // 解析用户模型数据
    const responseData = data as any
    if (responseData && responseData.result) {
      // 如果有 data 字段，解析数据
      if (responseData.result.data) {
        userModelsData.value = Array.isArray(responseData.result.data) 
          ? responseData.result.data 
          : (responseData.result.data.records || responseData.result.data.list || [])
        
        // 更新总记录数
        userTotalRecords.value = responseData.result.total || userModelsData.value.length
      } else {
        // 没有数据时清空
        userModelsData.value = []
        userTotalRecords.value = 0
      }
    }
  } catch (error) {
    console.error('获取用户模型列表失败:', error)
    userModelsData.value = []
    userTotalRecords.value = 0
  } finally {
    userLoading.value = false
  }
}

// 官方模型列表数据
const officialModelsData = ref<any[]>([])
const officialLoading = ref(false)

// 获取官方模型列表
const fetchOfficialModels = async () => {
  officialLoading.value = true
  try {
    // 根据上架状态筛选条件构建 publishedSet
    let publishedSet: boolean[]
    if (publishStatusFilter.value === '已上架') {
      publishedSet = [true]
    } else if (publishStatusFilter.value === '已下架') {
      publishedSet = [false]
    } else {
      publishedSet = [true, false]  // 默认显示全部
    }
    
    // 根据分类筛选条件构建 categoryIdSet
    let categoryIdSet: number[] = []
    if (categoryFilter.value) {
      // 从 flatCategoryList 中查找对应的分类 ID
      const matchedCategory = flatCategoryList.value.find(cat => cat.name === categoryFilter.value)
      if (matchedCategory) {
        categoryIdSet = [matchedCategory.id]
      }
    }
    
    const data = await $dtpFetch('/v1/daas/asset/model/official/list', {
      method: 'POST',
      body: {
        keyword: searchQuery.value || '',
        publishedSet: publishedSet,
        categoryIdSet: categoryIdSet,
        pageNumber: currentPage.value,
        pageSize: currentPageSize.value
      }
    })
    
    // 解析官方模型数据
    const responseData = data as any
    if (responseData && responseData.result) {
      // 如果有 data 字段，解析数据
      if (responseData.result.data && Array.isArray(responseData.result.data)) {
        officialModelsData.value = responseData.result.data.map((item: any) => {
          // 拼接缩略图URL
          let thumbnailUrl = ''
          if (item.thumbnails && Array.isArray(item.thumbnails) && item.thumbnails.length > 0 && item.thumbnails[0].uri) {
            thumbnailUrl = 'http://10.66.8.185:30080' + item.thumbnails[0].uri
          }
                  
          return {
            id: String(item.id),
            assetId: item.assetId || '', // 保存原始assetId(字符串类型)
            name: item.assetName || '',
            nameEn: item.assetNameEn || '',
            seedId: item.seedId || '',
            stageProduct: item.stageProduct || '',
            category: item.category ? JSON.stringify(item.category) : '[]',
            categoryIdSet: item.categoryIdSet && Array.isArray(item.categoryIdSet) ? item.categoryIdSet : [], // 保存原始categoryIdSet
            system: item.platform || '',
            dataVersion: item.assetVersion || '',
            assetSize: formatFileSize(item.size),
            publishTime: item.publishedAt || '',
            status: item.published ? '已上架' : '已下架',
            industryTag: item.industryTags ? JSON.stringify(item.industryTags) : '[]',
            thumbnailUrl: thumbnailUrl
          }
        })
        // 更新总记录数
        officialTotalRecords.value = responseData.result.total || officialModelsData.value.length
      } else {
        // 没有 data 字段时，表示没有数据
        officialModelsData.value = []
        officialTotalRecords.value = 0
      }
    }
  } catch (error) {
    console.error('获取官方模型列表失败:', error)
  } finally {
    officialLoading.value = false
  }
}

interface UserModel {
  id: string
  name: string
  seedId: string
  system: string
  productType: string
  originalFormat: string
  assetSize: string
  componentData: string
  generationTime: string
  status: string
}

interface OfficialModel {
  id: string
  assetId: string // 原始assetId,用于编辑接口
  name: string
  nameEn: string
  seedId: string
  stageProduct: string
  category: string // JSON字符串
  categoryIdSet: number[] // 原始分类ID数组
  system: string
  dataVersion: string
  assetSize: string
  publishTime: string
  status: string
  industryTag: string
  thumbnailUrl: string // 缩略图URL
}

// ---------- 下架 Popover ----------
const offshelfPopoverTarget = ref<string | null>(null) // model.id | 'batch'
const offshelfAnchorRects = ref<Record<string, DOMRect>>({})

const showOffshelfPopover = (id: string, event: MouseEvent) => {
  const btn = event.currentTarget as HTMLElement
  offshelfAnchorRects.value[id] = btn.getBoundingClientRect()
  offshelfPopoverTarget.value = id
}

const POPOVER_HEIGHT = 110 // px 估算 popover 高度
const POPOVER_MARGIN = 8 // 与按钮间距

// 智能判断弹出方向：上方空间不足则向下展开
const popoverDirection = computed<'up' | 'down'>(() => {
  if (!offshelfPopoverTarget.value) return 'up'
  const rect = offshelfAnchorRects.value[offshelfPopoverTarget.value]
  if (!rect) return 'up'
  return rect.top - POPOVER_HEIGHT - POPOVER_MARGIN < 0 ? 'down' : 'up'
})

const popoverStyle = computed(() => {
  if (!offshelfPopoverTarget.value) return {}
  const rect = offshelfAnchorRects.value[offshelfPopoverTarget.value]
  if (!rect) return {}
  const centerX = rect.left + rect.width / 2
  if (popoverDirection.value === 'up') {
    return {
      top: rect.top - POPOVER_MARGIN + 'px',
      left: centerX + 'px',
      transform: 'translate(-50%, -100%)',
      transformOrigin: 'bottom center'
    }
  } else {
    return {
      top: rect.bottom + POPOVER_MARGIN + 'px',
      left: centerX + 'px',
      transform: 'translate(-50%, 0)',
      transformOrigin: 'top center'
    }
  }
})
const hideOffshelfPopover = () => {
  offshelfPopoverTarget.value = null
}
const confirmOffshelf = () => {
  // TODO: 调用下架接口
  hideOffshelfPopover()
}

// ---------- 用户模型编辑 Modal ----------
const editModalVisible = ref(false)
const editForm = reactive({ name: '', thumbnail: '' })
const editNameError = ref('')
const lightboxVisible = ref(false)

const openEditModal = (model: UserModel) => {
  editForm.name = model.name
  editForm.thumbnail = ''
  editNameError.value = ''
  thumbnailPreview.value = ''
  editModalVisible.value = true
}
const closeEditModal = () => {
  editModalVisible.value = false
}
const handleEditConfirm = () => {
  if (!editForm.name.trim()) {
    editNameError.value = '请输入名称'
    return
  }
  // TODO: 调用编辑接口
  closeEditModal()
}

const thumbnailInput = ref<HTMLInputElement | null>(null)
const thumbnailPreview = ref<string>('')
const onThumbnailChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    thumbnailPreview.value = ev.target?.result as string
  }
  reader.readAsDataURL(file)
}

// ---------- 官方模型编辑 Modal ----------

const officialEditModalVisible = ref(false)
const officialEditForm = reactive({
  assetId: '', // 保存assetId（字符串类型）
  name: '',
  nameEn: '',
  category: '',
  categoryIdSet: [] as number[], // 保存categoryIdSet
  thumbnailUrl: '' // 保存上传后的缩略图URL
})
const officialEditLoading = ref(false) // 编辑提交loading状态
const officialEditErrors = reactive({ name: '', nameEn: '' })
const officialThumbnailInput = ref<HTMLInputElement | null>(null)
const officialThumbnailPreview = ref<string>('')
const officialLightboxVisible = ref(false)
const officialCategoryDropdownOpen = ref(false)

const openOfficialEditModal = (model: OfficialModel) => {
  officialEditForm.assetId = model.assetId
  officialEditForm.name = model.name
  officialEditForm.nameEn = model.nameEn || ''
  officialEditForm.categoryIdSet = model.categoryIdSet || []
  // 解析 category 字符串,如 '植物/乔木',取第一个作为单选值
  try {
    const parsed = JSON.parse(model.category)
    officialEditForm.category = Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : (flatCategoryList.value[0]?.name || '')
  } catch {
    officialEditForm.category = flatCategoryList.value[0]?.name || ''
  }
  // 复显已有缩略图
  officialEditForm.thumbnailUrl = model.thumbnailUrl || ''
  officialThumbnailPreview.value = model.thumbnailUrl || ''
  officialEditErrors.name = ''
  officialEditErrors.nameEn = ''
  officialCategoryDropdownOpen.value = false
  officialEditModalVisible.value = true
}
const closeOfficialEditModal = () => {
  officialEditModalVisible.value = false
  officialCategoryDropdownOpen.value = false
}
const handleOfficialEditConfirm = async () => {
  let valid = true
  if (!officialEditForm.name.trim()) {
    officialEditErrors.name = '请输入名称'
    valid = false
  }
  if (!officialEditForm.nameEn.trim()) {
    officialEditErrors.nameEn = '请输入英文名称'
    valid = false
  }
  if (!valid) return
  
  // 调用编辑接口
  officialEditLoading.value = true
  try {
    // 从分类名称查找对应的ID
    let categoryIdSet = officialEditForm.categoryIdSet
    if (officialEditForm.category) {
      const matchedCategory = flatCategoryList.value.find(cat => cat.name === officialEditForm.category)
      if (matchedCategory) {
        categoryIdSet = [matchedCategory.id]
      }
    }
    
    await $dtpFetch('/v1/daas/asset/model/update', {
      method: 'PUT',
      body: {
        assetId: officialEditForm.assetId,
        assetName: officialEditForm.name,
        assetNameEn: officialEditForm.nameEn,
        categoryIdSet: categoryIdSet,
        thumbnails: officialEditForm.thumbnailUrl ? [{ uri: officialEditForm.thumbnailUrl }] : []
      }
    })
    
    // 关闭弹窗
    closeOfficialEditModal()
    
    // 刷新列表
    await fetchOfficialModels()
  } catch (error) {
    console.error('编辑官方模型失败:', error)
  } finally {
    officialEditLoading.value = false
  }
}

const onOfficialThumbnailChange = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  
  // 先显示预览
  const reader = new FileReader()
  reader.onload = (ev) => {
    officialThumbnailPreview.value = ev.target?.result as string
  }
  reader.readAsDataURL(file)
  
  // 调用上传接口
  try {
    const formData = new FormData()
    formData.append('file', file)
    
    const result = await $dtpFetch('/v1/daas/thumbnail/upload', {
      method: 'POST',
      body: formData
    })
    
    console.log('缩略图上传结果:', result)
    
    // 保存上传后的URL
    const responseData = result as any
    if (responseData && responseData.result && responseData.result.url) {
      officialEditForm.thumbnailUrl = responseData.result.url
      console.log('缩略图URL已保存:', officialEditForm.thumbnailUrl)
    }
  } catch (error) {
    console.error('缩略图上传失败:', error)
  }
}

// ---------- 版本管理 Modal ----------
const versionModalVisible = ref(false)
const versionLoading = ref(false)
const versionData = ref<any[]>([])
const currentVersionModel = ref<OfficialModel | null>(null)

const openVersionModal = async (model: OfficialModel) => {
  currentVersionModel.value = model
  versionModalVisible.value = true
  versionLoading.value = true
  
  // 调用接口获取版本数据
  try {
    const data = await $dtpFetch('/v1/daas/asset/model/list', {
      method: 'POST',
      body: {
        seedIdSet: [model.seedId],
        stageProduct: [model.stageProduct || ''],
        pageNumber: 1,
        pageSize: 20
      }
    })
    
    // 解析返回数据
    const responseData = data as any
    if (responseData && responseData.result) {
      if (responseData.result.data && Array.isArray(responseData.result.data)) {
        versionData.value = responseData.result.data.map((item: any) => ({
          id: item.id || '',
          assetId: item.assetId || item.id || '',
          name: item.assetName || item.name || '',
          version: item.assetVersion || item.version || '',
          category: item.category ? JSON.stringify(item.category) : '',
          publishTime: item.publishedAt || item.publishTime || '',
          fileSize: formatFileSize(item.size || 0),
          status: item.published ? '已上架' : '已下架'
        }))
      } else {
        versionData.value = []
      }
    }
  } catch (error) {
    console.error('获取版本列表失败:', error)
    versionData.value = []
  } finally {
    versionLoading.value = false
  }
}

const closeVersionModal = () => {
  versionModalVisible.value = false
  versionLoading.value = false
  versionData.value = []
  currentVersionModel.value = null
}

const handleVersionToggle = async (version: any) => {
  const isPublishing = version.status === '已下架'
  const action = isPublishing ? '上架' : '下架'
  
  try {
    // 调用上架/下架接口
    await $dtpFetch('/v1/daas/asset/publish', {
      method: 'PUT',
      body: {
        assetId: version.assetId,
        published: isPublishing
      }
    })
    
    // 更新本地状态
    version.status = isPublishing ? '已上架' : '已下架'
    
    // 重新加载版本列表数据
    if (currentVersionModel.value) {
      await openVersionModal(currentVersionModel.value)
    }
    
    // 更新官方模型列表中的状态
    const modelInList = officialModelsData.value.find(m => m.id === currentVersionModel.value?.id)
    if (modelInList) {
      modelInList.status = version.status
    }
  } catch (error) {
    console.error(`${action}失败:`, error)
  }
}

// 点击外部关闭分类下拉
onMounted(async () => {
  document.addEventListener('click', () => {
    officialCategoryDropdownOpen.value = false
  })
  
  // 先获取团队列表
  await fetchTeamList()
  
  // 组件挂载时自动加载用户模型数据
  await fetchUserModels()
})

const activeTab = ref<'user' | 'official'>('user')
const searchQuery = ref('')
// 用户模型筛选
const statusFilter = ref('')
const componentDataFilter = ref('')
// 官方模型筛选
const publishStatusFilter = ref('')
const categoryFilter = ref('')

// 监听筛选条件变化，自动重新加载数据
let isSwitchingTab = false

watch(
  [searchQuery, statusFilter, componentDataFilter, publishStatusFilter, categoryFilter],
  async () => {
    // 如果是切换 tab 导致的清空，不触发重新加载
    if (isSwitchingTab) return
    
    // 重置到第一页
    currentPage.value = 1
    
    // 根据当前 tab 重新加载数据
    if (activeTab.value === 'user') {
      await fetchUserModels()
    } else {
      await fetchOfficialModels()
    }
  }
)

// 分页状态
const currentPage = ref(1)
const currentPageSize = ref(20)
const userTotalRecords = ref(0)
const officialTotalRecords = ref(0)

// 计算总记录数
const totalRecords = computed(() => {
  return activeTab.value === 'user' ? userTotalRecords.value : officialTotalRecords.value
})

// 计算总页数
const totalPages = computed(() => {
  return Math.ceil(totalRecords.value / currentPageSize.value)
})

// 计算起始记录
const startRecord = computed(() => {
  if (totalRecords.value === 0) return 0
  return (currentPage.value - 1) * currentPageSize.value + 1
})

// 计算结束记录
const endRecord = computed(() => {
  return Math.min(currentPage.value * currentPageSize.value, totalRecords.value)
})

// 计算可见的页码
const visiblePages = computed(() => {
  const pages: (number | string)[] = []
  const total = totalPages.value
  const current = currentPage.value
  
  if (total <= 7) {
    // 总页数小于等于7，显示所有页码
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
    // 总页数大于7，显示省略号
    if (current <= 4) {
      // 当前页在前面
      for (let i = 1; i <= 5; i++) {
        pages.push(i)
      }
      pages.push('...')
      pages.push(total)
    } else if (current >= total - 3) {
      // 当前页在后面
      pages.push(1)
      pages.push('...')
      for (let i = total - 4; i <= total; i++) {
        pages.push(i)
      }
    } else {
      // 当前页在中间
      pages.push(1)
      pages.push('...')
      for (let i = current - 1; i <= current + 1; i++) {
        pages.push(i)
      }
      pages.push('...')
      pages.push(total)
    }
  }
  
  return pages
})

const currentData = computed(() => {
  if (activeTab.value === 'user') {
    // 使用API返回的用户模型数据（真实数据，没有就显示空）
    return userModelsData.value
  } else {
    // 使用API返回的官方模型数据（真实数据，没有就显示空）
    return officialModelsData.value
  }
})

const filteredModels = computed(() => {
  let result = currentData.value as (UserModel | OfficialModel)[]
  if (searchQuery.value) {
    const q = searchQuery.value
    result = result.filter((m) => m.name.includes(q) || m.seedId.includes(q))
  }
  return result
})

// 勾选状态（仅用户模型）
const selectedIds = ref<Set<string>>(new Set())

const isAllSelected = computed(
  () =>
    filteredModels.value.length > 0 &&
    filteredModels.value.every((m) => selectedIds.value.has(m.id))
)
const isIndeterminate = computed(
  () =>
    filteredModels.value.some((m) => selectedIds.value.has(m.id)) &&
    !isAllSelected.value
)

const toggleSelect = (id: string) => {
  const next = new Set(selectedIds.value)
  next.has(id) ? next.delete(id) : next.add(id)
  selectedIds.value = next
}

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedIds.value = new Set()
  } else {
    selectedIds.value = new Set(filteredModels.value.map((m) => m.id))
  }
}

// 切换 tab 时清空选中和筛选条件
const switchTab = async (tab: 'user' | 'official') => {
  // 设置标志，防止 watch 重复触发
  isSwitchingTab = true
  
  activeTab.value = tab
  selectedIds.value = new Set()
  searchQuery.value = ''
  statusFilter.value = ''
  componentDataFilter.value = ''
  publishStatusFilter.value = ''
  categoryFilter.value = ''
  currentPage.value = 1
  
  // 切换到用户模型时调用API
  if (tab === 'user') {
    await fetchUserModels()
  }
  // 切换到官方模型时调用API
  else if (tab === 'official') {
    // 获取分类树数据
    if (categoryTreeData.value.length === 0) {
      await fetchCategoryTree()
    }
    await fetchOfficialModels()
  }
  
  // 重置标志
  setTimeout(() => {
    isSwitchingTab = false
  }, 100)
}

// 切换页码
const changePage = async (page: number) => {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  
  if (activeTab.value === 'user') {
    await fetchUserModels()
  } else {
    await fetchOfficialModels()
  }
}

// 改变每页显示数量
const onPageSizeChange = async () => {
  currentPage.value = 1
  
  if (activeTab.value === 'user') {
    await fetchUserModels()
  } else {
    await fetchOfficialModels()
  }
}
</script>

<style scoped>
/* 强制覆盖输入框 / 下拉框聚焦时的边框颜色 */
.focus-brand:focus,
.focus-brand:focus-visible {
  border-color: #00b4b6 !important;
  background-color: #ffffff !important;
  outline: none !important;
  box-shadow: none !important;
}

/* 错误状态下聚焦保持红色边框 */
.focus-brand.focus-error:focus,
.focus-brand.focus-error:focus-visible {
  border-color: #f87171 !important;
}
</style>