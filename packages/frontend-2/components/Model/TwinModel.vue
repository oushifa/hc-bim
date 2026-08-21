<template>
  <div class="h-full flex flex-col bg-[#E7EBEB] overflow-hidden">
    <WorkbenchUploadSyncProjectSubscriber
      v-for="projectId in syncRefreshProjectIds"
      :key="projectId"
      :project-id="projectId"
      :on-version-update="scheduleRefreshUserModels"
    />
    <input
      ref="uploadFileInput"
      type="file"
      class="hidden"
      aria-label="选择要上传的孪生模型文件"
      @change="onUploadFileSelected"
    />
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
            <div class="relative w-32" @click.stop>
              <div
                class="px-3 py-1.5 border rounded-[8px] text-sm focus:outline-none cursor-pointer transition-colors flex items-center justify-between text-gray-600"
                :class="
                  statusFilter
                    ? 'border-[#00b4b6] bg-white'
                    : 'border-transparent bg-gray-50'
                "
                @click="toggleFilterDropdown('status')"
              >
                <span class="truncate">{{ statusFilterLabel }}</span>
                <ChevronDownIcon
                  class="w-4 h-4 text-gray-400 transition-transform shrink-0 ml-1"
                  :class="openFilterDropdown === 'status' ? 'rotate-180' : ''"
                />
              </div>
              <Transition name="fade-down">
                <div
                  v-if="openFilterDropdown === 'status'"
                  class="absolute top-full left-0 mt-1 w-full bg-white border border-[#00b4b6] rounded-[8px] shadow-lg z-50 overflow-hidden py-1"
                >
                  <div
                    v-for="opt in statusFilterOptions"
                    :key="opt.value"
                    class="w-full px-3 py-2 text-sm cursor-pointer transition-colors text-left"
                    :class="
                      statusFilter === opt.value
                        ? 'bg-[#00b4b6] text-white'
                        : 'text-gray-600 hover:bg-[#e6f7f8] hover:text-[#00b4b6]'
                    "
                    @click="statusFilter = opt.value; openFilterDropdown = null"
                  >
                    {{ opt.label }}
                  </div>
                </div>
              </Transition>
            </div>
          </div>
          <div class="flex items-center space-x-2">
            <span class="text-sm text-gray-600 whitespace-nowrap">构件数据：</span>
            <div class="relative w-32" @click.stop>
              <div
                class="px-3 py-1.5 border rounded-[8px] text-sm focus:outline-none cursor-pointer transition-colors flex items-center justify-between text-gray-600"
                :class="
                  componentDataFilter
                    ? 'border-[#00b4b6] bg-white'
                    : 'border-transparent bg-gray-50'
                "
                @click="toggleFilterDropdown('component')"
              >
                <span class="truncate">{{ componentDataFilterLabel }}</span>
                <ChevronDownIcon
                  class="w-4 h-4 text-gray-400 transition-transform shrink-0 ml-1"
                  :class="openFilterDropdown === 'component' ? 'rotate-180' : ''"
                />
              </div>
              <Transition name="fade-down">
                <div
                  v-if="openFilterDropdown === 'component'"
                  class="absolute top-full left-0 mt-1 w-full bg-white border border-[#00b4b6] rounded-[8px] shadow-lg z-50 overflow-hidden py-1"
                >
                  <div
                    v-for="opt in componentDataFilterOptions"
                    :key="opt.value"
                    class="w-full px-3 py-2 text-sm cursor-pointer transition-colors text-left"
                    :class="
                      componentDataFilter === opt.value
                        ? 'bg-[#00b4b6] text-white'
                        : 'text-gray-600 hover:bg-[#e6f7f8] hover:text-[#00b4b6]'
                    "
                    @click="componentDataFilter = opt.value; openFilterDropdown = null"
                  >
                    {{ opt.label }}
                  </div>
                </div>
              </Transition>
            </div>
          </div>
        </template>

        <!-- 官方模型筛选项 -->
        <template v-else>
          <div class="flex items-center space-x-2">
            <span class="text-sm text-gray-600 whitespace-nowrap">上架状态：</span>
            <div class="relative w-32" @click.stop>
              <div
                class="px-3 py-1.5 border rounded-[8px] text-sm focus:outline-none cursor-pointer transition-colors flex items-center justify-between text-gray-600"
                :class="
                  publishStatusFilter
                    ? 'border-[#00b4b6] bg-white'
                    : 'border-transparent bg-gray-50'
                "
                @click="toggleFilterDropdown('publish')"
              >
                <span class="truncate">{{ publishStatusFilterLabel }}</span>
                <ChevronDownIcon
                  class="w-4 h-4 text-gray-400 transition-transform shrink-0 ml-1"
                  :class="openFilterDropdown === 'publish' ? 'rotate-180' : ''"
                />
              </div>
              <Transition name="fade-down">
                <div
                  v-if="openFilterDropdown === 'publish'"
                  class="absolute top-full left-0 mt-1 w-full bg-white border border-[#00b4b6] rounded-[8px] shadow-lg z-50 overflow-hidden py-1"
                >
                  <div
                    v-for="opt in publishStatusFilterOptions"
                    :key="opt.value"
                    class="w-full px-3 py-2 text-sm cursor-pointer transition-colors text-left"
                    :class="
                      publishStatusFilter === opt.value
                        ? 'bg-[#00b4b6] text-white'
                        : 'text-gray-600 hover:bg-[#e6f7f8] hover:text-[#00b4b6]'
                    "
                    @click="publishStatusFilter = opt.value; openFilterDropdown = null"
                  >
                    {{ opt.label }}
                  </div>
                </div>
              </Transition>
            </div>
          </div>
          <div class="flex items-center space-x-2">
            <span class="text-sm text-gray-600 whitespace-nowrap">分类：</span>
            <div class="relative w-48" @click.stop>
              <div
                class="px-3 py-1.5 border rounded-[8px] text-sm focus:outline-none cursor-pointer transition-colors flex items-center justify-between text-gray-600"
                :class="
                  categoryFilter
                    ? 'border-[#00b4b6] bg-white'
                    : 'border-transparent bg-gray-50'
                "
                @click="toggleFilterDropdown('category')"
              >
                <span class="truncate">{{ categoryFilter || '请选择分类' }}</span>
                <ChevronDownIcon
                  class="w-4 h-4 text-gray-400 transition-transform shrink-0 ml-1"
                  :class="openFilterDropdown === 'category' ? 'rotate-180' : ''"
                />
              </div>
              <Transition name="fade-down">
                <div
                  v-if="openFilterDropdown === 'category'"
                  class="absolute top-full left-0 mt-1 w-full bg-white border border-[#00b4b6] rounded-[8px] shadow-lg z-50 max-h-60 overflow-y-auto py-1"
                >
                  <div
                    class="w-full px-3 py-2 text-sm cursor-pointer transition-colors text-left"
                    :class="
                      !categoryFilter
                        ? 'bg-[#00b4b6] text-white'
                        : 'text-gray-600 hover:bg-[#e6f7f8] hover:text-[#00b4b6]'
                    "
                    @click="categoryFilter = ''; openFilterDropdown = null"
                  >
                    全部
                  </div>
                  <div
                    v-for="cat in flatCategoryList"
                    :key="cat.id"
                    class="w-full px-3 py-2 text-sm cursor-pointer transition-colors text-left"
                    :class="
                      categoryFilter === cat.name
                        ? 'bg-[#00b4b6] text-white'
                        : 'text-gray-600 hover:bg-[#e6f7f8] hover:text-[#00b4b6]'
                    "
                    @click="categoryFilter = cat.name; openFilterDropdown = null"
                  >
                    {{ cat.name }}
                  </div>
                </div>
              </Transition>
            </div>
          </div>
        </template>

        <div class="flex-1 flex justify-end items-center gap-2">
          <!-- 上传中：按钮左侧独立的 8 点阵 loading（颜色与按钮一致 #00b4b6）
              每个点循环「淡色小号 → 深色大号 → 淡色小号」，相位依次错开 3s/8，呈顺时针依次点亮效果 -->
          <svg
            v-if="uploadingTwinModel"
            class="w-5 h-5 text-[#00b4b6] cursor-pointer"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            title="查看上传进度"
            @click.stop="openUploadTasksModal"
          >
            <circle class="twin-dot" cx="20" cy="12" r="1.4" fill="currentColor" opacity="0.35" style="animation-delay: -2.625s" />
            <circle class="twin-dot" cx="17.66" cy="17.66" r="1.4" fill="currentColor" opacity="0.35" style="animation-delay: -2.25s" />
            <circle class="twin-dot" cx="12" cy="20" r="1.4" fill="currentColor" opacity="0.35" style="animation-delay: -1.875s" />
            <circle class="twin-dot" cx="6.34" cy="17.66" r="1.4" fill="currentColor" opacity="0.35" style="animation-delay: -1.5s" />
            <circle class="twin-dot" cx="4" cy="12" r="1.4" fill="currentColor" opacity="0.35" style="animation-delay: -1.125s" />
            <circle class="twin-dot" cx="6.34" cy="6.34" r="1.4" fill="currentColor" opacity="0.35" style="animation-delay: -0.75s" />
            <circle class="twin-dot" cx="12" cy="4" r="1.4" fill="currentColor" opacity="0.35" style="animation-delay: -0.375s" />
            <circle class="twin-dot" cx="17.66" cy="6.34" r="1.4" fill="currentColor" opacity="0.35" style="animation-delay: 0s" />
          </svg>
          <button
            v-if="activeTab === 'user' && hasModelOp('canUpload')"
            type="button"
            class="px-4 py-2 rounded-[10px] text-sm font-medium text-white bg-[#00b4b6] hover:bg-[#009a9c] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            :disabled="uploadingTwinModel"
            @click="openUploadFilePicker"
          >
            上传模型
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
                :colspan="activeTab === 'user' ? 8 : 9"
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
              <td class="py-4 px-4">
                <div class="flex items-center space-x-3">
                  <div
                    class="w-10 h-10 rounded-[8px] bg-gray-100 overflow-hidden shrink-0"
                  >
                    <img
                      v-if="(model as any).thumbnailUrl"
                      :src="(model as any).thumbnailUrl"
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
                :colspan="activeTab === 'user' ? 8 : 9"
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
          <div ref="pageSizeSelectRef" class="relative" @click.stop>
            <button
              type="button"
              class="px-3 py-1 border border-[#00b4b6] rounded-[8px] text-sm text-gray-600 bg-white cursor-pointer transition-colors hover:bg-[#00b4b6]/5 flex items-center justify-between min-w-[88px]"
              @click="pageSizeDropdownOpen = !pageSizeDropdownOpen"
            >
              <span class="truncate">{{ currentPageSize }}/页</span>
              <ChevronDownIcon
                class="w-4 h-4 text-[#00b4b6] transition-transform shrink-0 ml-2"
                :class="pageSizeDropdownOpen ? 'rotate-180' : ''"
              />
            </button>
            <Transition name="fade-down">
              <div
                v-if="pageSizeDropdownOpen"
                class="absolute right-0 bottom-full mb-1 w-full bg-white border border-[#00b4b6] rounded-[8px] shadow-lg z-50 overflow-hidden py-1 min-w-[88px]"
              >
                <button
                  v-for="size in pageSizeOptions"
                  :key="size"
                  type="button"
                  class="w-full px-3 py-2 text-sm cursor-pointer transition-colors text-left whitespace-nowrap"
                  :class="
                    currentPageSize === size
                      ? 'bg-[#00b4b6] text-white'
                      : 'text-gray-600 hover:bg-[#e6f7f8] hover:text-[#00b4b6]'
                  "
                  @click="selectPageSize(size)"
                >
                  {{ size }}/页
                </button>
              </div>
            </Transition>
          </div>
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
        <p class="text-sm font-medium text-gray-800 mb-3">{{ popoverConfirmText }}</p>
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
                class="relative w-36 h-36 border-2 border-dashed border-gray-200 rounded-[10px] overflow-hidden cursor-pointer hover:border-[#00b4b6] transition-colors group"
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

  <!-- 上传进度 Modal（点击上传按钮左侧 loading icon 打开） -->
  <Transition
    enter-active-class="transition-all duration-200"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-all duration-150"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="uploadTasksModalVisible"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      @click.self="closeUploadTasksModal"
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
          v-if="uploadTasksModalVisible"
          class="bg-white rounded-[16px] shadow-2xl w-[960px] max-w-[90vw] max-h-[90vh] overflow-hidden flex flex-col"
        >
          <!-- Header -->
          <div
            class="flex items-center justify-between px-6 py-4 border-b border-gray-100"
          >
            <h3 class="text-base font-semibold text-gray-800">上传进度</h3>
            <button
              class="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              @click="closeUploadTasksModal"
            >
              <XMarkIcon class="w-5 h-5" />
            </button>
          </div>

          <!-- Body -->
          <div class="flex-1 overflow-auto px-6 py-4">
            <!-- Tabs（参考用户模型/官方模型 tab 样式） -->
            <div class="flex items-center space-x-1 border-b border-gray-100 mb-4">
              <button
                class="px-4 py-2 text-sm font-medium transition-colors relative"
                :class="
                  uploadTasksTab === 'uploading'
                    ? 'text-[#00b4b6]'
                    : 'text-gray-500 hover:text-gray-700'
                "
                @click="uploadTasksTab = 'uploading'"
              >
                正在上传
                <div
                  v-if="uploadTasksTab === 'uploading'"
                  class="absolute bottom-[-1px] left-0 w-full h-0.5 bg-[#00b4b6] rounded-t-full"
                />
              </button>
              <button
                class="px-4 py-2 text-sm font-medium transition-colors relative"
                :class="
                  uploadTasksTab === 'converting'
                    ? 'text-[#00b4b6]'
                    : 'text-gray-500 hover:text-gray-700'
                "
                @click="uploadTasksTab = 'converting'"
              >
                正在转换
                <div
                  v-if="uploadTasksTab === 'converting'"
                  class="absolute bottom-[-1px] left-0 w-full h-0.5 bg-[#00b4b6] rounded-t-full"
                />
              </button>
            </div>

            <!-- 正在上传列表：模型名称 / 原始格式 / 文件大小 / 状态 -->
            <table v-if="uploadTasksTab === 'uploading'" class="w-full text-left border-collapse">
              <thead class="bg-[#f8f9fa] sticky top-0 z-10">
                <tr class="border-b border-gray-100 text-sm text-gray-600 font-medium">
                  <th class="py-3 px-4">模型名称</th>
                  <th class="py-3 px-4">原始格式</th>
                  <th class="py-3 px-4">文件大小</th>
                  <th class="py-3 px-4">状态</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="task in uploadingTasks"
                  :key="task.id"
                  class="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                >
                  <td class="py-3 px-4 text-sm text-gray-800">{{ task.modelName }}</td>
                  <td class="py-3 px-4 text-sm text-gray-600">{{ task.rawFormat }}</td>
                  <td class="py-3 px-4 text-sm text-gray-600">{{ task.fileSize }}</td>
                  <td
                    class="py-3 px-4 text-sm"
                    :class="task.status === '上传失败' ? 'text-red-500' : 'text-[#00b4b6]'"
                  >
                    {{ task.status }}
                  </td>
                </tr>
                <tr v-if="uploadingTasks.length === 0">
                  <td colspan="4" class="py-16 text-center text-gray-400 text-sm">
                    暂无正在上传的任务
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- 正在转换列表：模型名称 / 原始格式 / 转换状态 / 进度 -->
            <table v-else class="w-full text-left border-collapse">
              <thead class="bg-[#f8f9fa] sticky top-0 z-10">
                <tr class="border-b border-gray-100 text-sm text-gray-600 font-medium">
                  <th class="py-3 px-4">模型名称</th>
                  <th class="py-3 px-4">原始格式</th>
                  <th class="py-3 px-4">转换状态</th>
                  <th class="py-3 px-4">进度</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="task in convertingTasks"
                  :key="task.id"
                  class="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                >
                  <td class="py-3 px-4 text-sm text-gray-800">
                    {{ task.modelName }} | TaskID:{{ task.id }}
                  </td>
                  <td class="py-3 px-4 text-sm text-gray-600">{{ task.rawFormat }}</td>
                  <td class="py-3 px-4 text-sm text-gray-600">{{ task.convertStatus }}</td>
                  <td class="py-3 px-4 text-sm text-gray-600">
                    <div class="flex items-center gap-2">
                      <div class="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          class="h-full bg-[#00b4b6] rounded-full transition-all"
                          :style="{ width: task.progress + '%' }"
                        />
                      </div>
                      <span class="text-xs text-gray-500 whitespace-nowrap">{{ task.progress }}%</span>
                    </div>
                  </td>
                </tr>
                <tr v-if="convertingTasks.length === 0">
                  <td colspan="4" class="py-16 text-center text-gray-400 text-sm">
                    暂无正在转换的任务
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
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
  ChevronDownIcon,
  EllipsisHorizontalIcon,
  XMarkIcon
} from '@heroicons/vue/24/outline'
import { ensureError } from '@speckle/shared'
import WorkbenchUploadSyncProjectSubscriber from '~~/components/singleton/WorkbenchUploadSyncProjectSubscriber.vue'
import { useUserPermissions } from '~~/lib/auth/composables/userPermissions'
import { useGlobalToast } from '~~/lib/common/composables/toast'
import { useModelLibraryApi } from '~~/lib/projects/composables/modelLibrary'
import { useWorkbenchUploadSync } from '~~/lib/projects/composables/workbenchUploadSync'
import { sanitizeModelName } from '~~/lib/projects/helpers/models'

