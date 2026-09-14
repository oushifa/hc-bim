<template>
  <div class="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col">
    <!-- 全局独立管理顶栏 (无 Layout 时的专用顶栏) -->
    <header
      class="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm"
    >
      <div
        class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4"
      >
        <div class="flex items-center gap-3">
          <NuxtLink
            to="/projects"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <ArrowLeftIcon class="size-3.5" />
            返回工作台
          </NuxtLink>
          <div class="h-4 w-px bg-slate-200"></div>
          <div class="flex items-center gap-2">
            <h1 class="text-base font-bold text-slate-900 tracking-tight">
              模型转换调度中心
            </h1>
            <span
              class="inline-flex items-center rounded-full bg-cyan-50 px-2.5 py-0.5 text-xs font-semibold text-[#00b4b6] border border-[#00b4b6]/20"
            >
              超级管理员
            </span>
          </div>
        </div>

        <!-- 右侧控制区 -->
        <div class="flex items-center gap-4">
          <label
            class="inline-flex items-center gap-2 cursor-pointer text-sm text-slate-600 select-none"
          >
            <input v-model="autoRefresh" type="checkbox" class="sr-only peer" />
            <div
              class="relative w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#00b4b6]"
            ></div>
            <span class="text-xs font-medium text-slate-600">自动刷新 (3s)</span>
          </label>

          <button
            type="button"
            :disabled="loading"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-50"
            @click="handleRefresh"
          >
            <ArrowPathIcon
              class="size-3.5 text-slate-500"
              :class="{ 'animate-spin': loading }"
            />
            刷新
          </button>
        </div>
      </div>
    </header>

    <!-- 页面主体容器 -->
    <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <!-- 转换节点 (Worker) 监控区域 -->
      <div class="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2.5 flex-wrap">
            <div class="p-1.5 rounded-lg bg-cyan-50 text-[#00b4b6]">
              <CpuChipIcon class="size-5" />
            </div>
            <h2 class="text-base font-semibold text-slate-900">
              已注册转换节点 (Worker)
            </h2>
            <span
              class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold"
              :class="[
                workers.length > 0
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                  : 'bg-amber-50 text-amber-700 border border-amber-200/60'
              ]"
            >
              <span
                class="size-2 rounded-full"
                :class="[
                  workers.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                ]"
              ></span>
              {{ workers.length > 0 ? `${workers.length} 个节点在线` : '暂无节点在线' }}
            </span>
          </div>

          <!-- 右侧折叠控制 -->
          <div class="flex items-center gap-3">
            <span class="text-xs text-slate-400 hidden sm:inline">
              负责执行 Revit (RVT) 等模型的后台转换任务
            </span>
            <button
              type="button"
              class="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-50"
              @click="isWorkersCollapsed = !isWorkersCollapsed"
            >
              <span>{{ isWorkersCollapsed ? '展开详情' : '收起' }}</span>
              <ChevronDownIcon
                class="size-3.5 transition-transform duration-200"
                :class="{ 'rotate-180': !isWorkersCollapsed }"
              />
            </button>
          </div>
        </div>

        <!-- 折叠主体 -->
        <div v-show="!isWorkersCollapsed" class="space-y-4">
          <!-- 无 Worker 警告 -->
          <div
            v-if="workers.length === 0"
            class="flex items-start gap-3 p-4 rounded-lg bg-amber-50/70 border border-amber-200/60 text-amber-800 text-xs leading-relaxed"
          >
            <ExclamationTriangleIcon class="size-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p class="font-medium">当前暂无已注册的转换 Worker</p>
              <p class="text-amber-700/80 mt-0.5">
                若有模型转换任务提交，任务将在队列中排队等待。请确认本地或服务器上的模型转换客户端（如
                RVT Worker 等）已正常启动并建立 WebSocket 注册连接。
              </p>
            </div>
          </div>

          <!-- Worker 节点列表表格 -->
          <div v-else class="overflow-x-auto border border-slate-200 rounded-lg">
            <table class="min-w-full divide-y divide-slate-200 text-sm">
              <thead class="bg-slate-50/80 text-slate-600">
                <tr>
                  <th scope="col" class="py-3 px-4 text-left font-semibold">
                    节点标识 (Worker ID)
                  </th>
                  <th scope="col" class="py-3 px-4 text-left font-semibold">
                    支持能力与版本
                  </th>
                  <th scope="col" class="py-3 px-4 text-left font-semibold">
                    节点归属
                  </th>
                  <th scope="col" class="py-3 px-4 text-left font-semibold">
                    注册上线时间
                  </th>
                  <th scope="col" class="py-3 px-4 text-left font-semibold">
                    最近心跳
                  </th>
                  <th scope="col" class="py-3 px-4 text-right font-semibold w-28">
                    状态
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 bg-white">
                <tr
                  v-for="w in workers"
                  :key="w.workerId"
                  class="hover:bg-slate-50/60 transition-colors"
                >
                  <!-- Worker ID -->
                  <td class="py-3 px-4 font-mono font-medium text-slate-900">
                    <div class="flex items-center gap-2">
                      <span class="size-2 rounded-full bg-emerald-500 shrink-0"></span>
                      <span class="truncate max-w-[260px]" :title="w.workerId">
                        {{ w.workerId }}
                      </span>
                    </div>
                  </td>

                  <!-- Capabilities & Version -->
                  <td class="py-3 px-4">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <span
                        v-for="cap in w.capabilities"
                        :key="cap"
                        class="px-2 py-0.5 rounded text-xs font-semibold bg-cyan-50 text-[#00b4b6] border border-[#00b4b6]/20 uppercase"
                      >
                        {{ cap }}
                      </span>
                      <span
                        v-if="w.version"
                        class="px-2 py-0.5 rounded text-xs font-mono bg-slate-100 text-slate-600"
                      >
                        v{{ w.version }}
                      </span>
                    </div>
                  </td>

                  <!-- Node Type -->
                  <td class="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                    <span
                      class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium"
                      :class="
                        w.isLocal
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-purple-50 text-purple-700'
                      "
                    >
                      {{ w.isLocal ? '本地连接' : '集群分发' }}
                    </span>
                    <span
                      v-if="w.instanceId"
                      class="text-slate-400 font-mono ml-1 text-[10px]"
                      :title="`实例ID: ${w.instanceId}`"
                    >
                      ({{ w.instanceId.slice(0, 8) }})
                    </span>
                  </td>

                  <!-- Connected At -->
                  <td class="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                    {{ formatTime(w.connectedAt) }}
                  </td>

                  <!-- Last Seen -->
                  <td class="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                    <div class="flex items-center gap-1.5">
                      <span>{{ formatTime(w.lastSeenAt) }}</span>
                      <span class="text-[11px] text-slate-400 font-normal">
                        ({{ formatRelativeTime(w.lastSeenAt) }})
                      </span>
                    </div>
                  </td>

                  <!-- Status -->
                  <td class="py-3 px-4 text-right whitespace-nowrap">
                    <span
                      class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold"
                      :class="
                        isWorkerActive(w)
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      "
                    >
                      <span
                        class="size-1.5 rounded-full"
                        :class="isWorkerActive(w) ? 'bg-emerald-500' : 'bg-slate-400'"
                      ></span>
                      {{ isWorkerActive(w) ? '正常在线' : '心跳异常' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- IFC 转换性能与并发线程配置卡片 -->
      <div class="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2.5 flex-wrap">
            <div class="p-1.5 rounded-lg bg-cyan-50 text-[#00b4b6]">
              <AdjustmentsHorizontalIcon class="size-5" />
            </div>
            <h2 class="text-base font-semibold text-slate-900">
              IFC 转换性能与并发线程配置
            </h2>
            <span
              class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-50 text-[#00b4b6] border border-[#00b4b6]/30"
            >
              当前生效：{{ currentConcurrency }} 线程
            </span>
            <span
              v-if="serverCpuCount"
              class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600"
            >
              主机环境：{{ serverCpuCount }} 核 CPU
            </span>
            <span
              v-if="recommendedConcurrency"
              class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60"
            >
              推荐并发：{{ recommendedConcurrency }} 线程
            </span>
          </div>

          <!-- 右侧折叠/展开控制 -->
          <div class="flex items-center gap-3">
            <span class="text-xs text-slate-400 hidden sm:inline">
              调节几何三角化并发数，加快大模型解析速度（目标缩短至 20 分钟内）
            </span>
            <button
              type="button"
              class="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-50"
              @click="isConcurrencyCollapsed = !isConcurrencyCollapsed"
            >
              <span>{{ isConcurrencyCollapsed ? '展开配置' : '收起' }}</span>
              <ChevronDownIcon
                class="size-3.5 transition-transform duration-200"
                :class="{ 'rotate-180': !isConcurrencyCollapsed }"
              />
            </button>
          </div>
        </div>

        <!-- 设置主体 -->
        <div v-show="!isConcurrencyCollapsed" class="space-y-4 pt-1">
          <div
            class="p-4 rounded-lg bg-slate-50 border border-slate-200/70 flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <!-- 快捷预设按钮组 -->
            <div class="space-y-2">
              <div class="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                <span>并发线程预设：</span>
                <span class="text-slate-400 text-[11px]">
                  (多线程并发加速几何解析与网格三角化)
                </span>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <button
                  v-for="preset in concurrencyPresets"
                  :key="preset.value"
                  type="button"
                  class="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 flex items-center gap-1.5"
                  :class="[
                    selectedConcurrency === preset.value
                      ? 'bg-[#00b4b6] border-[#00b4b6] text-white shadow-sm font-semibold'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-100/70'
                  ]"
                  @click="selectedConcurrency = preset.value"
                >
                  <span>{{ preset.label }}</span>
                  <span
                    class="text-[10px] px-1 rounded"
                    :class="[
                      selectedConcurrency === preset.value
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 text-slate-500'
                    ]"
                  >
                    {{ preset.desc }}
                  </span>
                </button>
              </div>
            </div>

            <!-- 自定义数值与保存按钮 -->
            <div
              class="flex items-center gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200 shrink-0"
            >
              <div class="flex items-center gap-2">
                <label
                  for="custom-concurrency"
                  class="text-xs font-medium text-slate-600 whitespace-nowrap"
                >
                  自定义线程：
                </label>
                <div class="relative w-20">
                  <input
                    id="custom-concurrency"
                    v-model.number="selectedConcurrency"
                    type="number"
                    min="1"
                    max="32"
                    step="1"
                    class="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 font-mono focus:border-[#00b4b6] focus:ring-1 focus:ring-[#00b4b6] focus:outline-none"
                  />
                </div>
                <span class="text-xs text-slate-400">核</span>
              </div>

              <button
                type="button"
                :disabled="
                  concurrencySaving ||
                  selectedConcurrency === currentConcurrency ||
                  selectedConcurrency < 1 ||
                  selectedConcurrency > 32
                "
                class="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#00b4b6] hover:bg-[#009fa1] text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                @click="openConcurrencyConfirm"
              >
                <ArrowPathIcon
                  v-if="concurrencySaving"
                  class="size-3.5 animate-spin text-white"
                />
                <span>
                  {{
                    selectedConcurrency === currentConcurrency
                      ? '当前已生效'
                      : '保存并应用'
                  }}
                </span>
              </button>
            </div>
          </div>

          <!-- 提示说明条 -->
          <div class="flex items-start gap-2 text-[11px] text-slate-500 leading-relaxed px-1">
            <span class="text-[#00b4b6] font-bold shrink-0">💡 说明：</span>
            <span>
              每个 IFC 导入任务将根据此配置启动独立多进程解析池。数值过低（如 1~2 线程）复杂模型的几何三角化阶段耗时较长；建议配置为
              <strong class="text-slate-700 font-semibold">
                {{ recommendedConcurrency || 4 }} 线程
              </strong>
              ，大模型解析耗时可大幅缩短至 15~20 分钟内。配置即时生效，下次任务或恢复任务自动按新配置执行。
            </span>
          </div>
        </div>
      </div>

      <!-- Tab 切换栏 -->
      <div class="flex border-b border-slate-200 space-x-2">
        <button
          v-for="tab in tabs"
          :key="tab.type"
          type="button"
          class="group relative py-3 px-6 text-sm font-medium transition-all duration-150 flex items-center gap-2"
          :class="[
            activeTab === tab.type
              ? 'text-[#00b4b6] border-b-2 border-[#00b4b6] font-semibold bg-white rounded-t-lg shadow-sm'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/60 rounded-t-lg'
          ]"
          @click="switchTab(tab.type)"
        >
          <span>{{ tab.label }}</span>
          <span
            v-if="queueSummary[tab.type]?.total > 0"
            class="px-2 py-0.5 rounded-full text-xs font-semibold"
            :class="[
              activeTab === tab.type
                ? 'bg-[#00b4b6]/10 text-[#00b4b6]'
                : 'bg-slate-200 text-slate-600'
            ]"
          >
            {{ queueSummary[tab.type].total }}
          </span>
        </button>
      </div>

      <!-- Tab 主体内容 -->
      <div class="space-y-6">
        <!-- 1. 当前正在转换的模型卡片 (Active Conversion) -->
        <div class="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <div class="size-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <h2 class="text-base font-semibold text-slate-900">当前正在转换的模型</h2>
              <span class="text-xs text-slate-400 font-mono">
                ({{ activeTab.toUpperCase() }} Worker)
              </span>
            </div>

            <span
              v-if="activeJob"
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60"
            >
              <ArrowPathIcon class="size-3.5 animate-spin text-emerald-600" />
              转换中
            </span>
            <span v-else class="text-xs text-slate-400 font-medium">空闲状态</span>
          </div>

          <!-- 有正在转换的任务 -->
          <div
            v-if="activeJob"
            class="bg-gradient-to-r from-cyan-50/40 via-slate-50 to-white rounded-xl border border-cyan-100/80 p-5 flex flex-col gap-4 shadow-sm"
          >
            <!-- 头部基本信息与操作按钮 -->
            <div
              class="flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div class="space-y-1.5 flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-base font-bold text-slate-900 truncate">
                    {{ activeJob.modelName || activeJob.fileName }}
                  </span>
                  <span
                    class="px-2 py-0.5 rounded text-xs font-semibold bg-cyan-100 text-cyan-800 uppercase"
                  >
                    {{ activeJob.fileType }}
                  </span>
                  <span
                    v-if="activeJob.attempt > 1"
                    class="px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200"
                  >
                    第 {{ activeJob.attempt }} 次尝试
                  </span>
                </div>

                <div
                  class="grid grid-cols-1 sm:grid-cols-4 gap-y-1 gap-x-4 text-xs text-slate-500 pt-1"
                >
                  <div>
                    <span class="text-slate-400">所属项目：</span>
                    <span class="font-medium text-slate-700">
                      {{ activeJob.projectName }}
                    </span>
                  </div>
                  <div>
                    <span class="text-slate-400">原始文件：</span>
                    <span
                      class="font-medium text-slate-700 truncate"
                      :title="activeJob.fileName"
                    >
                      {{ activeJob.fileName }}
                    </span>
                  </div>
                  <div>
                    <span class="text-slate-400">开始/重试时间：</span>
                    <span class="font-medium text-slate-700">
                      {{ formatTime(activeJob.startedAt || activeJob.updatedAt) }}
                    </span>
                  </div>
                  <div>
                    <span class="text-slate-400">已耗时：</span>
                    <span class="font-semibold text-cyan-700 font-mono">
                      {{ elapsedTimeText }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- 暂停操作按钮 -->
              <div class="shrink-0 flex items-center gap-3">
                <button
                  type="button"
                  :disabled="actionLoading"
                  class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-medium text-sm shadow-sm transition-colors disabled:opacity-50"
                  @click="openPauseConfirm(activeJob)"
                >
                  <PauseIcon class="size-4" />
                  暂停转换并执行下一个
                </button>
              </div>
            </div>

            <!-- 当前详细情况（正在做什么）与动态进度条 -->
            <div
              class="bg-white/80 rounded-lg border border-slate-200/80 p-4 space-y-3"
            >
              <div class="flex items-center justify-between text-xs gap-3 flex-wrap">
                <!-- 左侧工作阶段与动作描述 -->
                <div class="flex items-center gap-2 flex-wrap">
                  <span
                    v-if="getPhaseInfo(activeJob.progressPhase)"
                    class="px-2.5 py-0.5 rounded-full font-semibold border text-xs"
                    :class="[
                      getPhaseInfo(activeJob.progressPhase)?.badgeClass,
                      'border-current/20'
                    ]"
                  >
                    {{ getPhaseInfo(activeJob.progressPhase)?.label }}
                  </span>
                  <span class="font-medium text-slate-800">
                    {{
                      activeJob.progressMessage ||
                      getPhaseInfo(activeJob.progressPhase)?.desc ||
                      '正在准备转换...'
                    }}
                  </span>
                </div>

                <!-- 右侧百分比数字 -->
                <div
                  class="flex items-center gap-1 text-xs font-semibold text-[#00b4b6] font-mono"
                >
                  <span>
                    {{
                      activeJob.progressPercent !== null &&
                      activeJob.progressPercent !== undefined
                        ? `${activeJob.progressPercent}%`
                        : '处理中'
                    }}
                  </span>
                </div>
              </div>

              <!-- 进度条本体 -->
              <div
                class="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-200/60"
              >
                <div
                  class="bg-gradient-to-r from-cyan-400 to-[#00b4b6] h-full rounded-full transition-all duration-300 ease-out relative"
                  :style="{
                    width: `${Math.max(
                      3,
                      Math.min(100, activeJob.progressPercent ?? 15)
                    )}%`
                  }"
                >
                  <div
                    class="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <!-- 无正在转换的任务 -->
          <div
            v-else
            class="rounded-lg border border-dashed border-slate-200 py-8 text-center text-slate-400 text-sm bg-slate-50/50"
          >
            当前无正在转换的 {{ activeTab.toUpperCase() }} 模型，队列处于就绪就绪状态
          </div>
        </div>

        <!-- 2. 等待转换的队列模型 (Queued Models) -->
        <div class="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <QueueListIcon class="size-5 text-slate-500" />
              <h2 class="text-base font-semibold text-slate-900">等待转换队列</h2>
              <span
                class="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600"
              >
                {{ queuedJobs.length }} 个模型
              </span>
            </div>

            <span class="text-xs text-slate-400">
              转换服务将按下方排序从上到下依次取出转换
            </span>
          </div>

          <!-- 队列列表表格 -->
          <div
            v-if="queuedJobs.length > 0"
            class="overflow-x-auto border border-slate-200 rounded-lg"
          >
            <table class="min-w-full divide-y divide-slate-200 text-sm">
              <thead class="bg-slate-50/80 text-slate-600">
                <tr>
                  <th scope="col" class="py-3 px-4 text-left font-semibold w-24">
                    排位
                  </th>
                  <th scope="col" class="py-3 px-4 text-left font-semibold">
                    模型名称
                  </th>
                  <th scope="col" class="py-3 px-4 text-left font-semibold">
                    所属项目
                  </th>
                  <th scope="col" class="py-3 px-4 text-left font-semibold">
                    原始文件
                  </th>
                  <th scope="col" class="py-3 px-4 text-left font-semibold">
                    排队时间
                  </th>
                  <th scope="col" class="py-3 px-4 text-right font-semibold w-56">
                    调整队列顺序
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 bg-white">
                <tr
                  v-for="(job, idx) in queuedJobs"
                  :key="job.id"
                  class="hover:bg-slate-50/60 transition-colors"
                  :class="{ 'bg-cyan-50/30': idx === 0 }"
                >
                  <!-- 排位序号 -->
                  <td class="py-3.5 px-4 font-mono font-medium">
                    <span
                      v-if="idx === 0"
                      class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-100 text-[#00b4b6] border border-[#00b4b6]/20"
                    >
                      #1 (下一个)
                    </span>
                    <span
                      v-else
                      class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-slate-500 bg-slate-100"
                    >
                      #{{ idx + 1 }}
                    </span>
                  </td>

                  <!-- 模型名称 -->
                  <td class="py-3.5 px-4 font-medium text-slate-900">
                    <div class="flex items-center gap-2">
                      <span class="truncate max-w-[240px]" :title="job.modelName">
                        {{ job.modelName }}
                      </span>
                      <span
                        class="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-500 uppercase"
                      >
                        {{ job.fileType }}
                      </span>
                    </div>
                  </td>

                  <!-- 所属项目 -->
                  <td
                    class="py-3.5 px-4 text-slate-600 truncate max-w-[180px]"
                    :title="job.projectName"
                  >
                    {{ job.projectName }}
                  </td>

                  <!-- 原始文件 -->
                  <td
                    class="py-3.5 px-4 text-slate-500 truncate max-w-[200px]"
                    :title="job.fileName"
                  >
                    {{ job.fileName }}
                  </td>

                  <!-- 排队时间 -->
                  <td class="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                    {{ formatTime(job.createdAt) }}
                  </td>

                  <!-- 排序操作列 -->
                  <td class="py-3.5 px-4 text-right whitespace-nowrap">
                    <div class="inline-flex items-center gap-1 justify-end">
                      <button
                        type="button"
                        :disabled="idx === 0 || reorderLoading"
                        title="置顶到第 1 位"
                        class="px-2 py-1 text-xs rounded border border-slate-200 hover:bg-slate-100 text-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                        @click="moveJobTop(idx)"
                      >
                        置顶
                      </button>
                      <button
                        type="button"
                        :disabled="idx === 0 || reorderLoading"
                        title="向前移动一位"
                        class="p-1 rounded border border-slate-200 hover:bg-slate-100 text-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                        @click="moveJobUp(idx)"
                      >
                        <ChevronUpIcon class="size-4" />
                      </button>
                      <button
                        type="button"
                        :disabled="idx === queuedJobs.length - 1 || reorderLoading"
                        title="向后移动一位"
                        class="p-1 rounded border border-slate-200 hover:bg-slate-100 text-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                        @click="moveJobDown(idx)"
                      >
                        <ChevronDownIcon class="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div
            v-else
            class="rounded-lg border border-dashed border-slate-200 py-8 text-center text-slate-400 text-sm bg-slate-50/50"
          >
            暂无排队等待转换的 {{ activeTab.toUpperCase() }} 模型
          </div>
        </div>

        <!-- 3. 已暂停的模型 (Paused Models) -->
        <div class="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <PauseCircleIcon class="size-5 text-amber-500" />
              <h2 class="text-base font-semibold text-slate-900">已暂停的模型</h2>
              <span
                class="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/50"
              >
                {{ pausedJobs.length }} 个模型
              </span>
            </div>

            <span class="text-xs text-slate-400">
              暂停的模型恢复后将直接插队进入等待队列首位（#1）
            </span>
          </div>

          <div
            v-if="pausedJobs.length > 0"
            class="overflow-x-auto border border-slate-200 rounded-lg"
          >
            <table class="min-w-full divide-y divide-slate-200 text-sm">
              <thead class="bg-slate-50/80 text-slate-600">
                <tr>
                  <th scope="col" class="py-3 px-4 text-left font-semibold">
                    模型名称
                  </th>
                  <th scope="col" class="py-3 px-4 text-left font-semibold">
                    所属项目
                  </th>
                  <th scope="col" class="py-3 px-4 text-left font-semibold">
                    原始文件
                  </th>
                  <th scope="col" class="py-3 px-4 text-left font-semibold">
                    暂停时间
                  </th>
                  <th scope="col" class="py-3 px-4 text-right font-semibold w-36">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 bg-white">
                <tr
                  v-for="job in pausedJobs"
                  :key="job.id"
                  class="hover:bg-slate-50/60 transition-colors"
                >
                  <td class="py-3.5 px-4 font-medium text-slate-900">
                    <span class="truncate max-w-[240px]" :title="job.modelName">
                      {{ job.modelName }}
                    </span>
                  </td>
                  <td
                    class="py-3.5 px-4 text-slate-600 truncate max-w-[180px]"
                    :title="job.projectName"
                  >
                    {{ job.projectName }}
                  </td>
                  <td
                    class="py-3.5 px-4 text-slate-500 truncate max-w-[200px]"
                    :title="job.fileName"
                  >
                    {{ job.fileName }}
                  </td>
                  <td class="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                    {{ formatTime(job.updatedAt) }}
                  </td>
                  <td class="py-3.5 px-4 text-right whitespace-nowrap">
                    <button
                      type="button"
                      :disabled="actionLoading"
                      class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#00b4b6] hover:bg-[#009fa1] text-white text-xs font-semibold transition-colors disabled:opacity-50"
                      @click="openResumeConfirm(job)"
                    >
                      <PlayIcon class="size-3.5" />
                      恢复转换
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div
            v-else
            class="rounded-lg border border-dashed border-slate-200 py-6 text-center text-slate-400 text-sm bg-slate-50/50"
          >
            暂无被暂停的 {{ activeTab.toUpperCase() }} 模型
          </div>
        </div>

        <!-- 4. 转换失败记录 (Failed Models) -->
        <div class="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <div class="p-1 rounded bg-rose-50 text-rose-600">
                <ExclamationCircleIcon class="size-5" />
              </div>
              <h2 class="text-base font-semibold text-slate-900">转换失败记录</h2>
              <span
                class="px-2 py-0.5 rounded-full text-xs font-semibold"
                :class="[
                  failedJobs.length > 0
                    ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                    : 'bg-slate-100 text-slate-500'
                ]"
              >
                {{ failedJobs.length }} 个模型
              </span>
            </div>

            <span class="text-xs text-slate-400">
              记录最近转换失败的模型任务，支持一键插队重新转换
            </span>
          </div>

          <div
            v-if="failedJobs.length > 0"
            class="overflow-x-auto border border-slate-200 rounded-lg"
          >
            <table class="min-w-full divide-y divide-slate-200 text-sm">
              <thead class="bg-slate-50/80 text-slate-600">
                <tr>
                  <th scope="col" class="py-3 px-4 text-left font-semibold">
                    模型名称
                  </th>
                  <th scope="col" class="py-3 px-4 text-left font-semibold">
                    所属项目
                  </th>
                  <th
                    scope="col"
                    class="py-3 px-4 text-left font-semibold whitespace-nowrap"
                  >
                    失败阶段
                  </th>
                  <th scope="col" class="py-3 px-4 text-left font-semibold">
                    失败进度与动作
                  </th>
                  <th scope="col" class="py-3 px-4 text-left font-semibold">
                    失败原因
                  </th>
                  <th
                    scope="col"
                    class="py-3 px-4 text-left font-semibold whitespace-nowrap"
                  >
                    失败时间 / 尝试
                  </th>
                  <th
                    scope="col"
                    class="py-3 px-4 text-right font-semibold w-36 whitespace-nowrap"
                  >
                    操作
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 bg-white">
                <tr
                  v-for="job in failedJobs"
                  :key="job.id"
                  class="hover:bg-rose-50/20 transition-colors"
                >
                  <!-- 模型名称 -->
                  <td class="py-3.5 px-4 font-medium text-slate-900">
                    <div class="flex items-center gap-2">
                      <span class="truncate max-w-[180px]" :title="job.modelName">
                        {{ job.modelName }}
                      </span>
                      <span
                        class="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-500 uppercase"
                      >
                        {{ job.fileType }}
                      </span>
                    </div>
                    <div
                      class="text-[11px] text-slate-400 truncate max-w-[180px] mt-0.5"
                      :title="job.fileName"
                    >
                      {{ job.fileName }}
                    </div>
                  </td>

                  <!-- 所属项目 -->
                  <td
                    class="py-3.5 px-4 text-slate-600 truncate max-w-[140px]"
                    :title="job.projectName"
                  >
                    {{ job.projectName }}
                  </td>

                  <!-- 失败阶段 -->
                  <td class="py-3.5 px-4 whitespace-nowrap">
                    <div class="space-y-1">
                      <span
                        v-if="getPhaseInfo(job.failedPhase)"
                        class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border shadow-2xs"
                        :class="[
                          getPhaseInfo(job.failedPhase)?.badgeClass,
                          'border-current/20'
                        ]"
                      >
                        {{ getPhaseInfo(job.failedPhase)?.label }}
                      </span>
                      <span
                        v-else
                        class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600"
                      >
                        {{ job.failedPhase || '未知阶段' }}
                      </span>
                      <div class="text-[11px] text-slate-400">
                        {{ getPhaseInfo(job.failedPhase)?.desc || '工序记录' }}
                      </div>
                    </div>
                  </td>

                  <!-- 失败进度与动作 -->
                  <td class="py-3.5 px-4 min-w-[200px] max-w-[280px]">
                    <div class="space-y-1.5">
                      <div class="flex items-center gap-2">
                        <span
                          v-if="
                            job.failedPercent !== null &&
                            job.failedPercent !== undefined
                          "
                          class="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold font-mono shadow-2xs"
                          :class="[
                            job.failedPercent >= 80
                              ? 'bg-sky-100 text-sky-800 border border-sky-300/60'
                              : job.failedPercent >= 40
                              ? 'bg-amber-100 text-amber-800 border border-amber-300/60'
                              : 'bg-slate-100 text-slate-800 border border-slate-300/60'
                          ]"
                        >
                          {{ job.failedPercent }}%
                        </span>
                        <span v-else class="text-xs text-slate-400 font-mono">--%</span>

                        <!-- 微型进度指示条 -->
                        <div
                          class="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200/40"
                        >
                          <div
                            class="h-full rounded-full transition-all duration-300"
                            :class="[
                              job.failedPercent && job.failedPercent >= 80
                                ? 'bg-sky-500'
                                : job.failedPercent && job.failedPercent >= 40
                                ? 'bg-amber-500'
                                : 'bg-slate-400'
                            ]"
                            :style="{
                              width: `${Math.max(
                                4,
                                Math.min(100, job.failedPercent ?? 0)
                              )}%`
                            }"
                          ></div>
                        </div>
                      </div>

                      <p
                        class="text-xs text-slate-600 truncate font-mono"
                        :title="job.failedProgressMessage || '无具体步骤描述'"
                      >
                        {{ job.failedProgressMessage || '阶段异常中断' }}
                      </p>
                    </div>
                  </td>

                  <!-- 失败原因 -->
                  <td class="py-3.5 px-4 max-w-[260px]">
                    <div
                      class="text-xs text-rose-700 bg-rose-50/80 p-2 rounded border border-rose-200/50 break-words font-mono line-clamp-2 hover:line-clamp-none cursor-pointer transition-all"
                      :title="job.errorMessage || '未知异常'"
                    >
                      {{ job.errorMessage || '未知异常' }}
                    </div>
                  </td>

                  <!-- 失败时间与尝试次数 -->
                  <td class="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                    <div>{{ formatTime(job.failedAt) }}</div>
                    <div class="text-[11px] text-slate-400 mt-0.5">
                      尝试 {{ job.attempt }} / {{ job.maxAttempt }} 次
                    </div>
                  </td>

                  <!-- 操作列 -->
                  <td class="py-3.5 px-4 text-right whitespace-nowrap">
                    <button
                      type="button"
                      :disabled="actionLoading"
                      class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 active:bg-black text-white text-xs font-semibold transition-colors disabled:opacity-50 shadow-sm"
                      @click="openRetryConfirm(job)"
                    >
                      <ArrowPathIcon class="size-3.5" />
                      重新转换
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- 分页控制器 -->
            <div
              v-if="failedTotal > 0"
              class="px-4 py-3 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600"
            >
              <div class="flex items-center gap-3">
                <span>
                  共
                  <span class="font-semibold text-slate-900">{{ failedTotal }}</span>
                  条失败记录，第
                  <span class="font-semibold text-slate-900">
                    {{ (failedPage - 1) * failedPageSize + 1 }}-{{
                      Math.min(failedPage * failedPageSize, failedTotal)
                    }}
                  </span>
                  条
                </span>
                <div class="h-3.5 w-px bg-slate-300"></div>
                <div class="flex items-center gap-1.5">
                  <span>每页显示</span>
                  <select
                    :value="failedPageSize"
                    aria-label="每页显示条数"
                    class="bg-white border border-slate-200 rounded px-2 py-0.5 text-xs text-slate-700 focus:border-[#00b4b6] focus:ring-1 focus:ring-[#00b4b6] outline-none shadow-xs"
                    @change="
                      changeFailedPageSize(
                        Number(($event.target as HTMLSelectElement).value)
                      )
                    "
                  >
                    <option :value="10">10 条</option>
                    <option :value="20">20 条</option>
                    <option :value="50">50 条</option>
                  </select>
                </div>
              </div>

              <div class="flex items-center gap-1">
                <!-- 上一页 -->
                <button
                  type="button"
                  :disabled="failedPage <= 1"
                  class="p-1 rounded border border-slate-200 hover:bg-white text-slate-600 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  title="上一页"
                  @click="changeFailedPage(failedPage - 1)"
                >
                  <ChevronLeftIcon class="size-4" />
                </button>

                <!-- 页码按钮 -->
                <button
                  v-for="p in visibleFailedPages"
                  :key="p"
                  type="button"
                  class="min-w-[28px] h-7 px-1.5 rounded border text-xs font-medium transition-colors"
                  :class="[
                    failedPage === p
                      ? 'bg-[#00b4b6] border-[#00b4b6] text-white font-semibold shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                  ]"
                  @click="changeFailedPage(p)"
                >
                  {{ p }}
                </button>

                <!-- 下一页 -->
                <button
                  type="button"
                  :disabled="failedPage >= failedTotalPages"
                  class="p-1 rounded border border-slate-200 hover:bg-white text-slate-600 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  title="下一页"
                  @click="changeFailedPage(failedPage + 1)"
                >
                  <ChevronRightIcon class="size-4" />
                </button>
              </div>
            </div>
          </div>

          <div
            v-else
            class="rounded-lg border border-dashed border-slate-200 py-6 text-center text-slate-400 text-sm bg-slate-50/50"
          >
            暂无转换失败的 {{ activeTab.toUpperCase() }} 模型记录
          </div>
        </div>
      </div>

      <!-- 二次确认弹窗 1：暂停转换确认 -->
      <CommonConfirmDialog
        v-model:open="showPauseDialog"
        title="暂停模型转换确认"
        confirm-text="确认暂停"
        :loading="actionLoading"
        @confirm="confirmPauseJob"
      >
        <div class="text-sm text-slate-600 space-y-2 py-2">
          <p>
            确定要暂停当前正在转换的模型
            <span class="font-semibold text-slate-900">
              「{{ targetJob?.modelName }}」
            </span>
            吗？
          </p>
          <p
            class="text-xs text-amber-600 bg-amber-50 p-2.5 rounded border border-amber-200/60"
          >
            ⚠️
            提示：暂停后将立即终止当前转换进程，并立刻开始等待队列中的下一个模型转换。该模型可在已暂停列表中随时恢复。
          </p>
        </div>
      </CommonConfirmDialog>

      <!-- 二次确认弹窗 2：恢复转换确认 -->
      <CommonConfirmDialog
        v-model:open="showResumeDialog"
        title="恢复模型转换确认"
        confirm-text="确认恢复"
        :loading="actionLoading"
        @confirm="confirmResumeJob"
      >
        <div class="text-sm text-slate-600 space-y-2 py-2">
          <p>
            确定要恢复模型
            <span class="font-semibold text-slate-900">
              「{{ targetJob?.modelName }}」
            </span>
            的转换吗？
          </p>
          <p
            class="text-xs text-cyan-700 bg-cyan-50 p-2.5 rounded border border-cyan-200/60"
          >
            ℹ️
            恢复后的模型将直接进入等待队列首位（#1），在当前运行的模型完成后优先转换。
          </p>
        </div>
      </CommonConfirmDialog>

      <!-- 二次确认弹窗 3：重新转换失败模型确认 (根据用户全局规则使用 commonConfirmdialog) -->
      <CommonConfirmDialog
        v-model:open="showRetryDialog"
        title="重新转换模型确认"
        confirm-text="确认重新转换"
        :loading="actionLoading"
        @confirm="confirmRetryJob"
      >
        <div class="text-sm text-slate-600 space-y-2 py-2">
          <p>
            确定要重新转换失败的模型
            <span class="font-semibold text-slate-900">
              「{{ targetFailedJob?.modelName }}」
            </span>
            吗？
          </p>
          <p
            class="text-xs text-cyan-700 bg-cyan-50 p-2.5 rounded border border-cyan-200/60"
          >
            ℹ️
            提示：系统将清理之前的失败日志与进度，并将该模型直接插队进入等待队列首位（#1）优先开始重新转换。
          </p>
        </div>
      </CommonConfirmDialog>

      <!-- 二次确认弹窗 4：修改 IFC 转换并发线程确认 (根据用户全局规则使用 commonConfirmdialog) -->
      <CommonConfirmDialog
        v-model:open="showConcurrencyDialog"
        title="修改 IFC 转换并发线程确认"
        confirm-text="确认应用"
        :loading="concurrencySaving"
        @confirm="confirmSaveConcurrency"
      >
        <div class="text-sm text-slate-600 space-y-2.5 py-2">
          <p>
            确定要将 IFC 模型转换并发线程数从
            <span class="font-bold text-slate-900">{{ currentConcurrency }} 线程</span>
            调整为
            <span class="font-bold text-[#00b4b6]">{{ selectedConcurrency }} 线程</span>
            吗？
          </p>
          <div
            class="text-xs text-amber-800 bg-amber-50 p-3 rounded-lg border border-amber-200/60 leading-relaxed space-y-1"
          >
            <p class="font-semibold">⚠️ 性能与生效说明：</p>
            <p>• 并发线程数增加会显著提升几何多边形三角化与构件解析速度，缩短大模型耗时至 20 分钟以内；</p>
            <p>• 保存后配置将直接写入数据库并对后续所有 IFC 转换任务即时生效，无需重启服务。</p>
          </div>
        </div>
      </CommonConfirmDialog>
    </main>
  </div>
