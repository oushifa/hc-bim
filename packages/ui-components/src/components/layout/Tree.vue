<template>
  <div class="w-full bg-foundation p-1">
    <div v-if="visibleRows.length" class="space-y-0.5">
      <div
        v-for="row in visibleRows"
        :key="row.node.key"
        class="group flex items-center rounded-md pr-2 text-body-xs text-foreground transition-colors"
        :class="[
          isSelected(row.node) ? 'bg-primary-muted' : 'hover:bg-highlight-1',
          row.node.disabled ? 'opacity-50 cursor-not-allowed' : ''
        ]"
      >
        <div
          class="flex items-center min-w-0 w-full h-8"
          :style="{ paddingLeft: rowPadding(row.level) }"
        >
          <button
            type="button"
            class="mr-1 h-5 w-5 shrink-0 rounded-sm text-foreground-2 hover:text-foreground disabled:cursor-default disabled:opacity-40"
            :disabled="!row.hasChildren || row.node.disabled"
            @click.stop="toggleExpand(row.node, $event)"
          >
            <ChevronRightIcon
              class="h-4 w-4 transition-transform duration-150"
              :class="isExpanded(row.node.key) ? 'rotate-90' : ''"
            />
          </button>
          <input
            v-if="showCheckbox(row.node)"
            type="checkbox"
            class="mr-2 h-4 w-4 rounded border-outline-3 text-primary focus:ring-primary"
            :checked="isChecked(row.node.key)"
            :aria-label="`选择 ${row.node.title}`"
            :disabled="row.node.disabled || row.node.disableCheckbox"
            :indeterminate.prop="isHalfChecked(row.node.key)"
            @change="
              onCheck(row.node, ($event.target as HTMLInputElement).checked, $event)
            "
            @click.stop
          />
          <button
            type="button"
            class="min-w-0 grow truncate text-left"
            :disabled="row.node.disabled || !isSelectable(row.node)"
            @click="onNodeClick(row.node, $event)"
          >
            <slot
              name="title"
              :node="row.node"
              :level="row.level"
              :expanded="isExpanded(row.node.key)"
              :selected="isSelected(row.node)"
              :checked="isChecked(row.node.key)"
              :half-checked="isHalfChecked(row.node.key)"
            >
              {{ row.node.title }}
            </slot>
          </button>
        </div>
      </div>
    </div>
    <div v-else class="px-2 py-3 text-body-xs text-foreground-2 italic">
      <slot name="empty">暂无数据</slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChevronRightIcon } from '@heroicons/vue/24/outline'
import { computed, watch } from 'vue'
import type { LayoutTreeKey, LayoutTreeNode } from '~~/src/helpers/layout/components'

type NodeRecord<K extends LayoutTreeKey = LayoutTreeKey> = {
  node: LayoutTreeNode<K>
  parentKey?: K
  childrenKeys: K[]
}

type ExpandPayload<K extends LayoutTreeKey = LayoutTreeKey> = {
  expanded: boolean
  node: LayoutTreeNode<K>
  expandedKeys: K[]
  event: MouseEvent
}

type SelectPayload<K extends LayoutTreeKey = LayoutTreeKey> = {
  selected: boolean
  node: LayoutTreeNode<K>
  selectedKeys: K[]
  event: MouseEvent
}

type CheckPayload<K extends LayoutTreeKey = LayoutTreeKey> = {
  checked: boolean
  node: LayoutTreeNode<K>
  checkedKeys: K[]
  halfCheckedKeys: K[]
  event: Event
}

const emit = defineEmits<{
  (e: 'expand', payload: ExpandPayload): void
  (e: 'select', payload: SelectPayload): void
  (e: 'check', payload: CheckPayload): void
}>()

const props = withDefaults(
  defineProps<{
    treeData: LayoutTreeNode[]
    checkable?: boolean
    selectable?: boolean
    multiple?: boolean
    defaultExpandAll?: boolean
    indent?: number
    expandOnClickNode?: boolean
    disabled?: boolean
  }>(),
  {
    checkable: false,
    selectable: true,
    multiple: false,
    defaultExpandAll: false,
    indent: 20,
    expandOnClickNode: false,
    disabled: false
  }
)

const expandedKeys = defineModel<LayoutTreeKey[]>('expandedKeys', { default: () => [] })
const selectedKeys = defineModel<LayoutTreeKey[]>('selectedKeys', { default: () => [] })
const checkedKeys = defineModel<LayoutTreeKey[]>('checkedKeys', { default: () => [] })

const treeContext = computed(() => {
  const records = new Map<LayoutTreeKey, NodeRecord>()
  const rootKeys: LayoutTreeKey[] = []
  const parentKeys: LayoutTreeKey[] = []

  const walk = (nodes: LayoutTreeNode[], parentKey?: LayoutTreeKey) => {
    nodes.forEach((node) => {
      const children = node.children || []
      records.set(node.key, {
        node,
        parentKey,
        childrenKeys: children.map((child) => child.key)
      })
      if (parentKey === undefined) rootKeys.push(node.key)
      if (children.length) parentKeys.push(node.key)
      walk(children, node.key)
    })
  }

  walk(props.treeData)
  return { records, rootKeys, parentKeys }
})

const expandedKeySet = computed(() => new Set(expandedKeys.value))
const selectedKeySet = computed(() => new Set(selectedKeys.value))