const { ensureLoaded: ensureUserPermsLoaded, hasModelOp } = useUserPermissions()
void ensureUserPermsLoaded()
const { triggerNotification } = useGlobalToast()
const { ensureModel } = useModelLibraryApi()
const { uploadModelFile } = useWorkbenchUploadSync()

// 使用插件提供的 $dtpFetch
const { $dtpFetch } = useNuxtApp()
const dtpFetch = $dtpFetch as <T = unknown>(
  request: string,
  options?: {
    method?: string
    headers?: HeadersInit
    body?: BodyInit | Record<string, unknown> | null
    prefix?: string
  }
) => Promise<T>

const uploadFileInput = ref<HTMLInputElement | null>(null)
const uploadingTwinModel = ref(false)
const uploadProgress = ref<number | null>(null)

// ---- 上传进度弹窗（点击上传按钮左侧 loading icon 打开）----
/** 正在上传列表项：模型名称 / 原始格式 / 文件大小 / 状态（进度与状态由前端自行维护） */
type UploadingTask = {
  id: string
  modelName: string
  rawFormat: string
  fileSize: string
  status: string
}
/** 正在转换列表项：模型名称 / 原始格式 / 转换状态 / 进度（轮询 /v1/daas/pipeline/task/{taskId}） */
type ConvertingTask = {
  id: string
  modelName: string
  rawFormat: string
  convertStatus: string
  progress: number
}

