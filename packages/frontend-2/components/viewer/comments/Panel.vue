<template>
  <ViewerLayoutSidePanel>
    <template #title>
      <span>模型标注</span>
    </template>
    <template #actions>
      <div class="flex items-center leading-none">
        <LayoutMenu
          v-model:open="showVisibilityOptions"
          :menu-id="menuId"
          :items="actionsItems"
          :menu-position="HorizontalDirection.Right"
          mount-menu-on-body
          :custom-menu-items-classes="['!w-[270px]']"
          show-ticks
          @click.stop.prevent
          @chosen="onActionChosen"
        >
          <FormButton
            hide-text
            color="subtle"
            :icon-left="settingsIcon"
            size="sm"
            :class="
              showVisibilityOptions
                ? '!text-[#00b4b6] !bg-[#00b4b6]/10'
                : ''
            "
            @click="showVisibilityOptions = !showVisibilityOptions"
          />
        </LayoutMenu>
      </div>
    </template>
    <div class="flex flex-col h-full">
      <div class="flex flex-col flex-1 gap-y-2 p-1">
        <ViewerCommentsListItem
          v-for="thread in commentThreads"
          :key="thread.id"
          :thread="thread"
        />
        <ProjectPageLatestItemsCommentsEmptyState v-if="commentThreads.length === 0" />
      </div>
    </div>
  </ViewerLayoutSidePanel>
</template>
<script setup lang="ts">
import { graphql } from '~~/lib/common/generated/gql'
import type { ConcreteComponent } from 'vue'
import {
  useInjectedViewerInterfaceState,
  useInjectedViewerLoadedResources,
  useInjectedViewerRequestedResources
} from '~~/lib/viewer/composables/setup'
import type { LayoutMenuItem } from '~~/lib/layout/helpers/components'
import { HorizontalDirection } from '~~/lib/common/composables/window'

enum ActionTypes {
  HideBubbles = 'hide-bubbles',
  LoadedVersionsOnly = 'loaded-versions-only'
}

graphql(`
  fragment ViewerCommentsListItem on Comment {
    id
    rawText
    archived
    author {
      ...LimitedUserAvatar
    }
    createdAt
    viewedAt
    replies {
      totalCount
      cursor
      items {
        ...ViewerCommentsReplyItem
      }
    }
    replyAuthors(limit: 4) {
      totalCount
      items {
        ...FormUsersSelectItem
      }
    }
    resources {
      resourceId
      resourceType
    }
  }
`)

const { commentThreads } = useInjectedViewerLoadedResources()
const { threadFilters } = useInjectedViewerRequestedResources()
const {
  threads: { hideBubbles }
} = useInjectedViewerInterfaceState()
const menuId = useId()

const showVisibilityOptions = ref(false)
const settingsIcon = resolveComponent('IconViewerSettings') as ConcreteComponent

const loadedVersionsOnly = computed({
  get: () =>
    threadFilters.value.loadedVersionsOnly || false ? 'loadedVersionsOnly' : undefined,
  set: (newVal) => (threadFilters.value.loadedVersionsOnly = !!newVal)
})

const actionsItems = computed<LayoutMenuItem[][]>(() => [
  [
    {
      title: '显示模型标注',
      id: ActionTypes.HideBubbles,
      active: !hideBubbles.value
    },
    {
      title: '排除其他版本的线程',
      id: ActionTypes.LoadedVersionsOnly,
      active: !!loadedVersionsOnly.value
    }
  ]
])

const onActionChosen = (params: { item: LayoutMenuItem; event: MouseEvent }) => {
  const { item } = params

  switch (item.id) {
    case ActionTypes.HideBubbles:
      hideBubbles.value = !hideBubbles.value
      break
    case ActionTypes.LoadedVersionsOnly:
      loadedVersionsOnly.value = loadedVersionsOnly.value
        ? undefined
        : 'loadedVersionsOnly'
      break
  }
}
</script>
