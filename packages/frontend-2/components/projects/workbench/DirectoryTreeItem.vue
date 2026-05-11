<template>
  <div>
    <!-- eslint-disable-next-line -->
    <div
      :class="[
        'group w-full flex items-center justify-between px-2 py-1.5 rounded-[8px] text-sm transition-colors cursor-pointer',
        activeDir === directory.id
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-gray-600 hover:bg-gray-100'
      ]"
      :style="{ paddingLeft: `${level * 12 + 8}px` }"
      @click="$emit('select', directory.id)"
    >
      <div class="flex items-center space-x-2 overflow-hidden">
        <button
          v-if="directory.children && directory.children.length > 0"
          class="p-0.5 hover:bg-gray-200 rounded text-gray-400"
          @click.stop="$emit('toggle', directory.id)"
        >
          <ChevronDownIcon v-if="directory.isOpen" class="w-3.5 h-3.5" />
          <ChevronRightIcon v-else class="w-3.5 h-3.5" />
        </button>
        <div v-else class="w-4.5" />
        <FolderIcon
          :class="[
            'w-4 h-4 shrink-0',
            activeDir === directory.id ? 'text-primary' : 'text-gray-400'
          ]"
        />
        <span class="truncate">{{ directory.name }}</span>
      </div>
      <div class="opacity-0 group-hover:opacity-100 flex items-center">
        <button
          class="p-1 text-gray-400 hover:text-primary"
          title="添加子目录"
          @click.stop="$emit('addChild', directory.id)"
        >
          <PlusIcon class="w-3.5 h-3.5" />
        </button>
        <button class="p-1 text-gray-400 hover:text-primary">
          <EllipsisHorizontalIcon class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
    <div v-if="directory.isOpen && directory.children" class="mt-0.5 space-y-0.5">
      <DirectoryTreeItem
        v-for="child in directory.children"
        :key="child.id"
        :directory="child"
        :active-dir="activeDir"
        :level="level + 1"
        @select="$emit('select', $event)"
        @toggle="$emit('toggle', $event)"
        @add-child="$emit('addChild', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ChevronDownIcon,
  ChevronRightIcon,
  FolderIcon,
  PlusIcon,
  EllipsisHorizontalIcon
} from '@heroicons/vue/24/outline'

type Directory = {
  id: string
  name: string
  children?: Directory[]
  isOpen?: boolean
}

defineProps<{
  directory: Directory
  activeDir: string
  level: number
}>()

defineEmits<{
  select: [id: string]
  toggle: [id: string]
  addChild: [id: string]
}>()
</script>