</template>

<script setup lang="ts">
/* eslint-disable */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import {
  ArrowPathIcon,
  ArrowLeftIcon,
  PauseIcon,
  PlayIcon,
  PauseCircleIcon,
  QueueListIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CpuChipIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/vue/24/outline'
import { ToastNotificationType, useGlobalToast } from '~~/lib/common/composables/toast'
import { useAuthCookie } from '~~/lib/auth/composables/auth'
import { useApiOrigin } from '~~/composables/env'

definePageMeta({
  middleware: ['auth', 'admin'],
  layout: false
})

const { triggerNotification } = useGlobalToast()
const authToken = useAuthCookie()
const apiOrigin = useApiOrigin()

const getAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {}
  if (authToken.value) {
    headers['Authorization'] = `Bearer ${authToken.value}`
  }
  return headers
}

type FileType = 'ifc' | 'skp' | 'dxf'

interface ConversionJobItem {
  id: string
  jobType: string
  fileType: string
  fileName: string
  projectId: string
  projectName: string
  modelId: string
  modelName: string
  blobId: string
  status: 'processing' | 'queued' | 'paused' | string
  createdAt: string
  updatedAt: string
  startedAt?: string | null
  attempt: number
  maxAttempt: number
  queuePosition?: number | null
  progressPhase?: string | null
  progressPercent?: number | null
  progressMessage?: string | null
}

