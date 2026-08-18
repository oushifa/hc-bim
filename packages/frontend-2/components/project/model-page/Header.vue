<template>
  <div>
    <Portal to="navigation">
      <HeaderNavLink
        v-if="showWorkspaceLink"
        :to="projectsRoute"
        name="项目管理"
        :separator="false"
      />
      <HeaderNavLink
        v-else-if="!isWorkspacesEnabled"
        :to="projectsRoute"
        name="项目管理"
        :separator="false"
      />
      <HeaderNavLink
        :to="projectRoute(project.id)"
        :name="project.name"
        :separator="showWorkspaceLink || !isWorkspacesEnabled"
      />
      <HeaderNavLink
        v-if="props.project.model"
        :to="modelVersionsRoute(project.id, props.project.model.id)"
        :name="props.project.model.name"
      />
    </Portal>

    <CommonTitleDescription
      :title="project.model.name"
      :description="project.model.description"
    />
  </div>
</template>

<script setup lang="ts">
import { graphql } from '~~/lib/common/generated/gql'
import type { ProjectModelPageHeaderProjectFragment } from '~~/lib/common/generated/gql/graphql'
import {
  projectRoute,
  modelVersionsRoute,
  projectsRoute
} from '~~/lib/common/helpers/route'

graphql(`
  fragment ProjectModelPageHeaderProject on Project {
    id
    name
    model(id: $modelId) {
      id
      name
      description
    }
  }
`)

const props = defineProps<{
  project: ProjectModelPageHeaderProjectFragment
}>()

const isWorkspacesEnabled = useIsWorkspacesEnabled()
// workspace 数据在服务器上不可用（workspaces 模块未启用），工作空间链接恒不显示
const showWorkspaceLink = computed(() => false)
</script>
