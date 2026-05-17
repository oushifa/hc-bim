<!-- eslint-disable vuejs-accessibility/click-events-have-key-events -->
<!-- eslint-disable vuejs-accessibility/no-static-element-interactions -->
<template>
  <div class="group h-[calc(100vh-1.5rem)] sidebar-shell lg:pl-3 mt-3">
    <template v-if="isLoggedIn">
      <Portal to="mobile-navigation">
        <div class="lg:hidden">
          <FormButton
            :color="isOpenMobile ? 'outline' : 'subtle'"
            size="sm"
            class="mt-px"
            @click="isOpenMobile = !isOpenMobile"
          >
            <IconSidebar v-if="!isOpenMobile" class="h-4 w-4 -ml-1 -mr-1" />
            <IconSidebarClose v-else class="h-4 w-4 -ml-1 -mr-1" />
          </FormButton>
        </div>
      </Portal>
      <div
        v-keyboard-clickable
        class="lg:hidden absolute inset-0 backdrop-blur-sm z-40 transition-all"
        :class="isOpenMobile ? 'opacity-100' : 'opacity-0 pointer-events-none'"
        @click="isOpenMobile = false"
      />
      <div
        class="absolute z-40 lg:static h-full flex w-64 shrink-0 transition-all"
        :class="isOpenMobile ? '' : '-translate-x-64 lg:translate-x-0'"
      >
        <div
          class="layout-sidebar-bg absolute left-0 w-full h-full bg-no-repeat bottom-0 pointer-events-none rounded-[26px]"
        ></div>
        <LayoutSidebar
          class="h-full w-full border border-white/40 bg-white/80 backdrop-blur-[151.88px] rounded-[26px] shadow-[0px_60px_60px_-30px_rgba(64,74,72,0.2)] px-3 pt-2 pb-2 overflow-hidden relative"
        >
          <div
            class="h-14 flex items-center px-3 border-b border-gray-50 shrink-0 mb-3"
          >
            <div class="flex items-center space-x-2">
              <img
                src="https://siruijie.oss-cn-beijing.aliyuncs.com/test/logo.png"
                alt="Logo"
                class="h-6 w-auto object-contain"
                referrerpolicy="no-referrer"
              />
              <span class="text-lg font-bold text-[#333] tracking-wide">中建海创</span>
            </div>
          </div>
          <LayoutSidebarMenu>
            <LayoutSidebarMenuGroup
              v-if="isWorkspacesEnabled && isLoggedIn"
              class="lg:hidden mb-4"
            >
              <HeaderWorkspaceSwitcher />
            </LayoutSidebarMenuGroup>

            <div class="flex flex-col gap-y-2 lg:gap-y-4">
              <LayoutSidebarMenuGroup>
                <!-- <NuxtLink
                  v-if="showWorkspaceLinks"
                  to="/workbench"
                  @click="isOpenMobile = false"
                >
                  <LayoutSidebarMenuGroupItem
                    :class="[
                      'py-2.5 mb-1 rounded-[8px]',
                      isActive(workbenchRoute) &&
                        'bg-[#e6f7f8] hover:!bg-[#e6f7f8] text-[#00b4b6]',
                      !isActive(workbenchRoute) &&
                        'text-[#666] hover:bg-[#f5f7fa] hover:text-[#00b4b6]'
                    ]"
                    label="工作台"
                  >
                    <template #icon>
                      <IconHome
                        class="size-4"
                        :class="isActive(workbenchRoute) ? 'text-[#00b4b6]' : 'text-gray-400'"
                      />
                    </template>
                  </LayoutSidebarMenuGroupItem>
                </NuxtLink> -->

                <NuxtLink
                  v-if="showWorkspaceLinks && hasMenu('/projects')"
                  :to="projectsLink"
                  @click="isOpenMobile = false"
                >
                  <LayoutSidebarMenuGroupItem
                    :class="[
                      'py-3.5 mb-2 rounded-[8px] font-medium text-sm pl-3',
                      isActive(projectsRoute) &&
                        'bg-[#e6f7f8] hover:!bg-[#e6f7f8] text-[#00b4b6]',
                      !isActive(projectsRoute) &&
                        'text-[#666] hover:bg-[#f5f7fa] hover:text-[#00b4b6]'
                    ]"
                    label="项目管理"
                  >
                    <template #icon>
                      <IconProjects
                        class="size-6 pl-2"
                        :class="
                          isActive(projectsRoute) ? 'text-[#00b4b6]' : 'text-gray-400'
                        "
                      />
                    </template>
                  </LayoutSidebarMenuGroupItem>
                </NuxtLink>

                <!-- 3D孪生场景编辑（工作组切换 + 子菜单，内容区后续 iframe） -->
                <div v-if="showWorkspaceLinks && hasMenu('/twin-scene')" class="relative">
                  <button
                    type="button"
                    class="w-full text-left px-2.5 py-4 mb-2 rounded-[8px] flex items-center transition-colors"
                    :class="[
                      isTwinSceneSectionActive
                        ? 'bg-[#e6f7f8] text-[#00b4b6]'
                        : 'text-[#666] hover:bg-[#f5f7fa] hover:text-[#00b4b6]'
                    ]"
                    @click="toggleTwinSceneMenu"
                  >
                    <Squares2X2Icon
                      class="size-6 flex-shrink-0 mr-2.5 pl-2"
                      :class="isTwinSceneSectionActive ? 'text-[#00b4b6]' : 'text-gray-400'"
                    />
                    <span class="flex-1 text-sm font-medium">3D孪生场景编辑</span>
                    <ChevronRightIcon
                      class="size-4 flex-shrink-0 transition-transform duration-200 ease-in-out"
                      :class="
                        showTwinSceneMenu ? 'rotate-90 text-[#00b4b6]' : 'text-gray-400'
                      "
                    />
                  </button>

                  <div
                    v-show="showTwinSceneMenu"
                    class="ml-6 mt-1.5 mb-1.5 space-y-1.5 border-l-2 border-gray-200 overflow-hidden transition-all duration-300 ease-in-out"
                  >
                    <!-- 当前工作组 + 切换 / 添加 -->
                    <div
                      class="flex items-center justify-between gap-2 pl-3.5 pr-2 py-2.5 rounded-[6px] text-sm text-gray-600"
                    >
                      <span class="truncate flex-1 min-w-0 font-medium">{{
                        activeTwinWorkgroupLabel
                      }}</span>
                      <div ref="twinWorkgroupDropdownRef" class="relative shrink-0">
                        <button
                          type="button"
                          title="切换工作组"
                          class="p-1 bg-white border border-gray-200 rounded-[6px] text-gray-500 hover:text-[#00b4b6] hover:border-[#00b4b6] transition-colors flex items-center justify-center"
                          @click.stop="toggleTwinWorkgroupDropdown"
                        >
                          <ArrowsRightLeftIcon class="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <Teleport to="body">
                      <div
                        v-show="twinWorkgroupDropdownOpen"
                        ref="twinWorkgroupDropdownPanelRef"
                        class="fixed w-44 bg-white border border-gray-100 rounded-[8px] shadow-xl overflow-hidden py-1 z-[600]"
                        :style="twinWorkgroupDropdownStyle"
                      >
                        <button
                          v-for="wg in twinWorkgroups"
                          :key="wg.id"
                          type="button"
                          class="w-full text-left px-3 py-2 text-sm transition-colors"
                          :class="
                            activeTwinWorkgroupId === wg.id
                              ? 'bg-[#e6f7f8] text-[#00b4b6]'
                              : 'text-gray-600 hover:bg-[#f5f7fa] hover:text-[#00b4b6]'
                          "
                          @click="selectTwinWorkgroup(wg.id)"
                        >
                          {{ wg.name }}
                        </button>
                        <template v-if="canAddTwinWorkgroup">
                          <div class="h-px bg-gray-100 my-1" />
                          <button
                            type="button"
                            class="w-full text-left px-3 py-2 text-sm text-[#00b4b6] hover:bg-[#f5f7fa] transition-colors flex items-center gap-1"
                            @click="openAddTwinWorkgroupModal"
                          >
                            <PlusIcon class="w-3.5 h-3.5" />
                            <span>添加工作组</span>
                          </button>
                        </template>
                      </div>
                    </Teleport>

                    <NuxtLink
                      :to="twinSceneCasesRoute(activeTwinWorkgroupId)"
                      class="block py-2.5 pr-2 rounded-[6px] transition-colors"
                      :class="
                        isTwinSceneLinkActive(twinSceneCasesRoute(activeTwinWorkgroupId))
                          ? 'bg-[#e6f7f8]'
                          : 'hover:bg-[#f5f7fa]'
                      "
                      @click="isOpenMobile = false"
                    >
                      <div class="flex items-center pl-6">
                        <div
                          class="w-3 h-0.5 rounded-r flex-shrink-0 mr-2"
                          :class="
                            isTwinSceneLinkActive(twinSceneCasesRoute(activeTwinWorkgroupId))
                              ? 'bg-[#00b4b6]'
                              : 'bg-gray-300'
                          "
                        />
                        <span
                          class="text-sm transition-colors"
                          :class="
                            isTwinSceneLinkActive(twinSceneCasesRoute(activeTwinWorkgroupId))
                              ? 'text-[#00b4b6] font-medium'
                              : 'text-gray-500 hover:text-[#00b4b6]'
                          "
                        >
                          团队案例
                        </span>
                      </div>
                    </NuxtLink>
                    <NuxtLink
                      :to="twinSceneMembersRoute(activeTwinWorkgroupId)"
                      class="block py-2.5 pr-2 rounded-[6px] transition-colors"
                      :class="
                        isTwinSceneLinkActive(twinSceneMembersRoute(activeTwinWorkgroupId))
                          ? 'bg-[#e6f7f8]'
                          : 'hover:bg-[#f5f7fa]'
                      "
                      @click="isOpenMobile = false"
                    >
                      <div class="flex items-center pl-6">
                        <div
                          class="w-3 h-0.5 rounded-r flex-shrink-0 mr-2"
                          :class="
                            isTwinSceneLinkActive(
                              twinSceneMembersRoute(activeTwinWorkgroupId)
                            )
                              ? 'bg-[#00b4b6]'
                              : 'bg-gray-300'
                          "
                        />
                        <span
                          class="text-sm transition-colors"
                          :class="
                            isTwinSceneLinkActive(
                              twinSceneMembersRoute(activeTwinWorkgroupId)
                            )
                              ? 'text-[#00b4b6] font-medium'
                              : 'text-gray-500 hover:text-[#00b4b6]'
                          "
                        >
                          团队管理
                        </span>
                      </div>
                    </NuxtLink>
                    <NuxtLink
                      :to="twinSceneSettingsRoute(activeTwinWorkgroupId)"
                      class="block py-2.5 pr-2 rounded-[6px] transition-colors"
                      :class="
                        isTwinSceneLinkActive(twinSceneSettingsRoute(activeTwinWorkgroupId))
                          ? 'bg-[#e6f7f8]'
                          : 'hover:bg-[#f5f7fa]'
                      "
                      @click="isOpenMobile = false"
                    >
                      <div class="flex items-center pl-6">
                        <div
                          class="w-3 h-0.5 rounded-r flex-shrink-0 mr-2"
                          :class="
                            isTwinSceneLinkActive(
                              twinSceneSettingsRoute(activeTwinWorkgroupId)
                            )
                              ? 'bg-[#00b4b6]'
                              : 'bg-gray-300'
                          "
                        />
                        <span
                          class="text-sm transition-colors"
                          :class="
                            isTwinSceneLinkActive(
                              twinSceneSettingsRoute(activeTwinWorkgroupId)
                            )
                              ? 'text-[#00b4b6] font-medium'
                              : 'text-gray-500 hover:text-[#00b4b6]'
                          "
                        >
                          系统管理
                        </span>
                      </div>
                    </NuxtLink>
                  </div>
                </div>

                <!-- 模型管理（带子菜单） -->
                <div v-if="showWorkspaceLinks && hasMenu('/models')" class="relative">
                  <button
                    class="w-full text-left px-2.5 py-3.5 mb-2 rounded-[8px] flex items-center transition-colors"
                    :class="[
                      isActive(modelsRoute) ||
                      isActive(lightModelsRoute) ||
                      isActive(twinModelsRoute)
                        ? 'bg-[#e6f7f8] text-[#00b4b6]'
                        : 'text-[#666] hover:bg-[#f5f7fa] hover:text-[#00b4b6]'
                    ]"
                    @click="toggleModelMenu"
                  >
                    <IconBox
                      class="size-6 flex-shrink-0 mr-2.5 pl-2"
                      :class="
                        isActive(modelsRoute) ||
                        isActive(lightModelsRoute) ||
                        isActive(twinModelsRoute)
                          ? 'text-[#00b4b6]'
                          : 'text-gray-400'
                      "
                    />
                    <span class="flex-1 text-sm font-medium">模型管理</span>
                    <ChevronRightIcon
                      class="size-4 flex-shrink-0 transition-transform duration-200 ease-in-out"
                      :class="
                        showModelMenu ? 'rotate-90 text-[#00b4b6]' : 'text-gray-400'
                      "
                    />
                  </button>

                  <!-- 子菜单 -->
                  <div
                    v-show="showModelMenu"
                    class="ml-6 mt-1 mb-1 space-y-1 border-l-2 border-gray-200 overflow-hidden transition-all duration-300 ease-in-out"
                  >
                    <NuxtLink
                      to="/models/light"
                      class="block py-2 pr-2 rounded-[6px] transition-colors"
                      :class="
                        isActive(lightModelsRoute)
                          ? 'bg-[#e6f7f8]'
                          : 'hover:bg-[#f5f7fa]'
                      "
                      @click="isOpenMobile = false"
                    >
                      <div class="flex items-center pl-3.5">
                        <div
                          class="w-3 h-0.5 rounded-r flex-shrink-0 mr-2"
                          :class="
                            isActive(lightModelsRoute) ? 'bg-[#00b4b6]' : 'bg-gray-300'
                          "
                        />
                        <span
                          class="text-sm transition-colors"
                          :class="
                            isActive(lightModelsRoute)
                              ? 'text-[#00b4b6] font-medium'
                              : 'text-gray-500 hover:text-[#00b4b6]'
                          "
                        >
                          轻量模型
                        </span>
                      </div>
                    </NuxtLink>
                    <NuxtLink
                      to="/models/twin"
                      class="block py-2 pr-2 rounded-[6px] transition-colors"
                      :class="
                        isActive(twinModelsRoute)
                          ? 'bg-[#e6f7f8]'
                          : 'hover:bg-[#f5f7fa]'
                      "
                      @click="isOpenMobile = false"
                    >
                      <div class="flex items-center pl-3.5">
                        <div
                          class="w-3 h-0.5 rounded-r flex-shrink-0 mr-2"
                          :class="
                            isActive(twinModelsRoute) ? 'bg-[#00b4b6]' : 'bg-gray-300'
                          "
                        />
                        <span
                          class="text-sm transition-colors"
                          :class="
                            isActive(twinModelsRoute)
                              ? 'text-[#00b4b6] font-medium'
                              : 'text-gray-500 hover:text-[#00b4b6]'
                          "
                        >
                          孪生模型
                        </span>
                      </div>
                    </NuxtLink>
                  </div>
                </div>

                <!-- <NuxtLink
                  v-if="showWorkspaceLinks"
                  to="/progress"
                  @click="isOpenMobile = false"
                >
                  <LayoutSidebarMenuGroupItem
                    :class="[
                      'py-2.5 mb-1 rounded-[8px]',
                      isActive(progressRoute) &&
                        'bg-[#e6f7f8] hover:!bg-[#e6f7f8] text-[#00b4b6]',
                      !isActive(progressRoute) &&
                        'text-[#666] hover:bg-[#f5f7fa] hover:text-[#00b4b6]'
                    ]"
                    label="进度管理"
                  >
                    <template #icon>
                      <IconProcess
                        class="size-4"
                        :class="isActive(progressRoute) ? 'text-[#00b4b6]' : 'text-gray-400'"
                      />
                    </template>
                  </LayoutSidebarMenuGroupItem>
                </NuxtLink> -->

                <!-- <NuxtLink
                  v-if="showWorkspaceLinks"
                  to="/quality-acceptance"
                  @click="isOpenMobile = false"
                >
                  <LayoutSidebarMenuGroupItem
                    :class="[
                      'py-2.5 mb-1 rounded-[8px]',
                      isActive(qualityAcceptanceRoute) &&
                        'bg-[#e6f7f8] hover:!bg-[#e6f7f8] text-[#00b4b6]',
                      !isActive(qualityAcceptanceRoute) &&
                        'text-[#666] hover:bg-[#f5f7fa] hover:text-[#00b4b6]'
                    ]"
                    label="质量验收"
                  >
                    <template #icon>
                      <IconCircleCheck
                        class="size-4"
                        :class="
                          isActive(qualityAcceptanceRoute)
                            ? 'text-[#00b4b6]'
                            : 'text-gray-400'
                        "
                      />
                    </template>
                  </LayoutSidebarMenuGroupItem>
                </NuxtLink> -->

                <!-- <NuxtLink
                  v-if="showWorkspaceLinks"
                  to="/work-valuation"
                  @click="isOpenMobile = false"
                >
                  <LayoutSidebarMenuGroupItem
                    :class="[
                      'py-2.5 mb-1 rounded-[8px]',
                      isActive(workValuationRoute) &&
                        'bg-[#e6f7f8] hover:!bg-[#e6f7f8] text-[#00b4b6]',
                      !isActive(workValuationRoute) &&
                        'text-[#666] hover:bg-[#f5f7fa] hover:text-[#00b4b6]'
                    ]"
                    label="验工计价"
                  >
                    <template #icon>
                      <IconCalculator
                        class="size-4"
                        :class="
                          isActive(workValuationRoute)
                            ? 'text-[#00b4b6]'
                            : 'text-gray-400'
                        "
                      />
                    </template>
                  </LayoutSidebarMenuGroupItem>
                </NuxtLink> -->

                <!-- <NuxtLink
                  v-if="showWorkspaceLinks"
                  to="/archives"
                  @click="isOpenMobile = false"
                >
                  <LayoutSidebarMenuGroupItem
                    :class="[
                      'py-2.5 mb-1 rounded-[8px]',
                      isActive(archivesRoute) &&
                        'bg-[#e6f7f8] hover:!bg-[#e6f7f8] text-[#00b4b6]',
                      !isActive(archivesRoute) &&
                        'text-[#666] hover:bg-[#f5f7fa] hover:text-[#00b4b6]'
                    ]"
                    label="档案管理"
                  >
                    <template #icon>
                      <IconFile
                        class="size-4"
                        :class="isActive(archivesRoute) ? 'text-[#00b4b6]' : 'text-gray-400'"
                      />
                    </template>
                  </LayoutSidebarMenuGroupItem>
                </NuxtLink> -->

                <NuxtLink
                  v-if="showWorkspaceLinks && hasMenu('/organization')"
                  to="/organization"
                  @click="isOpenMobile = false"
                >
                  <LayoutSidebarMenuGroupItem
                    :class="[
                      'py-3.5 mb-2 rounded-[8px] font-medium text-sm text-[#666] pl-3',
                      isActive(organizationRoute) &&
                        'bg-[#e6f7f8] hover:!bg-[#e6f7f8] text-[#00b4b6]',
                      !isActive(organizationRoute) &&
                        'hover:bg-[#f5f7fa] hover:text-[#00b4b6]'
                    ]"
                    label="组织管理"
                  >
                    <template #icon>
                      <IconUsers
                        class="size-6 pl-2"
                        :class="
                          isActive(organizationRoute)
                            ? 'text-[#00b4b6]'
                            : 'text-gray-400'
                        "
                      />
                    </template>
                  </LayoutSidebarMenuGroupItem>
                </NuxtLink>

                <NuxtLink
                  v-if="showWorkspaceLinks && hasMenu('/permissions')"
                  to="/permissions"
                  @click="isOpenMobile = false"
                >
                  <LayoutSidebarMenuGroupItem
                    :class="[
                      'py-3.5 mb-2 rounded-[8px] font-medium text-sm text-[#666] pl-3',
                      isActive(permissionsRoute) &&
                        'bg-[#e6f7f8] hover:!bg-[#e6f7f8] text-[#00b4b6]',
                      !isActive(permissionsRoute) &&
                        'hover:bg-[#f5f7fa] hover:text-[#00b4b6]'
                    ]"
                    label="权限管理"
                  >
                    <template #icon>
                      <IconShield
                        class="size-6 pl-2"
                        :class="
                          isActive(permissionsRoute)
                            ? 'text-[#00b4b6]'
                            : 'text-gray-400'
                        "
                      />
                    </template>
                  </LayoutSidebarMenuGroupItem>
                </NuxtLink>

                <NuxtLink
                  v-if="showWorkspaceLinks && hasMenu('/logs')"
                  to="/logs"
                  @click="isOpenMobile = false"
                >
                  <LayoutSidebarMenuGroupItem
                    :class="[
                      'py-3.5 mb-2 rounded-[8px] font-medium text-sm text-[#666] pl-3',
                      isActive(logsRoute) &&
                        'bg-[#e6f7f8] hover:!bg-[#e6f7f8] text-[#00b4b6]',
                      !isActive(logsRoute) && 'hover:bg-[#f5f7fa] hover:text-[#00b4b6]'
                    ]"
                    label="日志管理"
                  >
                    <template #icon>
                      <IconClipboard
                        class="size-6 pl-2"
                        :class="
                          isActive(logsRoute) ? 'text-[#00b4b6]' : 'text-gray-400'
                        "
                      />
                    </template>
                  </LayoutSidebarMenuGroupItem>
                </NuxtLink>
                <!-- <NuxtLink
                  v-if="showWorkspaceLinks && canListDashboards"
                  :to="dashboardsRoute(activeWorkspaceSlug)"
                  @click="isOpenMobile = false"
                >
                  <LayoutSidebarMenuGroupItem
                    label="Intelligence"
                    :active="isActive(dashboardsRoute(activeWorkspaceSlug))"
                  >
                    <template #icon>
                      <LayoutDashboard class="size-4 text-foreground-2" />
                    </template>
                  </LayoutSidebarMenuGroupItem>
                </NuxtLink> -->

                <!-- <NuxtLink :to="connectorsRoute" @click="isOpenMobile = false">
                  <LayoutSidebarMenuGroupItem
                    label="Connectors"
                    :active="isActive(connectorsRoute)"
                  >
                    <template #icon>
                      <IconConnectors class="size-4 text-foreground-2" />
                    </template>
                  </LayoutSidebarMenuGroupItem>
                </NuxtLink> -->
              </LayoutSidebarMenuGroup>

              <!-- <LayoutSidebarMenuGroup title="资源" collapsible>
                <LayoutSidebarMenuGroupItem
                  v-if="isWorkspacesEnabled"
                  label="给我们反馈"
                  @click="openChat"
                >
                  <template #icon>
                    <IconFeedback class="size-4 text-foreground-2" />
                  </template>
                </LayoutSidebarMenuGroupItem>

                <NuxtLink :to="tutorialsRoute" @click="isOpenMobile = false">
                  <LayoutSidebarMenuGroupItem
                    label="教程"
                    :active="isActive(tutorialsRoute)"
                  >
                    <template #icon>
                      <IconTutorials class="size-4 text-foreground-2" />
                    </template>
                  </LayoutSidebarMenuGroupItem>
                </NuxtLink>

                <NuxtLink
                  to="https://speckle.community/"
                  target="_blank"
                  @click="isOpenMobile = false"
                >
                  <LayoutSidebarMenuGroupItem label="社区论坛" external>
                    <template #icon>
                      <IconCommunity class="size-4 text-foreground-2" />
                    </template>
                  </LayoutSidebarMenuGroupItem>
                </NuxtLink>

                <NuxtLink
                  :to="docsPageUrl"
                  target="_blank"
                  @click="isOpenMobile = false"
                >
                  <LayoutSidebarMenuGroupItem label="文档" external>
                    <template #icon>
                      <IconDocumentation class="size-4 text-foreground-2" />
                    </template>
                  </LayoutSidebarMenuGroupItem>
                </NuxtLink>

                <NuxtLink
                  to="/updates"
                  target="_blank"
                  @click="isOpenMobile = false"
                >
                  <LayoutSidebarMenuGroupItem label="更新日志" external>
                    <template #icon>
                      <IconChangelog class="size-4 text-foreground-2" />
                    </template>
                  </LayoutSidebarMenuGroupItem>
                </NuxtLink>

                <div v-if="isWorkspacesEnabled">
                  <LayoutSidebarMenuGroupItem
                    label="入门指南"
                    @click="openExplainerVideoDialog"
                  >
                    <template #icon>
                      <IconPlay class="size-4 text-foreground-2" />
                    </template>
                  </LayoutSidebarMenuGroupItem>
                  <WorkspaceExplainerVideoDialog
                    v-model:open="showExplainerVideoDialog"
                  />
                </div>
              </LayoutSidebarMenuGroup> -->
            </div>
          </LayoutSidebarMenu>
          <template v-if="showSpeckleCon25Promo" #promo>
            <DashboardSpeckleConPromo />
          </template>
        </LayoutSidebar>

        <LayoutDialog
          v-model:open="addTwinWorkgroupOpen"
          max-width="sm"
          title="创建组"
        >
          <div class="space-y-6 pt-2">
            <div class="flex items-center gap-4">
              <label class="w-16 shrink-0 text-sm text-gray-500">组名称</label>
              <div class="flex-1 relative">
                <input
                  v-model="newTwinWorkgroupName"
                  type="text"
                  maxlength="10"
                  placeholder="请输入组名称"
                  class="w-full bg-gray-50 border border-transparent rounded-[8px] p-2.5 pr-14 text-sm text-[#333] focus:outline-none focus:ring-0 focus:border-[#00b4b6] focus:bg-white"
                  @keydown.enter.prevent="confirmAddTwinWorkgroup"
                />
                <span
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none"
                >
                  {{ newTwinWorkgroupName.length }} / 10
                </span>
              </div>
            </div>
            <div class="mt-8 flex justify-end gap-3">
              <button
                type="button"
                class="px-6 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-[8px] hover:bg-gray-50 transition-colors"
                @click="addTwinWorkgroupOpen = false"
              >
                取消
              </button>
              <button
                type="button"
                class="px-8 py-2 bg-[#00b4b6] text-white rounded-[8px] text-sm font-medium hover:bg-[#009fa1] transition-colors"
                @click="confirmAddTwinWorkgroup"
              >
                确定
              </button>
            </div>
          </div>
        </LayoutDialog>
      </div>
    </template>
  </div>