const uploadTasksModalVisible = ref(false)
const uploadTasksTab = ref<'uploading' | 'converting'>('uploading')
const uploadingTasks = ref<UploadingTask[]>([])
const convertingTasks = ref<ConvertingTask[]>([])

const openUploadTasksModal = () => {
  uploadTasksTab.value = 'uploading'
  uploadTasksModalVisible.value = true
}
const closeUploadTasksModal = () => {
  uploadTasksModalVisible.value = false
}

// ---- 正在上传：前端自控进度与状态 ----
/** 上传开始时加入列表，返回任务 id 供完成/失败时移除 */
const addUploadingTask = (file: File): string => {
  const id = 'up-' + Date.now() + '-' + Math.random().toString(36).slice(2)
  uploadingTasks.value.push({
    id,
    modelName: getFileBaseName(file.name),
    rawFormat: (getFileExtension(file.name) || '未知').toUpperCase(),
    fileSize: formatFileSize(file.size),
    status: '上传中'
  })
  return id
}
const removeUploadingTask = (id: string) => {
  uploadingTasks.value = uploadingTasks.value.filter((task) => task.id !== id)
}

// ---- 正在转换：轮询 GET /v1/daas/pipeline/task/{taskId} ----
/** 转换状态 → 中文文案（1.md 协议） */
const CONVERT_STATUS_TEXT: Record<string, string> = {
  QUEUING: '排队中',
  RUNNING: '正在转换',
  SUCCEEDED: '转换成功',
  FAILED: '转换失败',
  STOPPED: '已停止'
}
/** 到达终态后停止轮询 */
const CONVERT_TERMINAL_STATUSES = ['SUCCEEDED', 'FAILED', 'STOPPED']

