<template>
  <FormSelectBase
    v-model="selectedValue"
    :name="name || 'savedViewGroup'"
    :label="label || '分组'"
    :label-id="labelId"
    :button-id="buttonId"
    mount-menu-on-body
    :show-label="showLabel"
    :fully-control-value="fullyControlValue"
    :disabled="disabled"
    :clearable="clearable"
    :get-search-results="getSearchResults"
    :allow-unset="allowUnset"
    search
  >
    <template #nothing-selected>选择一个分组</template>
    <template #something-selected="{ value }">
      <div class="truncate text-foreground capitalize">
        {{ isArrayValue(value) ? value.map((v) => v.title).join(', ') : value.title }}
      </div>
    </template>
    <template #option="{ item }">
      <div class="flex flex-col space-y-0.5">
        <span class="truncate capitalize">{{ item.title }}</span>
      </div>
    </template>
  </FormSelectBase>
</template>
<script setup lang="ts">
import { useFormSelectChildInternals } from '@speckle/ui-components'
import { useApolloClient } from '@vue/apollo-composable'
import { graphql } from '~/lib/common/generated/gql'
import type { FormSelectSavedViewGroup_SavedViewGroupFragment } from '~/lib/common/generated/gql/graphql'

graphql(`
  fragment FormSelectSavedViewGroup_SavedViewGroup on SavedViewGroup {
    id
    title
    isUngroupedViewsGroup
  }
`)

const searchItemsQuery = graphql(`
  query FormSelectSavedViewGroup_SavedViewGroups(
    $projectId: String!
    $input: SavedViewGroupsInput!
  ) {
    project(id: $projectId) {
      id
      savedViewGroups(input: $input) {
        items {
          id
          ...FormSelectSavedViewGroup_SavedViewGroup
        }
        totalCount
        cursor
      }
    }
  }
`)

type ItemType = FormSelectSavedViewGroup_SavedViewGroupFragment
type ValueType = ItemType | ItemType[] | undefined

const emit = defineEmits<{
  (e: 'update:modelValue', v: ValueType): void
}>()

const props = withDefaults(
  defineProps<{
    projectId: string
    resourceIdString: string
    modelValue?: ValueType
    fullyControlValue?: boolean
    label?: string
    disabled?: boolean
    showLabel?: boolean
    clearable?: boolean
    allowUnset?: boolean
    name?: string
  }>(),
  {
    clearable: false,
    allowUnset: false
  }
)

const apollo = useApolloClient().client
const labelId = useId()
const buttonId = useId()

const { selectedValue, isArrayValue } = useFormSelectChildInternals<ItemType>({
  props: toRefs(props),
  emit
})

const getSearchResults = async (search: string): Promise<ItemType[]> => {
  const res = await apollo
    .query({
      query: searchItemsQuery,
      variables: {
        projectId: props.projectId,
        input: {
          resourceIdString: props.resourceIdString,
          search,
          limit: 10
        }
      }
    })
    .catch(convertThrowIntoFetchResult)

  const items = res.data?.project.savedViewGroups.items || []
  return items
}
</script>

<style scoped>
/* 强制覆盖下拉框按钮聚焦时的边框颜色 */
:deep(button:focus),
:deep(button:focus-visible) {
  border-color: #00b4b6 !important;
  outline-color: #00b4b6 !important;
  outline: 1px solid #00b4b6 !important;
  box-shadow: 0 0 0 1px rgba(0, 180, 182, 0.2) !important;
}

/* 强制覆盖下拉框展开时的边框颜色 - 覆盖 border-outline-4 */
:deep(.border-outline-4) {
  border-color: #00b4b6 !important;
}

:deep(.group:focus-within) {
  border-color: #00b4b6 !important;
}
</style>

<style>
/* 全局样式：覆盖下拉框内搜索框聚焦时的边框颜色 */
.listbox-options input:focus-visible,
.listbox-options input:focus {
  border-color: #00b4b6 !important;
  box-shadow: 0 0 0 1px rgba(0, 180, 182, 0.2) !important;
}

/* 覆盖 Base.vue 中的 focus-visible:border-outline-4 */
input.focus\:border-outline-4:focus-visible,
input.focus-visible\:border-outline-4:focus-visible {
  border-color: #00b4b6 !important;
}
</style>
