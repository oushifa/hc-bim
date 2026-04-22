<template>
  <div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-6">
      <ProjectsProjectGridCard
        v-for="project in items"
        :key="project.id"
        :project="project"
        :is-menu-active="activeMenuProjectId === project.id"
        @toggle-menu="onToggleMenu(project.id)"
        @close-menu="onCloseMenu"
        @edit="$emit('editProject', project)"
        @delete="$emit('deleteProject', project)"
        @share="$emit('shareProject', project)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { graphql } from '~~/lib/common/generated/gql'
import type {
  ProjectDashboardItemFragment,
  ProjectsDashboardFilledProjectFragment,
  ProjectsDashboardFilledUserFragment
} from '~~/lib/common/generated/gql/graphql'

defineEmits<{
  (e: 'editProject', project: ProjectDashboardItemFragment): void
  (e: 'deleteProject', project: ProjectDashboardItemFragment): void
  (e: 'shareProject', project: ProjectDashboardItemFragment): void
}>()

const props = defineProps<{
  projects: ProjectsDashboardFilledProjectFragment | ProjectsDashboardFilledUserFragment
  showWorkspaceLink?: boolean
  workspacePage?: boolean
}>()

const activeMenuProjectId = ref<string | null>(null)

const onToggleMenu = (projectId: string) => {
  activeMenuProjectId.value = activeMenuProjectId.value === projectId ? null : projectId
}

const onCloseMenu = () => {
  activeMenuProjectId.value = null
}

graphql(`
  fragment ProjectsDashboardFilledProject on ProjectCollection {
    items {
      ...ProjectDashboardItem
    }
  }
`)

graphql(`
  fragment ProjectsDashboardFilledUser on UserProjectCollection {
    items {
      ...ProjectDashboardItem
    }
  }
`)

const items = computed((): ProjectDashboardItemFragment[] => props.projects.items)
</script>
