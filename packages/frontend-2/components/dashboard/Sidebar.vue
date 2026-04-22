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
                  v-if="showWorkspaceLinks"
                  :to="projectsLink"
                  @click="isOpenMobile = false"
                >
                  <LayoutSidebarMenuGroupItem
                    :class="[
                      'py-3.5 mb-2 rounded-[8px] font-medium text-sm text-[#666] pl-3',
                      isActive(projectsRoute) &&
                        'bg-[#e6f7f8] hover:!bg-[#e6f7f8] text-[#00b4b6]',
                      !isActive(projectsRoute) &&
                        'hover:bg-[#f5f7fa] hover:text-[#00b4b6]'
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

                <!-- 3D孪生场景编辑（带子菜单）- 暂时隐藏 -->
                <div v-if="false && showWorkspaceLinks" class="relative">
                  <button
                    class="w-full text-left px-2.5 py-3.5 mb-2 rounded-[8px] flex items-center transition-colors"
                    :class="[
                      isActive(twinSceneRoute) ||
                      isActive(twinSceneCasesRoute()) ||
                      isActive(twinSceneMembersRoute()) ||
                      isActive(twinSceneSettingsRoute())
                        ? 'bg-[#e6f7f8] text-[#00b4b6]'
                        : 'text-[#666] hover:bg-[#f5f7fa] hover:text-[#00b4b6]'
                    ]"
                    @click="toggleTwinSceneMenu"
                  >
                    <Squares2X2Icon
                      class="size-4 flex-shrink-0 mr-2.5"
                      :class="
                        isActive(twinSceneRoute) ||
                        isActive(twinSceneCasesRoute()) ||
                        isActive(twinSceneMembersRoute()) ||
                        isActive(twinSceneSettingsRoute())
                          ? 'text-[#00b4b6]'
                          : 'text-gray-400'
                      "
                    />
                    <span class="flex-1 text-sm font-medium">3D孪生场景编辑</span>
                    <ChevronRightIcon
                      class="size-4 flex-shrink-0 transition-transform duration-200 ease-in-out"
                      :class="
                        showTwinSceneMenu ? 'rotate-90 text-[#00b4b6]' : 'text-gray-400'
                      "
                    />
                  </button>

                  <!-- 子菜单 -->
                  <div
                    v-show="showTwinSceneMenu"
                    class="ml-6 mt-1 mb-1 space-y-1 border-l-2 border-gray-200 overflow-hidden transition-all duration-300 ease-in-out"
                  >
                    <NuxtLink
                      :to="twinSceneCasesRoute()"
                      class="block py-2 pr-2 rounded-[6px] transition-colors"
                      :class="
                        isActive(twinSceneCasesRoute())
                          ? 'bg-[#e6f7f8]'
                          : 'hover:bg-[#f5f7fa]'
                      "
                      @click="isOpenMobile = false"
                    >
                      <div class="flex items-center pl-3.5">
                        <div
                          class="w-3 h-0.5 rounded-r flex-shrink-0 mr-2"
                          :class="
                            isActive(twinSceneCasesRoute())
                              ? 'bg-[#00b4b6]'
                              : 'bg-gray-300'
                          "
                        />
                        <span
                          class="text-sm transition-colors"
                          :class="
                            isActive(twinSceneCasesRoute())
                              ? 'text-[#00b4b6] font-medium'
                              : 'text-gray-500 hover:text-[#00b4b6]'
                          "
                        >
                          组内案例
                        </span>
                      </div>
                    </NuxtLink>
                    <NuxtLink
                      :to="twinSceneMembersRoute()"
                      class="block py-2 pr-2 rounded-[6px] transition-colors"
                      :class="
                        isActive(twinSceneMembersRoute())
                          ? 'bg-[#e6f7f8]'
                          : 'hover:bg-[#f5f7fa]'
                      "
                      @click="isOpenMobile = false"
                    >
                      <div class="flex items-center pl-3.5">
                        <div
                          class="w-3 h-0.5 rounded-r flex-shrink-0 mr-2"
                          :class="
                            isActive(twinSceneMembersRoute())
                              ? 'bg-[#00b4b6]'
                              : 'bg-gray-300'
                          "
                        />
                        <span
                          class="text-sm transition-colors"
                          :class="
                            isActive(twinSceneMembersRoute())
                              ? 'text-[#00b4b6] font-medium'
                              : 'text-gray-500 hover:text-[#00b4b6]'
                          "
                        >
                          组员管理
                        </span>
                      </div>
                    </NuxtLink>
                    <NuxtLink
                      :to="twinSceneSettingsRoute()"
                      class="block py-2 pr-2 rounded-[6px] transition-colors"
                      :class="
                        isActive(twinSceneSettingsRoute())
                          ? 'bg-[#e6f7f8]'
                          : 'hover:bg-[#f5f7fa]'
                      "
                      @click="isOpenMobile = false"
                    >
                      <div class="flex items-center pl-3.5">
                        <div
                          class="w-3 h-0.5 rounded-r flex-shrink-0 mr-2"
                          :class="
                            isActive(twinSceneSettingsRoute())
                              ? 'bg-[#00b4b6]'
                              : 'bg-gray-300'
                          "
                        />
                        <span
                          class="text-sm transition-colors"
                          :class="
                            isActive(twinSceneSettingsRoute())
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
                <div v-if="showWorkspaceLinks" class="relative">
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
                  v-if="showWorkspaceLinks"
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
                  v-if="showWorkspaceLinks"
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
                  v-if="showWorkspaceLinks"
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
      </div>
    </template>
  </div>
</template>
<script setup lang="ts">
import {
  FormButton,
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
  twinSceneRoute,
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
import { ChevronRightIcon, Squares2X2Icon } from '@heroicons/vue/24/outline'
import { useRoute } from 'vue-router'
import { useActiveUser } from '~~/lib/auth/composables/activeUser'
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
  // 如果用户手动设置了展开状态，使用手动设置的值
  if (isTwinSceneMenuExpanded.value !== null) {
    return isTwinSceneMenuExpanded.value
  }
  // 否则根据路由自动判断
  return (
    isActive(twinSceneRoute) ||
    isActive(twinSceneCasesRoute()) ||
    isActive(twinSceneMembersRoute()) ||
    isActive(twinSceneSettingsRoute())
  )
})

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
</style>