</template>
<script setup lang="ts">
import {
  FormButton,
  LayoutDialog,
  LayoutSidebar,
  LayoutSidebarMenu,
  LayoutSidebarMenuGroup,
  LayoutSidebarMenuGroupItem
} from '@speckle/ui-components'
import {
  projectsRoute,
  modelsRoute,
  lightModelsRoute,
  twinModelsRoute,
  twinSceneCasesRoute,
  twinSceneMembersRoute,
  twinSceneSettingsRoute,
  workspaceRoute,
  workbenchRoute,
  progressRoute,
  qualityAcceptanceRoute,
  workValuationRoute,
  archivesRoute,
  organizationRoute,
  permissionsRoute,
  logsRoute
} from '~/lib/common/helpers/route'
import {
  ArrowsRightLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  Squares2X2Icon
} from '@heroicons/vue/24/outline'
import { onClickOutside, useEventListener } from '@vueuse/core'
import { useRoute } from 'vue-router'
import { useActiveUser } from '~~/lib/auth/composables/activeUser'
import { useUserPermissions } from '~~/lib/auth/composables/userPermissions'
import { useMixpanel } from '~~/lib/core/composables/mp'
import { useActiveWorkspaceSlug } from '~/lib/user/composables/activeWorkspace'
import { graphql } from '~/lib/common/generated/gql'
import { useQuery } from '@vue/apollo-composable'
import dayjs from 'dayjs'
import { useActiveUserMeta } from '~/lib/user/composables/meta'