interface FailedConversionJobItem {
  id: string
  jobType: string
  fileType: string
  fileName: string
  projectId: string
  projectName: string
  modelId: string
  modelName: string
  blobId: string
  status: string
  createdAt: string
  updatedAt: string
  failedAt: string
  attempt: number
  maxAttempt: number
  failedPhase?: string | null
  failedPercent?: number | null
  failedProgressMessage?: string | null
  errorMessage?: string | null
}

const PHASE_MAP: Record<string, { label: string; desc: string; badgeClass: string }> = {
  starting: {
    label: '环境准备',
    desc: '正在准备转换运行环境并初始化参数',
    badgeClass: 'bg-slate-100 text-slate-700'
  },
  downloading_source: {
    label: '下载源文件',
    desc: '正在从对象存储下载原始模型文件',
    badgeClass: 'bg-blue-50 text-blue-700'
  },
  opening_ifc: {
    label: '解析 IFC 结构',
    desc: '正在读取 IFC 拓扑结构与根实体',
    badgeClass: 'bg-indigo-50 text-indigo-700'
  },
  preprocessing_geometry: {
    label: '几何网格预处理',
    desc: '正在提取并三角化几何体，分批暂存至磁盘缓存',
    badgeClass: 'bg-cyan-50 text-cyan-700'
  },
  converting_objects: {
    label: '构建对象树',
    desc: '正在提取属性并构建 Speckle 构件树',
    badgeClass: 'bg-teal-50 text-teal-700'
  },
  uploading_model_object: {
    label: '上传模型对象',
    desc: '正在向服务端批量上传转换后的构件对象',
    badgeClass: 'bg-sky-50 text-sky-700'
  },
  creating_version: {
    label: '创建新版本',
    desc: '正在生成 Speckle 模型版本记录并提交',
    badgeClass: 'bg-emerald-50 text-emerald-700'
  },
  completed: {
    label: '转换完成',
    desc: '模型转换已全部完成',
    badgeClass: 'bg-emerald-50 text-emerald-700'
  },
  failed: {
    label: '转换失败',
    desc: '转换发生异常中断',
    badgeClass: 'bg-rose-50 text-rose-700'
  }
}

