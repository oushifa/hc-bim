<template>
  <WorkspacePlanLimitReachedDialog v-model:open="dialogOpen" :buttons="buttons">
    <template #header>Plan limit reached</template>
    <div class="mb-2">
      The workspace
      <span class="font-bold">{{ workspaceName }}</span>
      is on a {{ formatName(plan) }} plan with a limit of
      {{ planConfig?.limits.projectCount }}
      {{ planConfig?.limits.projectCount === 1 ? 'project' : 'projects' }} and
      {{ planConfig?.limits.modelCount }}
      {{ planConfig?.limits.modelCount === 1 ? 'model' : 'models' }}. Upgrade the
      workspace to add more.
    </div>
  </WorkspacePlanLimitReachedDialog>
</template>
<script setup lang="ts">
import {
  Roles,
  type WorkspacePlans,
  WorkspacePlanConfigs,
  type MaybeNullOrUndefined
} from '@speckle/shared'
import type { LayoutDialogButton } from '@speckle/ui-components'
import { settingsWorkspaceRoutes } from '~/lib/common/helpers/route'
import { formatName } from '~/lib/billing/helpers/plan'
import { useFeatureFlags } from '~/lib/common/composables/env'

const props = defineProps<{
  workspaceSlug: string
  workspaceName?: string
  workspaceRole?: MaybeNullOrUndefined<string>
  plan?: WorkspacePlans
  type?: 'project' | 'model'
  location: string
}>()

const dialogOpen = defineModel<boolean>('open', {
  required: true
})

const featureFlags = useFeatureFlags()

const planConfig = computed(() => {
  if (!props.plan) return null
  return WorkspacePlanConfigs({ featureFlags })[props.plan]
})

const explorePlansButton: LayoutDialogButton = {
  text: 'Explore plans',
  disabled: props.workspaceRole === Roles.Workspace.Guest,
  disabledMessage: 'As a Guest you cannot access plans and billing',
  onClick: () => {

    return navigateTo(settingsWorkspaceRoutes.billing.route(props.workspaceSlug))
  }
}

const cancelButton: LayoutDialogButton = {
  text: 'Cancel',
  props: {
    color: 'subtle'
  },
  onClick: () => (dialogOpen.value = false)
}

const buttons = computed((): LayoutDialogButton[] => [cancelButton, explorePlansButton])

watch(dialogOpen, (value) => {
  if (value) {
  }
})
</script>