type PipelineTaskResult = {
  taskId?: string
  assetId?: string
  assetName?: string
  technicsVersion?: string
  totalStage?: number
  currentStage?: number
  originalAssetExt?: string
  status?: string
}

const convertingPollTimers = new Map<string, ReturnType<typeof setInterval>>()

const queryPipelineTask = async (taskId: string): Promise<PipelineTaskResult | null> => {
  const data = (await dtpFetch(`/v1/daas/pipeline/task/${taskId}`, {
    method: 'GET'
  })) as { result?: PipelineTaskResult }
  return data?.result ?? null
}

/** 刷新单个转换任务；返回是否已到达终态（停止轮询） */
const refreshConvertingTask = async (taskId: string): Promise<boolean> => {
  const result = await queryPipelineTask(taskId).catch(() => null)
  if (!result) return false

  const index = convertingTasks.value.findIndex((task) => task.id === taskId)
  if (index === -1) return true

  const totalStage = result.totalStage ?? 0
  convertingTasks.value[index] = {
    ...convertingTasks.value[index],
    convertStatus: CONVERT_STATUS_TEXT[result.status ?? ''] ?? result.status ?? '未知',
    progress:
      totalStage > 0 ? Math.round(((result.currentStage ?? 0) / totalStage) * 100) : 0
  }
  return CONVERT_TERMINAL_STATUSES.includes(result.status ?? '')
}