const getPhaseInfo = (phase?: string | null) => {
  if (!phase) return null
  return (
    PHASE_MAP[phase.toLowerCase()] || {
      label: phase,
      desc: phase,
      badgeClass: 'bg-slate-100 text-slate-700'
    }
  )
}

const tabs: { type: FileType; label: string }[] = [
  { type: 'ifc', label: 'IFC 模型转换' },
  { type: 'skp', label: 'SKP 模型转换' },
  { type: 'dxf', label: 'DXF 模型转换' }
]

const activeTab = ref<FileType>('ifc')
const loading = ref(false)
const autoRefresh = ref(true)
const reorderLoading = ref(false)
const actionLoading = ref(false)

const activeJob = ref<ConversionJobItem | null>(null)
const queuedJobs = ref<ConversionJobItem[]>([])
const pausedJobs = ref<ConversionJobItem[]>([])
const failedJobs = ref<FailedConversionJobItem[]>([])

// 失败列表分页状态（默认每页 10 条）
const failedPage = ref(1)
const failedPageSize = ref(10)
const failedTotal = ref(0)
const failedTotalPages = computed(
  () => Math.ceil(failedTotal.value / failedPageSize.value) || 1
)

const visibleFailedPages = computed(() => {
  const total = failedTotalPages.value
  const current = failedPage.value
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  let start = Math.max(1, current - 2)
  let end = Math.min(total, start + 4)
  if (end - start < 4) {
    start = Math.max(1, end - 4)
  }
  const pages: number[] = []
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  return pages
})