const dashboardSidebarQuery = graphql(`
  query DashboardSidebar {
    activeUser {
      id
      activeWorkspace {
        id
        role
      }
    }
  }
`)

const sidebarPermissionsQuery = graphql(`
  query SidebarPermissions($slug: String!) {
    workspaceBySlug(slug: $slug) {
      permissions {
        canListDashboards {
          ...FullPermissionCheckResult
        }
      }
    }
  }
`)

const { isLoggedIn } = useActiveUser()
const { activeUser } = useActiveUser()
const { ensureLoaded: ensureUserPermsLoaded, hasMenu } = useUserPermissions()

// 判断当前用户是否有权限添加工作组（只有手机号为17338404660的用户可以看到）
const canAddTwinWorkgroup = computed(() => {
  return activeUser.value?.email === '17338404660'
})
// First-load user perms when sidebar renders (SSR + CSR), so menus are gated
// from the first paint. A no-op if already cached in the shared useState.
if (import.meta.server) {
  await ensureUserPermsLoaded()
} else {
  void ensureUserPermsLoaded()
}
const isWorkspacesEnabled = useIsWorkspacesEnabled()
const isDashboardsEnabled = useIsDashboardsModuleEnabled()
const route = useRoute()
const activeWorkspaceSlug = useActiveWorkspaceSlug()
const { $intercom } = useNuxtApp()
const mixpanel = useMixpanel()
const { result: permissionsResult } = useQuery(
  sidebarPermissionsQuery,
  () => ({
    slug: activeWorkspaceSlug.value || ''
  }),
  () => ({
    enabled: isDashboardsEnabled.value && !!activeWorkspaceSlug.value
  })
)
const { result } = useQuery(dashboardSidebarQuery, () => ({}), {
  enabled: isWorkspacesEnabled.value
})
const { hasDismissedSpeckleCon25Banner } = useActiveUserMeta()

