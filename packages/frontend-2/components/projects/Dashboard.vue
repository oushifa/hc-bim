<template>
  <div class="flex flex-col gap-0" style="height: calc(100vh - 6.5rem)">
    <Portal to="primary-actions"></Portal>
    <div
      v-if="!showEmptyState"
      class="bg-white/80 backdrop-blur-md rounded-[26px] shadow-sm p-4 flex justify-between items-center border border-white/40 shrink-0 mb-2"
    >
      <h2 class="text-lg font-medium text-[#333]">我的项目</h2>
      <div class="flex items-center gap-3">
        <!-- <FormTextInput
          name="modelsearch"
          :show-label="false"
          placeholder="搜索项目..."
          :custom-icon="MagnifyingGlassIcon"
          color="foundation"
          wrapper-classes="grow md:grow-0 md:w-60"
          :show-clear="!!search"
          v-bind="bind"
          v-on="on"
        /> -->
        <button
          v-if="canClickCreate"
          class="flex items-center space-x-2 bg-[#e6f7f8] text-[#00b4b6] hover:bg-[#00b4b6] hover:text-white px-4 py-2 rounded-[8px] text-sm font-medium transition-colors border border-[#00b4b6]/20"
          @click="onClickCreate"
        >
          <PlusIcon class="h-4 w-4" />
          <span>新建项目</span>
        </button>
      </div>
    </div>
    <CommonLoadingBar :loading="showLoadingBar" />

    <ProjectsHiddenProjectWarning
      v-if="projectsPanelResult?.activeUser && projects?.numberOfHidden"
      :hidden-item-count="projectsPanelResult.activeUser.projects.numberOfHidden"
      :user="projectsPanelResult.activeUser"
    />

    <!-- 可滚动的列表区域 -->
    <div class="flex-1 overflow-auto">
      <ProjectsDashboardEmptyState
        v-if="showEmptyState"
        :can-create-project="canClickCreate"
        @create-project="onClickCreate"
      />
      <template v-else-if="projects?.items?.length">
        <ProjectsDashboardFilled
          :projects="projects"
          @edit-project="onEditProject"
          @delete-project="onDeleteProject"
          @share-project="onShareProject"
        />
        <InfiniteLoading
          :settings="{ identifier: infiniteLoaderId }"
          @infinite="infiniteLoad"
        />
      </template>
      <CommonEmptySearchState v-else-if="!showLoadingBar" @clear-search="clearSearch" />
    </div>
    <ProjectsAdd
      v-if="projectsPanelResult?.activeUser"
      v-model:open="showCreateNewProjectDialog"
      @created="onProjectCreated"
    />
    <WorkspaceMoveProject
      v-if="showMoveProjectDialog"
      v-model:open="showMoveProjectDialog"
      :project="emittedProject"
    />
    <!-- 编辑项目对话框 -->
    <ProjectsEditDialog
      v-if="showEditProjectDialog"
      v-model:open="showEditProjectDialog"
      :project="editingProject"
      @update="onUpdateProject"
    />
    <!-- 删除确认对话框 -->
    <ProjectsDeleteDialog
      v-if="showDeleteProjectDialog"
      v-model:open="showDeleteProjectDialog"
      :project="deletingProject"
      @delete="onConfirmDelete"
    />
    <!-- 分享对话框 -->
    <ProjectsShareDialog
      v-if="showShareDialog"
      v-model:open="showShareDialog"
      :project="sharingProject"
    />
  </div>
</template>

<script setup lang="ts">
import { useQuery, useQueryLoading } from '@vue/apollo-composable'
import { projectsDashboardQuery } from '~~/lib/projects/graphql/queries'
import { graphql } from '~~/lib/common/generated/gql'
import type { Nullable, Optional, StreamRoles } from '@speckle/shared'
import { useDebouncedTextInput, type InfiniteLoaderState } from '@speckle/ui-components'
import {
  MagnifyingGlassIcon,
  Squares2X2Icon,
  PlusIcon
} from '@heroicons/vue/24/outline'
import { useUserProjectsUpdatedTracking } from '~~/lib/user/composables/projectUpdates'
import { useCanCreatePersonalProject } from '~~/lib/projects/composables/permissions'
import {
  useUpdateProject,
  useDeleteProject
} from '~~/lib/projects/composables/projectManagement'
import type { ProjectsDashboardQueryQuery } from '~/lib/common/generated/gql/graphql'
import type { Get } from 'type-fest'

graphql(`
  fragment ProjectsDashboard_UserProjectCollection on UserProjectCollection {
    numberOfHidden
  }
`)

graphql(`
  fragment ProjectsDashboard_User on User {
    ...ProjectsAdd_User
    permissions {
      canCreatePersonalProject {
        ...FullPermissionCheckResult
      }
    }
  }
`)

const logger = useLogger()

