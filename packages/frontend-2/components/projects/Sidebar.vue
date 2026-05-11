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
          <LayoutSidebarMenu>
            <LayoutSidebarMenuGroup
              v-if="isWorkspacesEnabled && isLoggedIn"
              class="lg:hidden mb-4"
            >
              <HeaderWorkspaceSwitcher />
            </LayoutSidebarMenuGroup>

            <div class="flex flex-col gap-y-2 lg:gap-y-4">
              <LayoutSidebarMenuGroup>
                <NuxtLink
                  v-if="showWorkspaceLinks"
                  :to="projectBaseRoutePath + '/workbench'"
                  @click="isOpenMobile = false"
                >
                  <LayoutSidebarMenuGroupItem
                    :class="[
                      'py-2.5 mb-1 rounded-[8px]',
                      isProjectActive('/workbench') &&
                        'bg-primary/10 hover:!bg-primary/10 text-primary',
                      !isProjectActive('/workbench') &&
                        'text-[#666] hover:bg-[#f5f7fa] hover:text-primary'
                    ]"
                    label="工作台"
                  >
                    <template #icon>
                      <IconHome
                        class="size-4"
                        :class="isProjectActive('/workbench') ? 'text-primary' : 'text-gray-400'"
                      />
                    </template>
                  </LayoutSidebarMenuGroupItem>
                </NuxtLink>

                <LayoutSidebarMenuGroup
                  title="模型管理"
                  collapsible
                  :no-hover="true"
                  title-class="text-[#666]"
                  arrow-class="text-[#666]"
                >
                  <template #title-icon>
                    <IconModelfiles class="size-4 text-primary" />
                  </template>
                  <NuxtLink
                    v-if="showWorkspaceLinks"
                    :to="projectBaseRoutePath + '/model-list'"
                    @click="isOpenMobile = false"
                  >
                    <LayoutSidebarMenuGroupItem
                      :class="[
                        'py-2.5 mb-1 rounded-[8px]',
                        isProjectActive('/model-list') &&
                          'bg-primary/10 hover:!bg-primary/10 text-primary',
                        !isProjectActive('/model-list') &&
                          'text-[#666] hover:bg-[#f5f7fa] hover:text-primary'
                      ]"
                      extra-padding
                      label="文件管理"
                    ></LayoutSidebarMenuGroupItem>
                  </NuxtLink>
                  <NuxtLink
                    v-if="showWorkspaceLinks"
                    :to="projectBaseRoutePath + '/workbench/discussions'"
                    @click="isOpenMobile = false"
                  >
                    <LayoutSidebarMenuGroupItem
                      :class="[
                        'py-2.5 mb-1 rounded-[8px]',
                        isProjectActive('/workbench/discussions') &&
                          'bg-primary/10 hover:!bg-primary/10 text-primary',
                        !isProjectActive('/workbench/discussions') &&
                          'text-[#666] hover:bg-[#f5f7fa] hover:text-primary'
                      ]"
                      extra-padding
                      label="协同管理"
                    ></LayoutSidebarMenuGroupItem>
                  </NuxtLink>
                </LayoutSidebarMenuGroup>

                <LayoutSidebarMenuGroup
                  title="进度管理"
                  collapsible
                  :no-hover="true"
                  title-class="text-[#666]"
                  arrow-class="text-[#666]"
                >
                  <template #title-icon>
                    <IconProgress class="size-4 text-primary" />
                  </template>
                  <NuxtLink
                    v-if="showWorkspaceLinks"
                    :to="projectBaseRoutePath + '/progress/schedule'"
                    @click="isOpenMobile = false"
                  >
                    <LayoutSidebarMenuGroupItem
                      :class="[
                        'py-2.5 mb-1 rounded-[8px]',
                        isProjectActive('/progress/schedule') &&
                          'bg-primary/10 hover:!bg-primary/10 text-primary',
                        !isProjectActive('/progress/schedule') &&
                          'text-[#666] hover:bg-[#f5f7fa] hover:text-primary'
                      ]"
                      extra-padding
                      label="进度计划"
                    ></LayoutSidebarMenuGroupItem>
                  </NuxtLink>
                  <NuxtLink
                    v-if="showWorkspaceLinks"
                    :to="projectBaseRoutePath + '/progress/actual'"
                    @click="isOpenMobile = false"
                  >
                    <LayoutSidebarMenuGroupItem
                      :class="[
                        'py-2.5 mb-1 rounded-[8px]',
                        isProjectActive('/progress/actual') &&
                          'bg-primary/10 hover:!bg-primary/10 text-primary',
                        !isProjectActive('/progress/actual') &&
                          'text-[#666] hover:bg-[#f5f7fa] hover:text-primary'
                      ]"
                      extra-padding
                      label="实际进度"
                    ></LayoutSidebarMenuGroupItem>
                  </NuxtLink>
                  <NuxtLink
                    v-if="showWorkspaceLinks"
                    :to="projectBaseRoutePath + '/progress/physical'"
                    @click="isOpenMobile = false"
                  >
                    <LayoutSidebarMenuGroupItem
                      :class="[
                        'py-2.5 mb-1 rounded-[8px]',
                        isProjectActive('/progress/physical') &&
                          'bg-primary/10 hover:!bg-primary/10 text-primary',
                        !isProjectActive('/progress/physical') &&
                          'text-[#666] hover:bg-[#f5f7fa] hover:text-primary'
                      ]"
                      extra-padding
                      label="形象进度"
                    ></LayoutSidebarMenuGroupItem>
                  </NuxtLink>
                </LayoutSidebarMenuGroup>

                <NuxtLink
                  v-if="showWorkspaceLinks"
                  :to="projectBaseRoutePath + '/quality-acceptance'"
                  @click="isOpenMobile = false"
                >
                  <LayoutSidebarMenuGroupItem
                    :class="[
                      'py-2.5 mb-1 rounded-[8px]',
                      isProjectActive('/quality-acceptance') &&
                        'bg-primary/10 hover:!bg-primary/10 text-primary',
                      !isProjectActive('/quality-acceptance') &&
                        'text-[#666] hover:bg-[#f5f7fa] hover:text-primary'
                    ]"
                    label="质量验收"
                  >
                    <template #icon>
                      <IconCircleCheck
                        class="size-4"
                        :class="isProjectActive('/quality-acceptance') ? 'text-primary' : 'text-gray-400'"
                      />
                    </template>
                  </LayoutSidebarMenuGroupItem>
                </NuxtLink>

                <LayoutSidebarMenuGroup
                  title="验工计价"
                  collapsible
                  :no-hover="true"
                  title-class="text-[#666]"
                  arrow-class="text-[#666]"
                >
                  <template #title-icon>
                    <IconCalculator class="size-4 text-primary" />
                  </template>
                  <NuxtLink
                    v-if="showWorkspaceLinks"
                    :to="projectBaseRoutePath + '/work-valuation/BOQ'"
                    @click="isOpenMobile = false"
                  >
                    <LayoutSidebarMenuGroupItem
                      :class="[
                        'py-2.5 mb-1 rounded-[8px]',
                        isProjectActive('/work-valuation/BOQ') &&
                          'bg-primary/10 hover:!bg-primary/10 text-primary',
                        !isProjectActive('/work-valuation/BOQ') &&
                          'text-[#666] hover:bg-[#f5f7fa] hover:text-primary'
                      ]"
                      extra-padding
                      label="清单管理"
                    ></LayoutSidebarMenuGroupItem>
                  </NuxtLink>
                  <NuxtLink
                    v-if="showWorkspaceLinks"
                    :to="projectBaseRoutePath + '/work-valuation/monthly-measurement'"
                    @click="isOpenMobile = false"
                  >
                    <LayoutSidebarMenuGroupItem
                      :class="[
                        'py-2.5 mb-1 rounded-[8px]',
                        isProjectActive('/work-valuation/monthly-measurement') &&
                          'bg-primary/10 hover:!bg-primary/10 text-primary',
                        !isProjectActive('/work-valuation/monthly-measurement') &&
                          'text-[#666] hover:bg-[#f5f7fa] hover:text-primary'
                      ]"
                      extra-padding
                      label="月度验工"
                    ></LayoutSidebarMenuGroupItem>
                  </NuxtLink>
                </LayoutSidebarMenuGroup>

                <LayoutSidebarMenuGroup
                  title="档案管理"
                  collapsible
                  :no-hover="true"
                  title-class="text-[#666]"
                  arrow-class="text-[#666]"
                >
                  <template #title-icon>
                    <IconFile class="size-4 text-primary" />
                  </template>
                  <NuxtLink
                    v-if="showWorkspaceLinks"
                    :to="projectBaseRoutePath + '/archive/model-to-site'"
                    @click="isOpenMobile = false"
                  >
                    <LayoutSidebarMenuGroupItem
                      :class="[
                        'py-2.5 mb-1 rounded-[8px]',
                        isProjectActive('/archive/model-to-site') &&
                          'bg-primary/10 hover:!bg-primary/10 text-primary',
                        !isProjectActive('/archive/model-to-site') &&
                          'text-[#666] hover:bg-[#f5f7fa] hover:text-primary'
                      ]"
                      extra-padding
                      label="实模一致性检查"
                    ></LayoutSidebarMenuGroupItem>
                  </NuxtLink>
                  <NuxtLink
                    v-if="showWorkspaceLinks"
                    :to="projectBaseRoutePath + '/archive/archives'"
                    @click="isOpenMobile = false"
                  >
                    <LayoutSidebarMenuGroupItem
                      :class="[
                        'py-2.5 mb-1 rounded-[8px]',
                        isProjectActive('/archive/archives') &&
                          'bg-primary/10 hover:!bg-primary/10 text-primary',
                        !isProjectActive('/archive/archives') &&
                          'text-[#666] hover:bg-[#f5f7fa] hover:text-primary'
                      ]"
                      extra-padding
                      label="档案管理"
                    ></LayoutSidebarMenuGroupItem>
                  </NuxtLink>
                </LayoutSidebarMenuGroup>
              </LayoutSidebarMenuGroup>
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
  workspaceRoute,
  workbenchRoute
} from '~/lib/common/helpers/route'
import { useRoute } from 'vue-router'
import { useActiveUser } from '~~/lib/auth/composables/activeUser'
import { useActiveWorkspaceSlug } from '~/lib/user/composables/activeWorkspace'
import { graphql } from '~/lib/common/generated/gql'
import { useQuery } from '@vue/apollo-composable'
import dayjs from 'dayjs'
import { useActiveUserMeta } from '~/lib/user/composables/meta'
import { ChevronLeftIcon } from '@heroicons/vue/24/outline'

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