const isOpenMobile = ref(false)
const showExplainerVideoDialog = ref(false)

// 子菜单展开状态（null表示自动模式，true/false表示手动控制）
const isModelMenuExpanded = ref<boolean | null>(null)
const isTwinSceneMenuExpanded = ref<boolean | null>(null)

// 子菜单展开状态：优先根据用户手动控制，否则根据路由自动判断
const showModelMenu = computed(() => {
  // 如果用户手动设置了展开状态，使用手动设置的值
  if (isModelMenuExpanded.value !== null) {
    return isModelMenuExpanded.value
  }
  // 否则根据路由自动判断
  return isActive(lightModelsRoute) || isActive(twinModelsRoute)
})

const showTwinSceneMenu = computed(() => {
  if (isTwinSceneMenuExpanded.value !== null) {
    return isTwinSceneMenuExpanded.value
  }
  return route.path.startsWith('/twin-scene')
})

const isTwinSceneSectionActive = computed(() => route.path.startsWith('/twin-scene'))

type TwinWorkgroup = { id: string; name: string }

const twinWorkgroups = useState<TwinWorkgroup[]>('twinSceneWorkgroups', () => [])

const activeTwinWorkgroupId = useState<string>(
  'twinSceneActiveWorkgroupId',
  () => ''
)