const changeFailedPage = (p: number) => {
  if (p < 1 || p > failedTotalPages.value || p === failedPage.value) return
  failedPage.value = p
  fetchQueueData()
}

const changeFailedPageSize = (size: number) => {
  failedPageSize.value = size
  failedPage.value = 1
  fetchQueueData()
}

const nowTimestamp = ref(Date.now())
const elapsedTimeText = computed(() => {
  if (!activeJob.value) return '-'
  const startTimeStr =
    activeJob.value.startedAt || activeJob.value.updatedAt || activeJob.value.createdAt
  if (!startTimeStr) return '-'
  const diffSec = Math.max(
    0,
    Math.floor((nowTimestamp.value - new Date(startTimeStr).getTime()) / 1000)
  )
  const minutes = Math.floor(diffSec / 60)
  const seconds = diffSec % 60
  if (minutes > 0) {
    return `${minutes}分${seconds.toString().padStart(2, '0')}秒`
  }
  return `${seconds}秒`
})

interface WorkerItem {
  workerId: string
  capabilities: string[]
  version: string | null
  connectedAt: string
  lastSeenAt: string
  instanceId?: string
  isLocal: boolean
}

const workers = ref<WorkerItem[]>([])
const workersLoading = ref(false)
const isWorkersCollapsed = ref(false)