const { isLoggedIn } = useActiveUser()
const isWorkspacesEnabled = useIsWorkspacesEnabled()
const route = useRoute()
const activeWorkspaceSlug = useActiveWorkspaceSlug()

const { result } = useQuery(dashboardSidebarQuery, () => ({}), {
  enabled: isWorkspacesEnabled.value
})
const { hasDismissedSpeckleCon25Banner } = useActiveUserMeta()

const isOpenMobile = ref(false)

const showSpeckleCon25Promo = computed(() => {
  if (hasDismissedSpeckleCon25Banner.value) return false
  return dayjs().isBefore('2025-11-07', 'day')
})
const activeWorkspace = computed(() => result.value?.activeUser?.activeWorkspace)

const showWorkspaceLinks = computed(() => {
  return isWorkspacesEnabled.value
    ? activeWorkspace.value
      ? !!activeWorkspace.value?.role
      : true
    : isLoggedIn.value
})

const _projectsLink = computed(() => {
  return isWorkspacesEnabled.value
    ? activeWorkspaceSlug.value
      ? workspaceRoute(activeWorkspaceSlug.value)
      : projectsRoute
    : projectsRoute
})

const workbenchLink = computed(() => {
  return isWorkspacesEnabled.value ? activeWorkspaceSlug.value : workbenchRoute
})

const projectBaseRoute = computed(() => {
  const projectId = route.params.id as string | undefined
  return projectId ? `/projects/${projectId}` : null
})

const projectBaseRoutePath = computed(() => {
  return projectBaseRoute.value || projectsRoute
})

const isProjectActive = (suffix = ''): boolean => {
  const base = projectBaseRoute.value
  if (!base) return false
  const fullPath = `${base}${suffix}`
  return route.path === fullPath
}

const isActive = (...routes: string[]): boolean => {
  return routes.some((routeTo) => route.path === routeTo)
}
</script>

<style scoped>
.sidebar-shell {
  background: #E7EBEB;
}

.layout-sidebar-bg {
  opacity: 0.5;
  background-image: url('https://i.imgur.com/MLqoJhx.png');
  background-size: cover;
  background-position: bottom;
  background-repeat: no-repeat;
}
</style>