// 获取工作组列表
const fetchWorkgroupList = async () => {
  try {
    const { $dtpFetch } = useNuxtApp()
    const data = await $dtpFetch('/v1/team/unit/list', {
      method: 'GET'
    })
    
    const responseData = data as any
    if (responseData && responseData.success && responseData.results && Array.isArray(responseData.results)) {
      // 将接口返回的数据转换为 TwinWorkgroup 格式
      const workgroups: TwinWorkgroup[] = []
      
      for (const unit of responseData.results) {
        // 过滤掉 unitType 为 Personal 的个人组织
        if (unit.unitType === 'Personal') continue
        if (unit.teamList && Array.isArray(unit.teamList)) {
          for (const team of unit.teamList) {
            workgroups.push({
              id: team.teamId,
              name: team.name
            })
          }
        }
      }
      
      twinWorkgroups.value = workgroups
    }
  } catch (error) {
    console.error('获取工作组列表失败:', error)
  }
}

// 获取当前工作组信息
const fetchCurrentWorkgroupInfo = async () => {
  try {
    const { $dtpFetch } = useNuxtApp()
    const data = await $dtpFetch('/v1/team/workingTeam/info', {
      method: 'GET'
    })
    
    const responseData = data as any
    if (responseData && responseData.success && responseData.results) {
      const { teamId, teamName, unitType } = responseData.results
      
      // 如果当前工作组属于个人组织，自动切换到非个人组织的第一个工作组
      if (unitType === 'Personal') {
        try {
          const listData = await $dtpFetch('/v1/team/unit/list', {
            method: 'GET'
          })
          const listResp = listData as any
          if (listResp && listResp.success && Array.isArray(listResp.results)) {
            const nonPersonalUnit = listResp.results.find(
              (u: any) =>
                u &&
                u.unitType !== 'Personal' &&
                Array.isArray(u.teamList) &&
                u.teamList.length > 0
            )
            const firstTeamId = nonPersonalUnit?.teamList?.[0]?.teamId
            if (firstTeamId) {
              await $dtpFetch('/v1/team/switch', {
                method: 'PUT',
                body: { teamId: firstTeamId }
              })
              activeTwinWorkgroupId.value = firstTeamId
              // 切换后刷新工作组列表
              await fetchWorkgroupList()
              return
            }
          }
        } catch (switchError) {
          console.error('自动切换工作组失败:', switchError)
        }
      }
      
      // 设置当前工作组
      if (teamId) {
        activeTwinWorkgroupId.value = teamId
      }
    }
  } catch (error) {
    console.error('获取当前工作组信息失败:', error)
  }
}