const normalizeChecked = (seed: Set<LayoutTreeKey>) => {
  const checked = new Set<LayoutTreeKey>()
  const halfChecked = new Set<LayoutTreeKey>()

  const visit = (node: LayoutTreeNode): { checked: boolean; half: boolean } => {
    const children = node.children || []
    const selfCheckable = !node.disabled && !node.disableCheckbox
    const selfChecked = selfCheckable && seed.has(node.key)

    if (!children.length) {
      if (selfChecked) checked.add(node.key)
      return { checked: selfChecked, half: false }
    }

    const childStates = children.map((child) => visit(child))
    const allChildrenChecked = childStates.every((item) => item.checked)
    const anyChildCheckedOrHalf = childStates.some((item) => item.checked || item.half)

    const isChecked = selfChecked || allChildrenChecked
    const isHalf = !isChecked && anyChildCheckedOrHalf

    if (isChecked) checked.add(node.key)
    if (isHalf) halfChecked.add(node.key)

    return { checked: isChecked, half: isHalf }
  }

  props.treeData.forEach((node) => visit(node))
  return { checked, halfChecked }
}

const checkedState = computed(() => normalizeChecked(new Set(checkedKeys.value)))

const visibleRows = computed(() => {
  const rows: { node: LayoutTreeNode; level: number; hasChildren: boolean }[] = []

  const visit = (nodes: LayoutTreeNode[], level: number) => {
    nodes.forEach((node) => {
      const hasChildren = !!node.children?.length
      rows.push({ node, level, hasChildren })
      if (hasChildren && expandedKeySet.value.has(node.key)) {
        visit(node.children || [], level + 1)
      }
    })
  }

  visit(props.treeData, 0)
  return rows
})

watch(
  () => props.treeData,
  () => {
    if (!props.defaultExpandAll) return

    const nextExpanded = treeContext.value.parentKeys
    if (!nextExpanded.length) return

    const current = new Set(expandedKeys.value)
    const isSameSize = current.size === nextExpanded.length
    const hasSameKeys = isSameSize && nextExpanded.every((key) => current.has(key))
    if (hasSameKeys) return

    expandedKeys.value = [...nextExpanded]
  },
  { immediate: true, deep: true }
)

const rowPadding = (level: number) => `${level * props.indent + 4}px`

const isExpanded = (key: LayoutTreeKey) => expandedKeySet.value.has(key)
const isSelected = (node: LayoutTreeNode) => selectedKeySet.value.has(node.key)
const isChecked = (key: LayoutTreeKey) => checkedState.value.checked.has(key)
const isHalfChecked = (key: LayoutTreeKey) => checkedState.value.halfChecked.has(key)

const isSelectable = (node: LayoutTreeNode) => {
  if (props.disabled) return false
  if (!props.selectable) return false
  if (node.selectable === false) return false
  return true
}

const showCheckbox = (node: LayoutTreeNode) => {
  if (!props.checkable) return false
  if (node.checkable === false) return false
  return true
}

const toggleExpand = (node: LayoutTreeNode, event: MouseEvent) => {
  if (props.disabled || node.disabled) return
  if (!node.children?.length) return

  const next = new Set(expandedKeySet.value)
  const expanding = !next.has(node.key)
  if (expanding) next.add(node.key)
  else next.delete(node.key)

  expandedKeys.value = [...next]
  emit('expand', {
    expanded: expanding,
    node,
    expandedKeys: expandedKeys.value,
    event
  })
}

const onNodeClick = (node: LayoutTreeNode, event: MouseEvent) => {
  if (props.expandOnClickNode && node.children?.length) {
    toggleExpand(node, event)
  }

  if (!isSelectable(node) || node.disabled) return

  let nextKeys: LayoutTreeKey[] = []
  const currentlySelected = selectedKeySet.value.has(node.key)
  if (!props.multiple) {
    nextKeys = currentlySelected ? [] : [node.key]
  } else {
    const next = new Set(selectedKeySet.value)
    if (currentlySelected) next.delete(node.key)
    else next.add(node.key)
    nextKeys = [...next]
  }

  selectedKeys.value = nextKeys
  emit('select', {
    selected: !currentlySelected,
    node,
    selectedKeys: selectedKeys.value,
    event
  })
}

const getDescendantCheckableKeys = (key: LayoutTreeKey): LayoutTreeKey[] => {
  const collected: LayoutTreeKey[] = []
  const visit = (currentKey: LayoutTreeKey) => {
    const record = treeContext.value.records.get(currentKey)
    if (!record) return
    if (
      !record.node.disabled &&
      !record.node.disableCheckbox &&
      record.node.checkable !== false
    ) {
      collected.push(currentKey)
    }
    record.childrenKeys.forEach((childKey) => visit(childKey))
  }
  visit(key)
  return collected
}

const onCheck = (node: LayoutTreeNode, nextChecked: boolean, event: Event) => {
  if (props.disabled || node.disabled || node.disableCheckbox) return
  if (!showCheckbox(node)) return

  const next = new Set(checkedState.value.checked)
  const relatedKeys = getDescendantCheckableKeys(node.key)
  relatedKeys.forEach((key) => {
    if (nextChecked) next.add(key)
    else next.delete(key)
  })

  const normalized = normalizeChecked(next)
  checkedKeys.value = [...normalized.checked]

  emit('check', {
    checked: nextChecked,
    node,
    checkedKeys: checkedKeys.value,
    halfCheckedKeys: [...normalized.halfChecked],
    event
  })
}
</script>