const infiniteLoaderResetToken = ref(0)
const cursor = ref(null as Nullable<string>)
const selectedRoles = ref(undefined as Optional<StreamRoles[]>)
const filterProjectsToMove = ref(false)
const showLoadingBar = ref(false)
const showMoveProjectDialog = ref(false)
const emittedProject =
  ref<Get<ProjectsDashboardQueryQuery, 'activeUser.projects.items[0]'>>()
const areQueriesLoading = useQueryLoading()
const isWorkspacesEnabled = useIsWorkspacesEnabled()
const showCreateNewProjectDialog = ref(false)
useUserProjectsUpdatedTracking()

const {
  on,
  bind,
  value: search
} = useDebouncedTextInput({
  debouncedBy: 800
})

const {
  result: projectsPanelResult,
  fetchMore: fetchMoreProjects,
  onResult: onProjectsResult,
  variables: projectsVariables,
  refetch
} = useQuery(projectsDashboardQuery, () => ({
  filter: {
    search: (search.value || '').trim() || null,
    onlyWithRoles: filterProjectsToMove.value
      ? ['stream:owner']
      : selectedRoles.value?.length
      ? selectedRoles.value
      : null,
    personalOnly: isWorkspacesEnabled.value
  },
  cursor: null as Nullable<string>
}))

const { canClickCreate } = useCanCreatePersonalProject({
  activeUser: computed(() => projectsPanelResult.value?.activeUser)
})

const updateProject = useUpdateProject()
const deleteProject = useDeleteProject()

onProjectsResult((res) => {
  cursor.value = res.data?.activeUser?.projects.cursor || null
})

const infiniteLoaderId = computed(() =>
  JSON.stringify({
    filter: projectsVariables.value?.filter || {},
    reset: infiniteLoaderResetToken.value
  })
)

const projects = computed(() => projectsPanelResult.value?.activeUser?.projects)
const showEmptyState = computed(() => {
  const isFiltering =
    projectsVariables.value?.filter?.onlyWithRoles?.length ||
    projectsVariables.value?.filter?.search?.length
  if (isFiltering) return false

  return projects.value && !projects.value.items.length
})

const moreToLoad = computed(
  () =>
    (!projects.value || projects.value.items.length < projects.value.totalCount) &&
    cursor.value
)

const infiniteLoad = async (state: InfiniteLoaderState) => {
  if (!moreToLoad.value) return state.complete()

  try {
    await fetchMoreProjects({
      variables: {
        cursor: cursor.value
      }
    })
  } catch (e) {
    logger.error(e)
    state.error()
    return
  }

  state.loaded()
  if (!moreToLoad.value) {
    state.complete()
  }
}

const onProjectCreated = async () => {
  // 项目创建后重置游标并刷新列表，同时重置无限加载器，避免仅显示首页6条
  cursor.value = null
  try {
    await refetch()
  } catch (error) {
    logger.error(error)
  }
  infiniteLoaderResetToken.value++
}

const onMoveProject = (projectId: string | undefined, location: string) => {
  const project = projectId
    ? projects.value?.items.find((p) => p.id === projectId)
    : undefined
  emittedProject.value = project || undefined

  showMoveProjectDialog.value = true
}

// 编辑、删除和分享相关
const showEditProjectDialog = ref(false)
const showDeleteProjectDialog = ref(false)
const showShareDialog = ref(false)
const editingProject = ref<any>(null)
const deletingProject = ref<any>(null)
const sharingProject = ref<any>(null)

const onEditProject = (project: any) => {
  editingProject.value = project
  showEditProjectDialog.value = true
}

const onDeleteProject = (project: any) => {
  deletingProject.value = project
  showDeleteProjectDialog.value = true
}

const onShareProject = (project: any) => {
  sharingProject.value = project
  showShareDialog.value = true
}

const onUpdateProject = async (updatedData: any) => {
  try {
    await updateProject({
      id: updatedData.id,
      name: updatedData.name
    })
    showEditProjectDialog.value = false
    // 刷新列表并重置无限加载器
    cursor.value = null
    await refetch()
    infiniteLoaderResetToken.value++
  } catch (error) {
    logger.error('更新项目失败:', error)
  }
}

const onConfirmDelete = async (projectId: string) => {
  try {
    await deleteProject(projectId)
    showDeleteProjectDialog.value = false
    // 刷新列表并重置无限加载器
    cursor.value = null
    await refetch()
    infiniteLoaderResetToken.value++
  } catch (error) {
    logger.error('删除项目失败:', error)
  }
}

watch(search, (newVal) => {
  if (newVal) showLoadingBar.value = true
  else showLoadingBar.value = false
})

watch(areQueriesLoading, (newVal) => (showLoadingBar.value = newVal))

const clearSearch = () => {
  search.value = ''
  selectedRoles.value = []
}

const onClickCreate = () => {
  showCreateNewProjectDialog.value = true
}
</script>