// 确保本地存在 dtp-token，没有则通过第三方登录接口获取
const ensureDtpToken = async (): Promise<string | null> => {
  const { ensureDtpToken: ensureToken } = useDtpModelUpload()
  return await ensureToken()
}

const routeTwinWorkgroupId = computed(() => {
  const m = route.path.match(/^\/twin-scene\/([^/]+)/)
  return m?.[1] ?? null
})

watch(
  routeTwinWorkgroupId,
  (id) => {
    if (id && twinWorkgroups.value.some((w) => w.id === id)) {
      activeTwinWorkgroupId.value = id
    }
  },
  { immediate: true }
)

const activeTwinWorkgroupLabel = computed(() => {
  return (
    twinWorkgroups.value.find((w) => w.id === activeTwinWorkgroupId.value)?.name ??
    '孪生工作组'
  )
})

const twinWorkgroupDropdownRef = ref<HTMLElement | null>(null)
const twinWorkgroupDropdownPanelRef = ref<HTMLElement | null>(null)
const twinWorkgroupDropdownOpen = ref(false)
const twinWorkgroupDropdownStyle = ref<Record<string, string>>({
  top: '0px',
  left: '0px'
})
const TWIN_WG_DROPDOWN_W_PX = 176

const updateTwinWorkgroupDropdownPosition = () => {
  const el = twinWorkgroupDropdownRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  twinWorkgroupDropdownStyle.value = {
    top: `${rect.bottom + 4}px`,
    left: `${rect.right - TWIN_WG_DROPDOWN_W_PX}px`
  }
}