const queueSummary = ref<Record<FileType, { total: number }>>({
  ifc: { total: 0 },
  skp: { total: 0 },
  dxf: { total: 0 }
})

// 弹窗状态
const showPauseDialog = ref(false)
const showResumeDialog = ref(false)
const showRetryDialog = ref(false)
const showConcurrencyDialog = ref(false)
const targetJob = ref<ConversionJobItem | null>(null)
const targetFailedJob = ref<FailedConversionJobItem | null>(null)

// 并发设置相关状态
const currentConcurrency = ref(4)
const selectedConcurrency = ref(4)
const serverCpuCount = ref(4)
const recommendedConcurrency = ref(4)
const concurrencyLoading = ref(false)
const concurrencySaving = ref(false)
const isConcurrencyCollapsed = ref(false)

const concurrencyPresets = [
  { value: 1, label: '1 线程', desc: '单核节能' },
  { value: 2, label: '2 线程', desc: '保守' },
  { value: 4, label: '4 线程', desc: '推荐平衡' },
  { value: 6, label: '6 线程', desc: '高性能' },
  { value: 8, label: '8 线程', desc: '极致速度' }
]

let pollTimer: ReturnType<typeof setInterval> | null = null

const switchTab = (tab: FileType) => {
  activeTab.value = tab
  failedPage.value = 1
  fetchQueueData()
}