/** 转换任务加入列表并开始轮询（3s 间隔）；taskId 由触发模型转换的接口返回 */
const addConvertingTask = async (
  taskId: string,
  modelName: string,
  rawFormat: string
) => {
  if (convertingTasks.value.some((task) => task.id === taskId)) return
  convertingTasks.value.push({
    id: taskId,
    modelName,
    rawFormat,
    convertStatus: '排队中',
    progress: 0
  })

  const stopPolling = () => {
    clearInterval(timer)
    convertingPollTimers.delete(taskId)
  }
  const timer = setInterval(async () => {
    if (await refreshConvertingTask(taskId)) stopPolling()
  }, 3000)
  convertingPollTimers.set(taskId, timer)

  // 加入后立即查询一次
  if (await refreshConvertingTask(taskId)) stopPolling()
}
const syncRefreshProjectIdSet = ref<Set<string>>(new Set())

const LIGHT_MODEL_EXTENSIONS = new Set(['ifc', 'rvt'])
const DTP_MIN_NON_LAST_CHUNK_SIZE = 8 * 1024 * 1024
const DTP_MAX_NON_LAST_CHUNK_SIZE = 10 * 1024 * 1024
const DTP_TARGET_NON_LAST_CHUNK_SIZE = 9 * 1024 * 1024

const syncRefreshProjectIds = computed(() =>
  Array.from(syncRefreshProjectIdSet.value).filter((id) => !!id)
)

const getFileExtension = (fileName: string) => {
  const match = fileName.toLowerCase().match(/\.([^.]+)$/)
  return match?.[1] || ''
}

const getFileBaseName = (fileName: string) =>
  fileName.replace(/\.[^.]+$/, '').trim() || fileName.trim()

const isLightModelFile = (fileName: string) =>
  LIGHT_MODEL_EXTENSIONS.has(getFileExtension(fileName))

const resetUploadPicker = () => {
  uploadingTwinModel.value = false
  uploadProgress.value = null
  if (uploadFileInput.value) {
    uploadFileInput.value.value = ''
  }
}

const openUploadFilePicker = () => {
  if (uploadingTwinModel.value) return
  uploadFileInput.value?.click()
}

const addSyncRefreshProjectId = (projectId: string) => {
  if (!projectId) return
  const next = new Set(syncRefreshProjectIdSet.value)
  next.add(projectId)
  syncRefreshProjectIdSet.value = next
}

let refreshUserModelsTimer: ReturnType<typeof setTimeout> | null = null
let refreshUserModelsBurstTimers: ReturnType<typeof setTimeout>[] = []

const scheduleRefreshUserModels = () => {
  if (refreshUserModelsTimer) {
    clearTimeout(refreshUserModelsTimer)
  }

  refreshUserModelsTimer = setTimeout(() => {
    if (activeTab.value === 'user') {
      void fetchUserModels()
    }
  }, 200)
}

const scheduleRefreshUserModelsBurst = () => {
  refreshUserModelsBurstTimers.forEach((timer) => clearTimeout(timer))
  refreshUserModelsBurstTimers = [2000, 5000, 10000].map((delay) =>
    setTimeout(() => {
      if (activeTab.value === 'user') {
        void fetchUserModels()
      }
    }, delay)
  )
}

const resolveDirectUploadChunkPlan = (fileSize: number) => {
  if (fileSize <= DTP_MAX_NON_LAST_CHUNK_SIZE) {
    return [
      {
        part: 0,
        start: 0,
        end: fileSize,
        size: fileSize,
        lastChunk: true,
        totalPart: 1
      }
    ]
  }

  const sizes: number[] = []
  let remaining = fileSize

  while (remaining > DTP_MAX_NON_LAST_CHUNK_SIZE) {
    sizes.push(DTP_TARGET_NON_LAST_CHUNK_SIZE)
    remaining -= DTP_TARGET_NON_LAST_CHUNK_SIZE
  }

  sizes.push(remaining)

  if (
    sizes.length > 1 &&
    sizes
      .slice(0, -1)
      .some(
        (size) =>
          size <= DTP_MIN_NON_LAST_CHUNK_SIZE || size >= DTP_MAX_NON_LAST_CHUNK_SIZE
      )
  ) {
    throw new Error('模型文件分片大小不符合 DTP 上传要求')
  }

  let offset = 0
  return sizes.map((size, part) => {
    const start = offset
    const end = start + size
    offset = end

    return {
      part,
      start,
      end,
      size: end - start,
      lastChunk: part === sizes.length - 1,
      totalPart: sizes.length
    }
  })
}