onClickOutside(
  twinWorkgroupDropdownRef,
  () => {
    twinWorkgroupDropdownOpen.value = false
  },
  { ignore: [twinWorkgroupDropdownPanelRef] }
)

if (import.meta.client) {
  useEventListener(
    document,
    'scroll',
    () => {
      if (twinWorkgroupDropdownOpen.value) updateTwinWorkgroupDropdownPosition()
    },
    { capture: true }
  )
  useEventListener(window, 'resize', () => {
    if (twinWorkgroupDropdownOpen.value) updateTwinWorkgroupDropdownPosition()
  })
}

const addTwinWorkgroupOpen = ref(false)
const newTwinWorkgroupName = ref('')

const toggleTwinWorkgroupDropdown = async () => {
  twinWorkgroupDropdownOpen.value = !twinWorkgroupDropdownOpen.value
  if (twinWorkgroupDropdownOpen.value) {
    // 每次点击切换工作组时，刷新工作组列表
    void fetchWorkgroupList()
    await nextTick()
    updateTwinWorkgroupDropdownPosition()
  }
}

const selectTwinWorkgroup = async (wgId: string) => {
  try {
    const { $dtpFetch } = useNuxtApp()
    
    // 调用切换工作组接口
    await $dtpFetch('/v1/team/switch', {
      method: 'PUT',
      body: {
        teamId: wgId
      }
    })
    
    // 切换成功后更新本地状态
    activeTwinWorkgroupId.value = wgId
    twinWorkgroupDropdownOpen.value = false
    
    // 获取当前工作组信息
    await fetchCurrentWorkgroupInfo()
    
    // 更新路由
    const sub = route.path.match(/\/twin-scene\/[^/]+\/(cases|members|settings)/)
    if (sub?.[1]) {
      void navigateTo(`/twin-scene/${wgId}/${sub[1]}`)
    } else if (route.path.startsWith('/twin-scene')) {
      void navigateTo(twinSceneCasesRoute(wgId))
    }
  } catch (error) {
    console.error('切换工作组失败:', error)
    // 可选：显示错误提示
  }
}

