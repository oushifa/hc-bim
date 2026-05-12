<template>
  <div class="fixed inset-0 z-50 flex bg-white/80 backdrop-blur-md font-sans">
    <!-- Leftmost Thin Sidebar -->
    <div
      class="w-14 border-r border-gray-200 flex flex-col py-4 bg-white/80 backdrop-blur-md shrink-0 z-20"
    >
      <div class="flex flex-col space-y-1 flex-1 px-2">
        <button
          :class="[
            'w-full flex justify-center items-center h-[54px] rounded-[8px] transition-colors',
            activeTab === 'model'
              ? 'bg-primary/10 text-primary'
              : 'text-gray-500 hover:bg-[#f5f7fa] hover:text-primary'
          ]"
          @click="activeTab = 'model'"
          title="模型构件属性查看"
        >
          <CubeIcon class="w-5 h-5" />
        </button>
        <button
          :class="[
            'w-full flex justify-center items-center h-[54px] rounded-[8px] transition-colors',
            activeTab === 'filter'
              ? 'bg-primary/10 text-primary'
              : 'text-gray-500 hover:bg-[#f5f7fa] hover:text-primary'
          ]"
          @click="activeTab = 'filter'"
          title="属性筛选"
        >
          <AdjustmentsHorizontalIcon class="w-5 h-5" />
        </button>
        <button
          :class="[
            'w-full flex justify-center items-center h-[54px] rounded-[8px] transition-colors',
            activeTab === 'comment'
              ? 'bg-primary/10 text-primary'
              : 'text-gray-500 hover:bg-[#f5f7fa] hover:text-primary'
          ]"
          @click="activeTab = 'comment'"
          title="评论添加"
        >
          <ChatBubbleLeftRightIcon class="w-5 h-5" />
        </button>
        <button
          :class="[
            'w-full flex justify-center items-center h-[54px] rounded-[8px] transition-colors',
            activeTab === 'directory'
              ? 'bg-primary/10 text-primary'
              : 'text-gray-500 hover:bg-[#f5f7fa] hover:text-primary'
          ]"
          @click="activeTab = 'directory'"
          title="目录组织"
        >
          <FolderIcon class="w-5 h-5" />
        </button>
        <button
          :class="[
            'w-full flex justify-center items-center h-[54px] rounded-[8px] transition-colors',
            activeTab === 'perspective'
              ? 'bg-primary/10 text-primary'
              : 'text-gray-500 hover:bg-[#f5f7fa] hover:text-primary'
          ]"
          @click="activeTab = 'perspective'"
          title="视角管理"
        >
          <CameraIcon class="w-5 h-5" />
        </button>
        <button
          :class="[
            'w-full flex justify-center items-center h-[54px] rounded-[8px] transition-colors',
            activeTab === 'compare'
              ? 'bg-primary/10 text-primary'
              : 'text-gray-500 hover:bg-[#f5f7fa] hover:text-primary'
          ]"
          @click="activeTab = 'compare'"
          title="二三维对比"
        >
          <ComputerDesktopIcon class="w-5 h-5" />
        </button>
      </div>
    </div>

    <!-- Dynamic Left Panel based on activeTab -->
    <div
      v-if="activeTab === 'model'"
      class="w-64 border-r border-gray-200 bg-white/80 backdrop-blur-md flex flex-col shrink-0 z-10"
    >
      <div class="h-12 border-b border-gray-200 flex items-center justify-between px-4">
        <span class="font-medium text-gray-800">模型</span>
        <div class="flex space-x-2 text-gray-500">
          <button class="hover:text-primary"><ClockIcon class="w-4 h-4" /></button>
          <button class="hover:text-primary"><PlusIcon class="w-4 h-4" /></button>
        </div>
      </div>
      <div class="flex-1 overflow-y-auto p-2 text-sm">
        <div class="flex items-center space-x-1 py-1 cursor-pointer hover:bg-gray-50">
          <ChevronDownIcon class="w-4 h-4 text-gray-400" />
          <CubeIcon class="w-4 h-4 text-yellow-500" />
          <div class="flex flex-col overflow-hidden">
            <span class="truncate">{{ model.title }}</span>
            <span class="text-xs text-gray-400">最新版本 revit · 4天前</span>
          </div>
        </div>
        <div class="pl-5">
          <div class="flex items-center space-x-1 py-1 cursor-pointer hover:bg-gray-50">
            <ChevronDownIcon class="w-4 h-4 text-gray-400" />
            <div class="flex flex-col">
              <span class="truncate">{{ model.title }}</span>
              <span class="text-xs text-gray-400">Collection</span>
            </div>
          </div>
          <div class="pl-5">
            <div
              class="flex items-center space-x-1 py-1 cursor-pointer hover:bg-gray-50"
            >
              <ChevronDownIcon class="w-4 h-4 text-gray-400" />
              <div class="flex flex-col">
                <span class="truncate">常规模型</span>
                <span class="text-xs text-gray-400">Collection</span>
              </div>
            </div>
            <div class="pl-5">
              <div
                class="flex items-center space-x-1 py-1 cursor-pointer bg-gray-100 rounded"
              >
                <ChevronRightIcon class="w-4 h-4 text-transparent" />
                <div class="flex flex-col">
                  <span class="truncate">RevitObject</span>
                  <span class="text-xs text-gray-400">常规模型 / SK_①1-1</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="activeTab === 'filter'"
      class="w-64 border-r border-gray-200 bg-white/80 backdrop-blur-md flex flex-col shrink-0 relative z-10"
    >
      <div class="h-12 border-b border-gray-200 flex items-center justify-between px-4">
        <span class="font-medium text-gray-800">筛选器</span>
        <button class="text-gray-500 hover:text-gray-700">
          <XMarkIcon class="w-4 h-4" />
        </button>
      </div>
      <div class="flex-1 flex flex-col items-center justify-center p-4">
        <div
          class="w-24 h-24 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center mb-4"
        >
          <AdjustmentsHorizontalIcon class="w-8 h-8 text-gray-300" />
        </div>
        <p class="text-gray-500 mb-4">暂无筛选器</p>
        <button
          class="px-4 py-2 bg-gray-100 text-gray-700 rounded-[8px] hover:bg-gray-200 transition-colors text-sm"
        >
          添加筛选器
        </button>
      </div>

      <!-- Floating Filter Menu -->
      <div
        class="absolute left-full top-0 ml-2 w-64 bg-white/80 backdrop-blur-md shadow-xl rounded-lg border border-gray-200 flex flex-col max-h-full"
        style="height: calc(100vh - 80px); margin-top: 60px"
      >
        <div class="p-2 border-b border-gray-100">
          <div class="relative">
            <MagnifyingGlassIcon
              class="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            />
            <input
              type="text"
              placeholder="搜索属性..."
              class="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:border-primary"
            />
          </div>
        </div>
        <div class="flex-1 overflow-y-auto p-2">
          <div class="text-xs text-gray-500 font-medium mb-2 px-2">常用属性</div>
          <div class="space-y-1">
            <div
              v-for="attr in ['名称', '类别', '族', '类型', '标高']"
              :key="attr"
              class="flex items-center px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer text-sm"
            >
              <span
                class="text-[10px] text-purple-500 font-mono mr-2 bg-purple-50 px-1 rounded border border-purple-100"
              >
                AB
              </span>
              {{ attr }}
            </div>
          </div>
          <div class="text-xs text-gray-500 font-medium mt-4 mb-2 px-2">
            所有属性 (71)
          </div>
          <div class="space-y-1">
            <div
              v-for="attr in [
                '应用程序ID',
                '类别',
                '族',
                'id',
                '标高',
                '名称',
                '对象',
                '数智南北类型'
              ]"
              :key="attr"
              class="flex items-center px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer text-sm"
            >
              <span
                class="text-[10px] text-purple-500 font-mono mr-2 bg-purple-50 px-1 rounded border border-purple-100"
              >
                AB
              </span>
              {{ attr }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="activeTab === 'comment'"
      class="w-64 border-r border-gray-200 bg-white/80 backdrop-blur-md flex flex-col shrink-0 z-10"
    >
      <div class="h-12 border-b border-gray-200 flex items-center justify-between px-4">
        <span class="font-medium text-gray-800">模型标注</span>
        <button class="text-gray-500 hover:text-gray-700">
          <AdjustmentsHorizontalIcon class="w-4 h-4" />
        </button>
      </div>
      <div class="flex-1 overflow-y-auto p-2">
        <div class="bg-gray-100 rounded-lg p-3 cursor-pointer border border-gray-200">
          <div class="flex items-center justify-between mb-1">
            <div class="flex items-center space-x-2">
              <div
                class="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs"
              >
                T
              </div>
              <span class="text-sm font-medium">test</span>
              <span class="text-xs text-gray-500">4天前</span>
            </div>
            <CheckCircleIcon class="w-4 h-4 text-blue-500" />
          </div>
          <div class="text-sm text-gray-700 mb-2">test</div>
          <div class="text-xs text-gray-500">0个回复</div>
        </div>
      </div>
    </div>

    <div
      v-if="activeTab === 'directory'"
      class="w-80 border-r border-gray-200 bg-white/80 backdrop-blur-md flex flex-col shrink-0 shadow-lg z-10"
    >
      <div class="h-12 border-b border-gray-200 flex items-center px-4">
        <span class="font-medium text-gray-800">目录组织</span>
      </div>
      <div class="flex-1 flex flex-col">
        <!-- Top half: Custom Directories -->
        <div
          :class="[
            showComponentTree ? 'h-1/2' : 'flex-1',
            'border-b border-gray-200 flex flex-col transition-all duration-300'
          ]"
        >
          <div class="flex border-b border-gray-100 bg-gray-50">
            <button
              class="px-4 py-2 text-sm font-medium text-primary border-b-2 border-primary bg-white/80 backdrop-blur-md"
            >
              目录1
            </button>
            <button
              class="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              目录2
            </button>
            <button class="px-2 py-2 text-gray-400 hover:text-primary">
              <PlusIcon class="w-4 h-4" />
            </button>
          </div>
          <div class="p-2 flex justify-between items-center border-b border-gray-100">
            <span class="text-xs text-gray-500">自定义层级</span>
            <button
              class="text-xs text-primary flex items-center hover:bg-primary/10 px-2 py-1 rounded"
            >
              <PlusIcon class="w-3 h-3 mr-1" />
              新建节点
            </button>
          </div>
          <div class="flex-1 overflow-y-auto p-2 text-sm">
            <div
              class="flex items-center space-x-1 py-1 cursor-pointer hover:bg-gray-50"
              @click="showComponentTree = !showComponentTree"
            >
              <ChevronDownIcon class="w-4 h-4 text-gray-400" />
              <FolderIcon class="w-4 h-4 text-blue-400" />
              <span>根节点</span>
            </div>
            <div class="pl-5">
              <div
                class="flex items-center space-x-1 py-1 cursor-pointer hover:bg-gray-50"
                @click="showComponentTree = !showComponentTree"
              >
                <ChevronRightIcon class="w-4 h-4 text-gray-400" />
                <FolderIcon class="w-4 h-4 text-blue-400" />
                <span>子节点 1</span>
              </div>
            </div>
          </div>
        </div>
        <!-- Bottom half: Model Structure -->
        <div v-if="showComponentTree" class="h-1/2 flex flex-col">
          <div
            class="p-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between"
          >
            <span class="text-xs font-medium text-gray-600">模型构件结构树</span>
            <button
              class="text-xs text-primary flex items-center hover:bg-primary/10 px-2 py-1 rounded"
            >
              <DocumentIcon class="w-3 h-3 mr-1" />
              保存视角
            </button>
          </div>
          <div class="flex-1 overflow-y-auto p-2 text-sm">
            <div
              class="flex items-center space-x-1 py-1 cursor-pointer hover:bg-gray-50"
            >
              <ChevronDownIcon class="w-4 h-4 text-gray-400" />
              <CubeIcon class="w-4 h-4 text-yellow-500" />
              <span class="truncate">{{ model.title }}</span>
            </div>
            <div class="pl-5">
              <div
                class="flex items-center space-x-1 py-1 cursor-pointer hover:bg-gray-50"
              >
                <ChevronRightIcon class="w-4 h-4 text-gray-400" />
                <span class="truncate text-gray-600">Collection</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="activeTab === 'perspective'"
      class="w-80 border-r border-gray-200 bg-white/80 backdrop-blur-md flex flex-col shrink-0 shadow-lg z-10"
    >
      <div class="h-12 border-b border-gray-200 flex items-center justify-between px-4">
        <span class="font-medium text-gray-800">视角管理</span>
        <button
          class="text-sm text-primary flex items-center hover:bg-primary/10 px-2 py-1 rounded transition-colors"
        >
          <PlusIcon class="w-4 h-4 mr-1" />
          添加视图
        </button>
      </div>
      <div class="flex-1 overflow-y-auto p-4 space-y-4">
        <div
          class="border border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:border-primary transition-colors group"
        >
          <div class="aspect-video bg-gray-100 relative">
            <div
              class="absolute inset-0 flex items-center justify-center text-gray-400"
            >
              <PhotoIcon class="w-8 h-8 opacity-50" />
            </div>
            <div
              class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"
            />
          </div>
          <div
            class="p-2 text-sm font-medium text-gray-700 text-center bg-gray-50 border-t border-gray-200"
          >
            主视角 1
          </div>
        </div>
        <div
          class="border border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:border-primary transition-colors group"
        >
          <div class="aspect-video bg-gray-100 relative">
            <div
              class="absolute inset-0 flex items-center justify-center text-gray-400"
            >
              <PhotoIcon class="w-8 h-8 opacity-50" />
            </div>
            <div
              class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"
            />
          </div>
          <div
            class="p-2 text-sm font-medium text-gray-700 text-center bg-gray-50 border-t border-gray-200"
          >
            局部特写
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="activeTab === 'compare'"
      class="w-80 border-r border-gray-200 bg-white/80 backdrop-blur-md flex flex-col shrink-0 shadow-lg z-10"
    >
      <div class="h-12 border-b border-gray-200 flex items-center justify-between px-4">
        <span class="font-medium text-gray-800">二三维对比配置</span>
        <button
          class="text-sm text-white bg-[#00b4b6] hover:bg-[#009fa1] px-3 py-1.5 rounded flex items-center transition-colors"
        >
          <DocumentIcon class="w-4 h-4 mr-1" />
          保存当前
        </button>
      </div>
      <div class="flex-1 overflow-y-auto p-4 space-y-3">
        <div
          class="p-3 border border-gray-200 rounded-lg hover:border-primary cursor-pointer transition-colors group"
        >
          <div
            class="text-sm font-medium text-gray-800 mb-1 group-hover:text-primary"
          >
            一层平面图对比
          </div>
          <div class="text-xs text-gray-500">包含剖切盒设置</div>
        </div>
        <div
          class="p-3 border border-gray-200 rounded-lg hover:border-primary cursor-pointer transition-colors group"
        >
          <div
            class="text-sm font-medium text-gray-800 mb-1 group-hover:text-primary"
          >
            机电管线对比
          </div>
          <div class="text-xs text-gray-500">已保存视角</div>
        </div>
      </div>
    </div>

    <!-- Main Area -->
    <div
      class="flex-1 bg-[#f8f9fa] relative flex items-center justify-center overflow-hidden"
    >
      <!-- Back Button -->
      <button
        @click="goBack"
        class="absolute top-4 left-4 z-20 flex items-center space-x-1 text-black bg-white hover:bg-gray-100 px-3 py-1.5 rounded-[8px] text-sm font-medium transition-colors shadow-sm"
        title="返回"
      >
        <ArrowLeftIcon class="w-4 h-4" />
        <span>返回</span>
      </button>

      <div v-if="activeTab === 'compare'" class="absolute inset-0 flex">
        <!-- Left Window: 2D Drawing -->
        <div class="flex-1 border-r border-gray-300 bg-gray-50 flex flex-col relative">
          <div
            class="absolute top-14 left-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded shadow-sm text-sm font-medium z-10"
          >
            二维图纸
          </div>
          <div class="flex-1 flex items-center justify-center">
            <div class="text-center">
              <PhotoIcon class="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <button
                class="px-4 py-2 bg-white/80 backdrop-blur-md border border-gray-200 rounded shadow-sm text-sm hover:bg-gray-50 text-gray-600"
              >
                选择二维图纸
              </button>
            </div>
          </div>
        </div>
        <!-- Right Window: 3D Top View -->
        <div class="flex-1 bg-[#f8f9fa] flex flex-col relative">
          <div
            class="absolute top-14 left-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded shadow-sm text-sm font-medium z-10"
          >
            三维顶层视角 (支持剖切)
          </div>
          <div class="flex-1 flex items-center justify-center relative">
            <div class="text-gray-500">3D View Placeholder</div>
          </div>
        </div>
      </div>
      <div v-else class="w-full h-full relative">
        <div class="w-full h-full flex items-center justify-center bg-[#f8f9fa]">
          <div class="text-gray-500">3D Viewer Placeholder - {{ model.title }}</div>
        </div>

        <!-- Floating Comment Box if comment tab is active -->
        <div
          v-if="activeTab === 'comment'"
          class="absolute top-1/3 left-1/2 bg-white/80 backdrop-blur-md rounded-lg shadow-xl border border-gray-200 w-80 z-20"
        >
          <div class="flex items-center justify-between p-2 border-b border-gray-100">
            <div class="flex space-x-1">
              <button class="p-1 hover:bg-gray-100 rounded text-gray-500">
                <ChevronRightIcon class="w-4 h-4 rotate-180" />
              </button>
              <button class="p-1 hover:bg-gray-100 rounded text-gray-500">
                <ChevronRightIcon class="w-4 h-4" />
              </button>
            </div>
            <div class="flex space-x-1">
              <button class="p-1 hover:bg-gray-100 rounded text-gray-500">
                <EllipsisHorizontalIcon class="w-4 h-4" />
              </button>
              <button class="p-1 hover:bg-gray-100 rounded text-gray-500">
                <CheckCircleIcon class="w-4 h-4" />
              </button>
              <button class="p-1 hover:bg-gray-100 rounded text-gray-500">
                <XMarkIcon class="w-4 h-4" />
              </button>
            </div>
          </div>
          <div class="p-3">
            <div class="flex items-center space-x-2 mb-2">
              <div
                class="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs"
              >
                T
              </div>
              <span class="text-sm font-medium">test</span>
              <span class="text-xs text-gray-500">4天前</span>
            </div>
            <div class="text-sm text-gray-700 mb-4">test</div>

            <div
              class="border border-gray-200 rounded-lg overflow-hidden focus-within:border-blue-500"
            >
              <textarea
                placeholder="新增回复"
                class="w-full p-2 text-sm focus:outline-none resize-none"
                rows="2"
              />
              <div
                class="flex items-center justify-between p-2 bg-gray-50 border-t border-gray-200"
              >
                <button class="text-gray-500 hover:text-gray-700">
                  <PaperClipIcon class="w-4 h-4" />
                </button>
                <button class="bg-blue-500 text-white p-1.5 rounded hover:bg-blue-600">
                  <PaperAirplaneIcon class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Top Right Controls -->
      <div class="absolute top-4 right-4 flex flex-col space-y-2 z-10">
        <button
          class="w-8 h-8 bg-white/80 backdrop-blur-md rounded shadow flex items-center justify-center text-gray-600 hover:text-primary"
        >
          <ArrowsPointingOutIcon class="w-4 h-4" />
        </button>
        <button
          class="w-8 h-8 bg-white/80 backdrop-blur-md rounded shadow flex items-center justify-center text-gray-600 hover:text-primary"
        >
          <VideoCameraIcon class="w-4 h-4" />
        </button>
      </div>

      <!-- Bottom Toolbar -->
      <div
        class="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-md rounded-lg shadow-lg px-4 py-2 flex items-center space-x-6 z-10"
      >
        <button class="text-gray-600 hover:text-primary flex flex-col items-center">
          <Square3Stack3DIcon class="w-5 h-5" />
        </button>
        <button class="text-gray-600 hover:text-primary flex flex-col items-center">
          <EyeDropperIcon class="w-5 h-5" />
        </button>
        <button class="text-gray-600 hover:text-primary flex flex-col items-center">
          <SunIcon class="w-5 h-5" />
        </button>
      </div>
    </div>

    <!-- Right Panels based on activeTab -->
    <div
      v-if="activeTab === 'model'"
      class="w-80 border-l border-gray-200 bg-white/80 backdrop-blur-md flex flex-col shrink-0 shadow-lg z-20"
    >
      <div class="h-12 border-b border-gray-200 flex items-center justify-between px-4">
        <span class="font-medium text-gray-800">已选择</span>
        <div class="flex space-x-3 text-gray-500">
          <button class="hover:text-primary"><EyeIcon class="w-4 h-4" /></button>
          <button class="hover:text-primary">
            <AdjustmentsHorizontalIcon class="w-4 h-4" />
          </button>
          <button class="hover:text-primary">
            <EllipsisHorizontalIcon class="w-4 h-4" />
          </button>
        </div>
      </div>
      <div class="flex-1 overflow-y-auto text-sm">
        <div class="border-b border-gray-100">
          <div
            class="flex items-center px-4 py-2 bg-gray-50 cursor-pointer font-medium text-gray-800"
          >
            <ChevronDownIcon class="w-4 h-4 mr-1 text-gray-500" />
            Revit对象
          </div>
          <div class="px-4 py-3 space-y-3">
            <div class="flex">
              <span class="w-24 text-gray-500">id</span>
              <span class="flex-1 truncate text-gray-800">
                c06ef4701d7c1ed02d981c...
              </span>
            </div>
            <div class="flex">
              <span class="w-24 text-gray-500">名称</span>
              <span class="flex-1 text-gray-800">常规模型 - SK_①1-1</span>
            </div>
            <div class="flex">
              <span class="w-24 text-gray-500">类型</span>
              <span class="flex-1 text-gray-800">SK_①1-1</span>
            </div>
            <div class="flex">
              <span class="w-24 text-gray-500">单位</span>
              <span class="flex-1 text-gray-800">mm</span>
            </div>
            <div class="flex">
              <span class="w-24 text-gray-500">族</span>
              <span class="flex-1 text-gray-800">SK_①1-1</span>
            </div>
            <div class="flex">
              <span class="w-24 text-gray-500">类别</span>
              <span class="flex-1 text-gray-800">常规模型</span>
            </div>
            <div class="flex">
              <span class="w-24 text-gray-500">数智南北类型</span>
              <span class="flex-1 text-gray-800 truncate">
                Objects.Data.DataObject...
              </span>
            </div>
            <div class="flex">
              <span class="w-24 text-gray-500">应用程序ID</span>
              <span class="flex-1 text-gray-800 truncate">
                2fccc05b-8cc8-4b1f-a91f...
              </span>
            </div>
            <div class="flex">
              <span class="w-24 text-gray-500">标高</span>
              <span class="flex-1 text-gray-800">null</span>
            </div>
          </div>
        </div>
        <div class="border-b border-gray-100">
          <div
            class="flex items-center px-4 py-2 bg-gray-50 cursor-pointer font-medium text-gray-800"
          >
            <ChevronRightIcon class="w-4 h-4 mr-1 text-gray-500" />
            位置
          </div>
        </div>
        <div class="border-b border-gray-100">
          <div
            class="flex items-center px-4 py-2 bg-gray-50 cursor-pointer font-medium text-gray-800"
          >
            <ChevronDownIcon class="w-4 h-4 mr-1 text-gray-500" />
            属性
          </div>
          <div class="px-4 py-3 space-y-3">
            <div v-for="(attr, index) in customAttributes" :key="index" class="flex">
              <span class="w-24 text-gray-500">{{ attr.name }}</span>
              <span class="flex-1 text-gray-800">{{ attr.value }}</span>
            </div>
          </div>
          <div class="px-4 py-3 bg-gray-50 border-t border-gray-100 space-y-2">
            <div class="text-xs font-medium text-gray-600 mb-1">添加自定义属性</div>
            <input
              type="text"
              placeholder="属性名"
              class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-primary"
              v-model="newAttrName"
            />
            <input
              type="text"
              placeholder="属性值"
              class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-primary"
              v-model="newAttrValue"
            />
            <button
              class="w-full py-1.5 bg-[#00b4b6] text-white text-xs rounded hover:bg-[#009fa1] transition-colors"
              @click="handleAddAttribute"
            >
              添加
            </button>
          </div>
        </div>
        <div class="border-b border-gray-100">
          <div
            class="flex items-center px-4 py-2 bg-gray-50 cursor-pointer font-medium text-gray-800"
          >
            <ChevronRightIcon class="w-4 h-4 mr-1 text-gray-500" />
            材料数量
          </div>
        </div>
        <div class="border-b border-gray-100">
          <div
            class="flex items-center px-4 py-2 bg-gray-50 cursor-pointer font-medium text-gray-800"
          >
            <ChevronRightIcon class="w-4 h-4 mr-1 text-gray-500" />
            参数
          </div>
        </div>
        <div class="px-4 py-3 flex justify-between items-center">
          <span class="text-gray-800">元素</span>
          <span class="text-gray-500">(0)</span>
        </div>
      </div>
      <div class="p-2 border-t border-gray-200 text-xs text-gray-500 bg-gray-50">
        按住 "shift" 键可选择多个对象
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  CubeIcon,
  AdjustmentsHorizontalIcon,
  ChatBubbleLeftRightIcon,
  FolderIcon,
  CameraIcon,
  ComputerDesktopIcon,
  ClockIcon,
  PlusIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  DocumentIcon,
  PhotoIcon,
  ArrowLeftIcon,
  EllipsisHorizontalIcon,
  PaperClipIcon,
  PaperAirplaneIcon,
  ArrowsPointingOutIcon,
  VideoCameraIcon,
  Square3Stack3DIcon,
  ScissorsIcon,
  EyeDropperIcon,
  SunIcon,
  EyeIcon
} from '@heroicons/vue/24/outline'

interface Model {
  id: string
  title: string
  updateTime: string
  comments: number
  versions: number
  status?: string
  hasModel?: boolean
}

const props = defineProps<{
  model: Model
}>()

const emit = defineEmits<{
  close: []
}>()

const activeTab = ref('model')
const showComponentTree = ref(true)
const customAttributes = ref([
  { name: '元素ID', value: '413817' },
  { name: '工作集ID', value: '0' },
  { name: '工作集名称', value: 'Project Standards' },
  { name: '内建类别', value: 'OST_GenericModel' }
])
const newAttrName = ref('')
const newAttrValue = ref('')

const handleAddAttribute = () => {
  if (newAttrName.value && newAttrValue.value) {
    customAttributes.value.push({ name: newAttrName.value, value: newAttrValue.value })
    newAttrName.value = ''
    newAttrValue.value = ''
  }
}

const goBack = () => {
  emit('close')
}
</script>