const uploadFileChunkToDtp = async (params: {
  uploadUrl: string
  uploadToken: string
  uploadPathPrefix: string
  file: File
}) => {
  const { uploadUrl, uploadToken, uploadPathPrefix, file } = params
  const chunkPlan = resolveDirectUploadChunkPlan(file.size)
  const assetName = getFileBaseName(file.name)
  const path = `${uploadPathPrefix}${file.name}`

  let finalResult: {
    assetId?: string
    seedId?: string
    assetName?: string
  } | null = null

  for (const chunkMeta of chunkPlan) {
    const chunk = file.slice(chunkMeta.start, chunkMeta.end)
    const formData = new FormData()
    formData.append('path', path)
    formData.append('size', String(chunk.size))
    formData.append('totalSize', String(file.size))
    formData.append('offset', String(chunkMeta.start))
    formData.append('totalPart', String(chunkMeta.totalPart))
    formData.append('part', String(chunkMeta.part))
    formData.append('lastChunk', String(chunkMeta.lastChunk))
    formData.append('file', chunk, file.name)
    formData.append('assetName', assetName)
    formData.append('folderId', '')

    const response = (await dtpFetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${uploadToken}`
      },
      body: formData,
      prefix: '/__dtp-static'
    })) as {
      result?: {
        assetId?: string
        seedId?: string
        assetName?: string
      }
    }

    uploadProgress.value = ((chunkMeta.end / file.size) * 100) || 100

    if (chunkMeta.lastChunk) {
      finalResult = response?.result || null
    }
  }

  return finalResult
}

const uploadTwinModelDirectly = async (file: File) => {
  const configResponse = (await dtpFetch('/v1/asset/model/upload/config', {
    method: 'GET'
  })) as {
    results?: {
      uploadUrl?: string
      uploadUrlV2?: string
      uploadPathPrefix?: string
      uploadToken?: string
    }
    result?: {
      uploadUrl?: string
      uploadUrlV2?: string
      uploadPathPrefix?: string
      uploadToken?: string
    }
  }

  const config = configResponse.results || configResponse.result
  const uploadUrl = config?.uploadUrlV2 || config?.uploadUrl
  const uploadPathPrefix = config?.uploadPathPrefix
  const uploadToken = config?.uploadToken

  if (!uploadUrl || !uploadPathPrefix || !uploadToken) {
    throw new Error('获取孪生模型上传配置失败')
  }

  const result = await uploadFileChunkToDtp({
    uploadUrl,
    uploadToken,
    uploadPathPrefix,
    file
  })

  if (!result?.assetId || !result?.seedId) {
    throw new Error('孪生模型上传完成，但未返回模型标识')
  }

  // 上传完成后触发模型转换（1.md：POST /v1/asset/model/transform），taskId 用于轮询转换进度
  const modelName = getFileBaseName(file.name)
  const rawFormat = (getFileExtension(file.name) || '未知').toUpperCase()
  const transformResponse = (await dtpFetch('/v1/asset/model/transform', {
    method: 'POST',
    body: {
      assetId: result.assetId,
      assetName: result.assetName || modelName,
      apiVersion: '2.3.0' // apiVersion 暂时固定
    }
  })) as {
    success?: boolean
    code?: number
    msg?: string
    results?: { taskId?: string }
  }

  const taskId = transformResponse?.results?.taskId
  if (taskId) {
    await addConvertingTask(taskId, modelName, rawFormat)
  } else {
    triggerNotification({
      type: ToastNotificationType.Danger,
      title: '模型转换触发失败',
      description: transformResponse?.msg || '未返回转换任务 ID'
    })
  }

  triggerNotification({
    type: ToastNotificationType.Success,
    title: '模型上传成功',
    description: `${file.name} 已同步到孪生模型列表`
  })
}

const uploadTwinModelThroughLightModelFlow = async (file: File) => {
  const rawName = sanitizeModelName(getFileBaseName(file.name))
  const modelName = rawName.length ? rawName : getFileBaseName(file.name)
  const ensured = await ensureModel({
    name: modelName
  })

  addSyncRefreshProjectId(ensured.projectId)

  await uploadModelFile({
    projectId: ensured.projectId,
    modelId: ensured.model.id,
    file,
    onProgress: (percentage) => {
      uploadProgress.value = percentage
    }
  })

  triggerNotification({
    type: ToastNotificationType.Success,
    title: '模型已提交',
    description: `${modelName} 已开始上传和同步`
  })
}

const handleTwinFileUpload = async (file: File) => {
  uploadingTwinModel.value = true
  uploadProgress.value = 0
  const uploadingTaskId = addUploadingTask(file)

  try {
    if (isLightModelFile(file.name)) {
      await uploadTwinModelThroughLightModelFlow(file)
    } else {
      await uploadTwinModelDirectly(file)
    }

    // 上传完成，从「正在上传」列表移除
    // （Direct 流程已在 uploadTwinModelDirectly 内触发转换并加入「正在转换」；LightModel 流程走 speckle 上传，暂不触发 DTP 转换）
    removeUploadingTask(uploadingTaskId)
    await fetchUserModels()
    scheduleRefreshUserModels()
    scheduleRefreshUserModelsBurst()
  } catch (error) {
    removeUploadingTask(uploadingTaskId)
    triggerNotification({
      type: ToastNotificationType.Danger,
      title: '模型上传失败',
      description: ensureError(error).message
    })
  } finally {
    resetUploadPicker()
  }
}

const onUploadFileSelected = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  void handleTwinFileUpload(file)
}

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
    // 状态筛选：'1' 已上架 / '2' 已下架
    let publishedSet: boolean[]
    if (statusFilter.value === '1') {
      publishedSet = [true]
    } else if (statusFilter.value === '2') {
      publishedSet = [false]
    } else {
      publishedSet = [true, false]
    }

    // 构件数据筛选：'1' 有 / '0' 无
    let hierarchySet: boolean[]
    if (componentDataFilter.value === '1') {
      hierarchySet = [true]
    } else if (componentDataFilter.value === '0') {
      hierarchySet = [false]
    } else {
      hierarchySet = [true, false]
    }

    const data = await $dtpFetch('/v1/daas/asset/model/personal/list', {
      method: 'POST',
      body: {
        keyword: searchQuery.value || '',
        publishedSet,
        hierarchySet,
        teamId: teamIds.value,
        pageNumber: currentPage.value,
        pageSize: currentPageSize.value
      }
    })
    
    // 解析用户模型数据
    const responseData = data as any
    if (responseData && responseData.result) {
      const rawList = Array.isArray(responseData.result.data)
        ? responseData.result.data
        : (responseData.result.data?.records || responseData.result.data?.list || [])

      userModelsData.value = rawList.map((item: any) => {
        // 拼接缩略图URL（通过代理避免混合内容问题）
        let thumbnailUrl = ''
        if (item.thumbnails && Array.isArray(item.thumbnails) && item.thumbnails.length > 0 && item.thumbnails[0].uri) {
          thumbnailUrl = '/__dtp-static' + item.thumbnails[0].uri
        }

        return {
          id: String(item.id),
          assetId: item.assetId || '',
          name: item.assetName || '',
          seedId: item.seedId || '',
          system: item.platform || '',
          productType: item.stageProduct || '',
          originalFormat: item.originalAssetExt || '',
          assetSize: formatFileSize(item.size || 0),
          componentData: item.isHierarchy ? '有' : '无',
          generationTime: item.publishedAt || '',
          status: item.published ? '已上架' : '已下架',
          published: !!item.published,
          thumbnailUrl
        }
      })

      // 更新总记录数
      userTotalRecords.value = responseData.result.total || userModelsData.value.length
    } else {
      userModelsData.value = []
      userTotalRecords.value = 0
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
          // 拼接缩略图URL（使用相对路径通过代理，避免混合内容问题）
          let thumbnailUrl = ''
          if (item.thumbnails && Array.isArray(item.thumbnails) && item.thumbnails.length > 0 && item.thumbnails[0].uri) {
            thumbnailUrl = '/__dtp-static' + item.thumbnails[0].uri
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
  assetId: string
  name: string
  seedId: string
  system: string
  productType: string
  originalFormat: string
  assetSize: string
  componentData: string
  generationTime: string
  status: string
  published: boolean
  thumbnailUrl: string
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

// 根据当前 Popover 目标动态计算提示文案
// - 状态为已上架 → 点击下架
// - 状态为已下架 → 点击上架
const popoverConfirmText = computed(() => {
  const targetId = offshelfPopoverTarget.value
  if (!targetId || targetId === 'batch') return '确定下架？'
  const model = userModelsData.value.find((m: any) => String(m.id) === targetId)
  return model && model.published === false ? '确定上架？' : '确定下架？'
})

const confirmOffshelf = async () => {
  const targetId = offshelfPopoverTarget.value
  hideOffshelfPopover()
  if (!targetId || targetId === 'batch') return

  // 用户模型行上下架：与官方模型一致，调用 /v1/daas/asset/publish
  const model = userModelsData.value.find((m: any) => String(m.id) === targetId)
  if (!model || !model.assetId) return

  // 已下架 -> 上架（published:true），已上架 -> 下架（published:false）
  const nextPublished = model.published === false

  try {
    await $dtpFetch('/v1/daas/asset/publish', {
      method: 'PUT',
      body: {
        assetId: model.assetId,
        published: nextPublished
      }
    })
    await fetchUserModels()
  } catch (error) {
    console.error(nextPublished ? '上架失败:' : '下架失败:', error)
  }
}

// ---------- 用户模型编辑 Modal ----------
const editModalVisible = ref(false)
const editForm = reactive({
  assetId: '',
  name: '',
  thumbnailUrl: ''
})
const editLoading = ref(false)
const editNameError = ref('')
const lightboxVisible = ref(false)

const openEditModal = (model: UserModel) => {
  editForm.assetId = model.assetId
  editForm.name = model.name
  editForm.thumbnailUrl = model.thumbnailUrl || ''
  editNameError.value = ''
  // 复显已有缩略图
  thumbnailPreview.value = model.thumbnailUrl || ''
  editModalVisible.value = true
}
const closeEditModal = () => {
  editModalVisible.value = false
}
const handleEditConfirm = async () => {
  if (!editForm.name.trim()) {
    editNameError.value = '请输入名称'
    return
  }
  editLoading.value = true
  try {
    await $dtpFetch('/v1/daas/asset/model/update', {
      method: 'PUT',
      body: {
        assetId: editForm.assetId,
        assetName: editForm.name,
        thumbnails: editForm.thumbnailUrl ? [{ uri: editForm.thumbnailUrl }] : []
      }
    })
    closeEditModal()
    await fetchUserModels()
  } catch (error) {
    console.error('编辑用户模型失败:', error)
  } finally {
    editLoading.value = false
  }
}

const thumbnailInput = ref<HTMLInputElement | null>(null)
const thumbnailPreview = ref<string>('')
const onThumbnailChange = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  // 先本地预览
  const reader = new FileReader()
  reader.onload = (ev) => {
    thumbnailPreview.value = ev.target?.result as string
  }
  reader.readAsDataURL(file)

  // 上传缩略图获取URL
  try {
    const formData = new FormData()
    formData.append('file', file)
    const result = await $dtpFetch('/v1/daas/thumbnail/upload', {
      method: 'POST',
      body: formData
    })
    const responseData = result as any
    if (responseData && responseData.result && responseData.result.url) {
      editForm.thumbnailUrl = responseData.result.url
    }
  } catch (error) {
    console.error('缩略图上传失败:', error)
  }
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
let handleClickOutside: ((e: MouseEvent) => void) | null = null

onMounted(async () => {
  handleClickOutside = (e: MouseEvent) => {
    officialCategoryDropdownOpen.value = false
    openFilterDropdown.value = null
    
    // 页大小下拉框
    if (
      pageSizeSelectRef.value &&
      !pageSizeSelectRef.value.contains(e.target as Node)
    ) {
      pageSizeDropdownOpen.value = false
    }
  }
  
  document.addEventListener('click', handleClickOutside)
  
  // 先获取团队列表
  await fetchTeamList()
  
  // 组件挂载时自动加载用户模型数据
  await fetchUserModels()
})

onUnmounted(() => {
  if (handleClickOutside) {
    document.removeEventListener('click', handleClickOutside)
  }
  if (refreshUserModelsTimer) {
    clearTimeout(refreshUserModelsTimer)
  }
  refreshUserModelsBurstTimers.forEach((timer) => clearTimeout(timer))
  // 清理转换任务轮询定时器
  convertingPollTimers.forEach((timer) => clearInterval(timer))
  convertingPollTimers.clear()
})

const activeTab = ref<'user' | 'official'>('user')
const searchQuery = ref('')
// 用户模型筛选
const statusFilter = ref('')
const componentDataFilter = ref('')
// 官方模型筛选
const publishStatusFilter = ref('')
const categoryFilter = ref('')

// 筛选下拉框开关（同一时间最多开一个）
type FilterDropdownKey = 'status' | 'component' | 'publish' | 'category' | null
const openFilterDropdown = ref<FilterDropdownKey>(null)
const toggleFilterDropdown = (key: Exclude<FilterDropdownKey, null>) => {
  openFilterDropdown.value = openFilterDropdown.value === key ? null : key
}

// 筛选项定义
const statusFilterOptions = [
  { value: '', label: '全部' },
  { value: '1', label: '已上架' },
  { value: '2', label: '已下架' }
]
const componentDataFilterOptions = [
  { value: '', label: '全部' },
  { value: '1', label: '有' },
  { value: '0', label: '无' }
]
const publishStatusFilterOptions = [
  { value: '', label: '全部' },
  { value: '已上架', label: '已上架' },
  { value: '已下架', label: '已下架' }
]

// 下拉框显示文案
const statusFilterLabel = computed(
  () => statusFilterOptions.find((o) => o.value === statusFilter.value)?.label || '请选择'
)
const componentDataFilterLabel = computed(
  () => componentDataFilterOptions.find((o) => o.value === componentDataFilter.value)?.label || '请选择'
)
const publishStatusFilterLabel = computed(
  () => publishStatusFilterOptions.find((o) => o.value === publishStatusFilter.value)?.label || '请选择状态'
)

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

// 页大小下拉框
const pageSizeOptions = [20, 50, 100]
const pageSizeDropdownOpen = ref(false)
const pageSizeSelectRef = ref<HTMLElement | null>(null)
const selectPageSize = async (size: number) => {
  pageSizeDropdownOpen.value = false
  if (currentPageSize.value === size) return
  currentPageSize.value = size
  await onPageSizeChange()
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

/* 筛选下拉展开/收起过渡（与 LightModel 保持一致） */
.fade-down-enter-active,
.fade-down-leave-active {
  transition: all 0.2s ease;
}
.fade-down-enter-from,
.fade-down-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* 上传 loading 点阵：每点循环「淡色小号 → 深色大号 → 淡色小号」，
   渐变窗口占半周期（约 4 个点同时在变化），相位依次错开 3s/8，
   形成顺时针扫过的「亮波」，旋转感更明显 */
.twin-dot {
  animation: twin-dot-pulse 3s linear infinite;
}
@keyframes twin-dot-pulse {
  0%,
  25% {
    opacity: 0.35;
    r: 1.4px;
  }
  50% {
    opacity: 1;
    r: 2.3px;
  }
  75%,
  100% {
    opacity: 0.35;
    r: 1.4px;
  }
}
</style>