const openAddTwinWorkgroupModal = () => {
  twinWorkgroupDropdownOpen.value = false
  newTwinWorkgroupName.value = ''
  addTwinWorkgroupOpen.value = true
}

const confirmAddTwinWorkgroup = async () => {
  const name = newTwinWorkgroupName.value.trim().slice(0, 10)
  if (!name) return
  
  try {
    const { $dtpFetch } = useNuxtApp()
    
    // 调用创建组接口
    const data = await $dtpFetch('/v1/team/create', {
      method: 'POST',
      body: {
        teamName: name
      }
    })
    
    const responseData = data as any
    if (responseData && responseData.success && responseData.results) {
      // 从返回结果中获取 teamId
      const teamId = responseData.results.teamId
      
      // 重新获取工作组列表
      await fetchWorkgroupList()
      
      // 设置新创建的组为当前组
      if (teamId) {
        activeTwinWorkgroupId.value = teamId
      }
      
      addTwinWorkgroupOpen.value = false
      
      // 跳转到新组的页面
      if (teamId) {
        void navigateTo(twinSceneCasesRoute(teamId))
      }
    }
  } catch (error) {
    console.error('创建工作组失败:', error)
    // 可选：显示错误提示
  }
}

const isTwinSceneLinkActive = (path: string) => route.path === path

// 点击模型管理按钮时切换展开状态
const toggleModelMenu = () => {
  isModelMenuExpanded.value = !showModelMenu.value
}

// 点击3D孪生场景编辑按钮时切换展开状态
const toggleTwinSceneMenu = () => {
  isTwinSceneMenuExpanded.value = !showTwinSceneMenu.value
}

// 监听路由变化，当导航时重置手动展开状态为 null（自动模式）
watch(
  () => route.path,
  () => {
    isModelMenuExpanded.value = null
    isTwinSceneMenuExpanded.value = null
  }
)

// 每次展示 3D 孪生场景编辑（菜单展开）时，获取当前工作组信息
watch(
  showTwinSceneMenu,
  async (val) => {
    if (!val) return
    if (!import.meta.client) return
    // 若本地没有 dtp-token，则先调用第三方登录接口获取
    await ensureDtpToken()
    void fetchCurrentWorkgroupInfo()
  },
  { immediate: true }
)

// 组件挂载时获取工作组列表
if (import.meta.client) {
  onMounted(async () => {
    await fetchWorkgroupList()
  })
}

const showSpeckleCon25Promo = computed(() => {
  if (hasDismissedSpeckleCon25Banner.value) return false
  return dayjs().isBefore('2025-11-07', 'day')
})
const activeWorkspace = computed(() => result.value?.activeUser?.activeWorkspace)
const canListDashboards = computed(() => {
  return permissionsResult.value?.workspaceBySlug?.permissions?.canListDashboards
    ?.authorized
})

const showWorkspaceLinks = computed(() => {
  return isWorkspacesEnabled.value
    ? activeWorkspace.value
      ? !!activeWorkspace.value?.role
      : true
    : isLoggedIn.value
})

const projectsLink = computed(() => {
  return isWorkspacesEnabled.value
    ? activeWorkspaceSlug.value
      ? workspaceRoute(activeWorkspaceSlug.value)
      : projectsRoute
    : projectsRoute
})

const workbenchLink = computed(() => {
  return isWorkspacesEnabled.value ? activeWorkspaceSlug.value : workbenchRoute
})

const openChat = () => {
  $intercom.show()
  isOpenMobile.value = false
}

const openExplainerVideoDialog = () => {
  showExplainerVideoDialog.value = true
  isOpenMobile.value = false
  mixpanel.track('Getting Started Video Opened', {
    location: 'sidebar'
  })
}

const isActive = (...routes: string[]): boolean => {
  return routes.some((routeTo) => route.path === routeTo)
}
</script>

<style scoped>
.sidebar-shell {
  background: #e7ebeb;
}

.layout-sidebar-bg {
  opacity: 0.5;
  background-image: url('https://i.imgur.com/MLqoJhx.png');
  background-size: cover;
  background-position: bottom;
  background-repeat: no-repeat;
}

/* 强制覆盖侧边栏菜单项label的默认字体颜色 */
/* 默认颜色为灰色 */
:deep(.group\/item span.truncate) {
  color: #666 !important;
  transition: color 0.2s ease;
}

/* 悬停时变为主题色 */
:deep(.group\/item:hover span.truncate) {
  color: #00b4b6 !important;
}

/* 选中状态（当父元素有 bg-[#e6f7f8] 时）保持主题色 */
:deep(.group\/item[class*='bg-[#e6f7f8]'] span.truncate) {
  color: #00b4b6 !important;
}

/* 选中状态（当父元素使用自定义选中背景 bg-[#e6f7f8] 时）也保持主题色 */
:deep(.group\/item[class*='bg-[#e6f7f8]'] span.truncate) {
  color: #00b4b6 !important;
}
</style>