const formatRelativeTime = (isoString?: string) => {
  if (!isoString) return '-'
  try {
    const diff = Math.max(
      0,
      Math.floor((Date.now() - new Date(isoString).getTime()) / 1000)
    )
    if (diff < 5) return '刚刚'
    if (diff < 60) return `${diff} 秒前`
    const mins = Math.floor(diff / 60)
    if (mins < 60) return `${mins} 分钟前`
    const hours = Math.floor(mins / 60)
    return `${hours} 小时前`
  } catch {
    return '-'
  }
}

const isWorkerActive = (worker: WorkerItem) => {
  if (!worker.lastSeenAt) return false
  const diff = Date.now() - new Date(worker.lastSeenAt).getTime()
  return diff <= 120 * 1000
}

const formatTime = (isoString?: string) => {
  if (!isoString) return '-'
  try {
    const d = new Date(isoString)
    const pad = (n: number) => n.toString().padStart(2, '0')
    const month = pad(d.getMonth() + 1)
    const day = pad(d.getDate())
    const hours = pad(d.getHours())
    const minutes = pad(d.getMinutes())
    const seconds = pad(d.getSeconds())
    return `${month}-${day} ${hours}:${minutes}:${seconds}`
  } catch {
    return isoString
  }
}

// 获取已注册 Worker 列表
const fetchWorkersData = async () => {
  workersLoading.value = true
  try {
    const res = await fetch(`${apiOrigin}/api/v1/rvt/workers`, {
      headers: {
        ...getAuthHeaders()
      }
    })
    if (res.ok) {
      const data = await res.json()
      workers.value = Array.isArray(data.workers) ? data.workers : []
    }
  } catch (err: any) {
    console.error('Failed to fetch rvt workers:', err)
  } finally {
    workersLoading.value = false
  }
}

// 统一刷新方法
const handleRefresh = async () => {
  await Promise.allSettled([
    fetchQueueData(),
    fetchAllSummaries(),
    fetchWorkersData(),
    fetchSettings()
  ])
}

