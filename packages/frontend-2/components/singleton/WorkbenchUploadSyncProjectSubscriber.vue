<script setup lang="ts">
import type {
  OnProjectPendingModelsUpdatedSubscription,
  OnProjectPendingVersionsUpdatedSubscription,
  OnProjectVersionsUpdateSubscription
} from '~/lib/common/generated/gql/graphql'
import {
  ProjectPendingModelsUpdatedMessageType,
  ProjectPendingVersionsUpdatedMessageType,
  ProjectVersionsUpdatedMessageType
} from '~/lib/common/generated/gql/graphql'
import { useWorkbenchUploadSync } from '~/lib/projects/composables/workbenchUploadSync'
import { useProjectPendingModelUpdateTracking } from '~/lib/projects/composables/modelManagement'
import {
  useProjectPendingVersionUpdateTracking,
  useProjectVersionUpdateTracking
} from '~/lib/projects/composables/versionManagement'

const props = defineProps<{
  projectId: string
  onVersionUpdate?: () => void
}>()

const { consumeVersionCreated } = useWorkbenchUploadSync()

useProjectVersionUpdateTracking(
  computed(() => props.projectId),
  (
    event: NonNullable<OnProjectVersionsUpdateSubscription['projectVersionsUpdated']>
  ) => {
    if (!event.version) {
      return
    }

    if (
      event.type === ProjectVersionsUpdatedMessageType.Created ||
      event.type === ProjectVersionsUpdatedMessageType.Updated
    ) {
      props.onVersionUpdate?.()
    }

    if (event.type === ProjectVersionsUpdatedMessageType.Created) {
      void consumeVersionCreated({
        projectId: props.projectId,
        version: event.version
      })
    }
  },
  {
    silenceToast: true
  }
)

useProjectPendingModelUpdateTracking(
  computed(() => props.projectId),
  (
    event: NonNullable<
      OnProjectPendingModelsUpdatedSubscription['projectPendingModelsUpdated']
    >
  ) => {
    if (
      event.type === ProjectPendingModelsUpdatedMessageType.Created ||
      event.type === ProjectPendingModelsUpdatedMessageType.Updated
    ) {
      props.onVersionUpdate?.()
    }
  }
)

useProjectPendingVersionUpdateTracking(
  computed(() => props.projectId),
  (
    event: NonNullable<
      OnProjectPendingVersionsUpdatedSubscription['projectPendingVersionsUpdated']
    >
  ) => {
    if (
      event.type === ProjectPendingVersionsUpdatedMessageType.Created ||
      event.type === ProjectPendingVersionsUpdatedMessageType.Updated
    ) {
      props.onVersionUpdate?.()
    }
  }
)
</script>
