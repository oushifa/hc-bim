import type { Meta, StoryObj } from '@storybook/vue3'
import { action } from '@storybook/addon-actions'
import { ref } from 'vue'
import LayoutTree from '~~/src/components/layout/Tree.vue'
import type { LayoutTreeNode } from '~~/src/helpers/layout/components'

type StoryType = StoryObj<Record<string, unknown>>

const treeData: LayoutTreeNode[] = [
  {
    key: '0',
    title: '项目',
    children: [
      {
        key: '0-0',
        title: '建筑',
        children: [
          { key: '0-0-0', title: '结构模型.ifc' },
          { key: '0-0-1', title: '机电模型.ifc' }
        ]
      },
      {
        key: '0-1',
        title: '文档',
        children: [
          { key: '0-1-0', title: '施工图.pdf' },
          { key: '0-1-1', title: '交付清单.xlsx' }
        ]
      }
    ]
  },
  {
    key: '1',
    title: '归档',
    children: [{ key: '1-0', title: '2025' }]
  }
]

export default {
  component: LayoutTree,
  parameters: {
    docs: {
      description: {
        component: '参考 Ant Design Vue 交互方式的基础树组件。'
      }
    }
  },
  argTypes: {
    selectable: { control: { type: 'boolean' } },
    checkable: { control: { type: 'boolean' } },
    multiple: { control: { type: 'boolean' } },
    expandOnClickNode: { control: { type: 'boolean' } },
    defaultExpandAll: { control: { type: 'boolean' } }
  }
} as Meta

export const Default: StoryType = {
  render: (args) => ({
    components: { LayoutTree },
    setup() {
      const expandedKeys = ref<string[]>(['0'])
      const selectedKeys = ref<string[]>([])
      const checkedKeys = ref<string[]>([])
      return {
        args,
        treeData,
        expandedKeys,
        selectedKeys,
        checkedKeys,
        onExpand: action('expand'),
        onSelect: action('select'),
        onCheck: action('check')
      }
    },
    template: `
      <div class="max-w-xl">
        <LayoutTree
          v-bind="args"
          :tree-data="treeData"
          v-model:expanded-keys="expandedKeys"
          v-model:selected-keys="selectedKeys"
          v-model:checked-keys="checkedKeys"
          @expand="onExpand"
          @select="onSelect"
          @check="onCheck"
        />
      </div>
    `
  }),
  args: {
    selectable: true,
    checkable: false,
    multiple: false,
    defaultExpandAll: false,
    expandOnClickNode: false
  }
}

export const Checkable: StoryType = {
  ...Default,
  args: {
    ...Default.args,
    checkable: true,
    defaultExpandAll: true
  }
}