// 获取当前 Tab 的队列数据，同时附带更新其余格式的摘要数与失败列表
const fetchQueueData = async () => {
  loading.value = true
  try {
    const res = await fetch(
      `${apiOrigin}/api/v1/admin/file-import-queues?fileType=${activeTab.value}&failedPage=${failedPage.value}&failedPageSize=${failedPageSize.value}`,
      {
        headers: {
          ...getAuthHeaders()
        }
      }
    )
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: 获取队列失败`)
    }
    const data = await res.json()
    activeJob.value = data.activeJob || null
    queuedJobs.value = data.queuedJobs || []
    pausedJobs.value = data.pausedJobs || []
    failedJobs.value = data.failedJobs || []

    if (data.failedPagination) {
      failedTotal.value = data.failedPagination.total || 0
    } else {
      failedTotal.value = failedJobs.value.length
    }

    const currentTotal =
      (activeJob.value ? 1 : 0) + queuedJobs.value.length + pausedJobs.value.length
    queueSummary.value[activeTab.value] = { total: currentTotal }
  } catch (err: any) {
    console.error('Failed to fetch queue data:', err)
  } finally {
    loading.value = false
  }
}

// 刷新全量摘要信息
const fetchAllSummaries = async () => {
  try {
    const res = await fetch(`${apiOrigin}/api/v1/admin/file-import-queues`, {
      headers: {
        ...getAuthHeaders()
      }
    })
    if (res.ok) {
      const data = await res.json()
      const allJobs: ConversionJobItem[] = [
        ...(data.activeJob ? [data.activeJob] : []),
        ...(data.queuedJobs || []),
        ...(data.pausedJobs || [])
      ]
      const counts: Record<FileType, number> = { ifc: 0, skp: 0, dxf: 0 }
      for (const j of allJobs) {
        const ft = j.fileType.toLowerCase() as FileType
        if (counts[ft] !== undefined) counts[ft]++
      }
      queueSummary.value = {
        ifc: { total: counts.ifc },
        skp: { total: counts.skp },
        dxf: { total: counts.dxf }
      }
    }
  } catch {
    // ignore
  }
}

// 暂停操作
const openPauseConfirm = (job: ConversionJobItem) => {
  targetJob.value = job
  showPauseDialog.value = true
}

const confirmPauseJob = async () => {
  if (!targetJob.value) return
  actionLoading.value = true
  try {
    const res = await fetch(
      `${apiOrigin}/api/v1/admin/file-import-queues/${targetJob.value.id}/pause`,
      {
        method: 'POST',
        headers: {
          ...getAuthHeaders()
        }
      }
    )
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || '暂停失败')

    triggerNotification({
      type: ToastNotificationType.Success,
      title: '模型转换已暂停',
      description: '已立即释放当前 Worker，开始调度下一个模型转换'
    })
    showPauseDialog.value = false
    await fetchQueueData()
  } catch (err: any) {
    triggerNotification({
      type: ToastNotificationType.Danger,
      title: '暂停失败',
      description: err.message
    })
  } finally {
    actionLoading.value = false
  }
}

// 恢复操作
const openResumeConfirm = (job: ConversionJobItem) => {
  targetJob.value = job
  showResumeDialog.value = true
}

const confirmResumeJob = async () => {
  if (!targetJob.value) return
  actionLoading.value = true
  try {
    const res = await fetch(
      `${apiOrigin}/api/v1/admin/file-import-queues/${targetJob.value.id}/resume`,
      {
        method: 'POST',
        headers: {
          ...getAuthHeaders()
        }
      }
    )
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || '恢复失败')

    triggerNotification({
      type: ToastNotificationType.Success,
      title: '模型转换已恢复',
      description: '该模型已成功进入排队队列第 1 位'
    })
    showResumeDialog.value = false
    await fetchQueueData()
  } catch (err: any) {
    triggerNotification({
      type: ToastNotificationType.Danger,
      title: '恢复失败',
      description: err.message
    })
  } finally {
    actionLoading.value = false
  }
}

// 重新转换操作
const openRetryConfirm = (job: FailedConversionJobItem) => {
  targetFailedJob.value = job
  showRetryDialog.value = true
}

const confirmRetryJob = async () => {
  if (!targetFailedJob.value) return
  actionLoading.value = true
  try {
    const res = await fetch(
      `${apiOrigin}/api/v1/admin/file-import-queues/${targetFailedJob.value.id}/retry`,
      {
        method: 'POST',
        headers: {
          ...getAuthHeaders()
        }
      }
    )
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || '重试失败')

    triggerNotification({
      type: ToastNotificationType.Success,
      title: '模型转换已重置',
      description: '该模型已成功排入等待队列首位（#1）并重新开始转换'
    })
    showRetryDialog.value = false
    await fetchQueueData()
  } catch (err: any) {
    triggerNotification({
      type: ToastNotificationType.Danger,
      title: '重试失败',
      description: err.message
    })
  } finally {
    actionLoading.value = false
  }
}

// 队列顺序调整
const submitReorder = async (newJobs: ConversionJobItem[]) => {
  reorderLoading.value = true
  try {
    const jobIds = newJobs.map((j) => j.id)
    const res = await fetch(
      `${apiOrigin}/api/v1/admin/file-import-queues/${activeTab.value}/reorder`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ jobIds })
      }
    )
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || '保存排序失败')

    triggerNotification({
      type: ToastNotificationType.Success,
      title: '排队顺序调整成功'
    })
    queuedJobs.value = newJobs
  } catch (err: any) {
    triggerNotification({
      type: ToastNotificationType.Danger,
      title: '调整排序失败',
      description: err.message
    })
    await fetchQueueData()
  } finally {
    reorderLoading.value = false
  }
}

const moveJobTop = (index: number) => {
  if (index <= 0) return
  const list = [...queuedJobs.value]
  const [target] = list.splice(index, 1)
  list.unshift(target)
  submitReorder(list)
}

const moveJobUp = (index: number) => {
  if (index <= 0) return
  const list = [...queuedJobs.value]
  const temp = list[index]
  list[index] = list[index - 1]
  list[index - 1] = temp
  submitReorder(list)
}

const moveJobDown = (index: number) => {
  if (index >= queuedJobs.value.length - 1) return
  const list = [...queuedJobs.value]
  const temp = list[index]
  list[index] = list[index + 1]
  list[index + 1] = temp
  submitReorder(list)
}

// 获取与保存并发设置
const fetchSettings = async () => {
  concurrencyLoading.value = true
  try {
    const res = await fetch(`${apiOrigin}/api/v1/admin/file-import-queues/settings`, {
      headers: {
        ...getAuthHeaders()
      }
    })
    if (res.ok) {
      const data = await res.json()
      if (typeof data.ifcConcurrency === 'number') {
        currentConcurrency.value = data.ifcConcurrency
        // 如果用户尚未编辑或初次加载，同步 selected
        if (!concurrencySaving.value) {
          selectedConcurrency.value = data.ifcConcurrency
        }
      }
      if (typeof data.cpuCount === 'number') {
        serverCpuCount.value = data.cpuCount
      }
      if (typeof data.recommendedConcurrency === 'number') {
        recommendedConcurrency.value = data.recommendedConcurrency
      }
    }
  } catch (err: any) {
    console.error('Failed to fetch import settings:', err)
  } finally {
    concurrencyLoading.value = false
  }
}

const openConcurrencyConfirm = () => {
  if (selectedConcurrency.value < 1 || selectedConcurrency.value > 32) {
    triggerNotification({
      type: ToastNotificationType.Danger,
      title: '参数错误',
      description: '并发线程数必须介于 1 到 32 之间'
    })
    return
  }
  showConcurrencyDialog.value = true
}

const confirmSaveConcurrency = async () => {
  concurrencySaving.value = true
  try {
    const res = await fetch(`${apiOrigin}/api/v1/admin/file-import-queues/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({
        ifcConcurrency: selectedConcurrency.value
      })
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || '保存并发设置失败')
    }

    currentConcurrency.value = selectedConcurrency.value
    showConcurrencyDialog.value = false
    triggerNotification({
      type: ToastNotificationType.Success,
      title: '并发配置更新成功',
      description: `IFC 转换并发已调整为 ${selectedConcurrency.value} 线程，后续任务即时生效`
    })
  } catch (err: any) {
    triggerNotification({
      type: ToastNotificationType.Danger,
      title: '保存失败',
      description: err.message
    })
  } finally {
    concurrencySaving.value = false
  }
}

let secondTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  fetchQueueData()
  fetchAllSummaries()
  fetchWorkersData()
  fetchSettings()

  // 1秒时钟驱动已耗时计时显示
  secondTimer = setInterval(() => {
    nowTimestamp.value = Date.now()
  }, 1000)

  pollTimer = setInterval(() => {
    if (
      autoRefresh.value &&
      !showPauseDialog.value &&
      !showResumeDialog.value &&
      !showRetryDialog.value &&
      !showConcurrencyDialog.value &&
      !reorderLoading.value
    ) {
      fetchQueueData()
      fetchAllSummaries()
      fetchWorkersData()
    }
  }, 3000)
})

onBeforeUnmount(() => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  if (secondTimer) {
    clearInterval(secondTimer)
    secondTimer = null
  }
})
</script>
