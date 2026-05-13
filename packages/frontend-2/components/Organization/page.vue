<template>
  <div class="h-full">
    <!-- Header -->
    <div class="pt-3 pb-3 flex items-center justify-between bg-gray-50">
      <h1 class="text-heading pl-5">组织管理</h1>
      <button
        class="flex items-center space-x-1.5 bg-[#00b4b6] hover:bg-[#009fa1] text-white px-3.5 py-1.5 rounded-[8px] text-sm font-medium transition-colors mr-5"
        type="button"
        :disabled="orgTree.length === 0"
        @click="openCreateMemberDialog"
      >
        <PlusIcon class="w-4 h-4" />
        <span>新增成员</span>
      </button>
    </div>

    <!-- Main Content -->
    <div class="bg-white overflow-hidden flex" style="height: calc(100vh - 11rem)">
      <!-- Left: Org Tree -->
      <div class="w-60 shrink-0 border-r border-gray-100 bg-[#fafbfc] flex flex-col">
        <div
          class="h-12 px-4 border-t border-b border-gray-100 flex items-center justify-between shrink-0"
        >
          <span class="text-sm font-medium text-[#333]">组织架构</span>
          <button
            class="text-gray-400 hover:text-[#00b4b6] transition-colors"
            title="新增一级部门"
            type="button"
            :disabled="createDepartmentLoading"
            @click="openCreateRootDepartmentDialog"
          >
            <PlusIcon class="w-4 h-4" />
          </button>
        </div>
        <div class="flex-1 overflow-y-auto p-2 space-y-1">
          <div
            v-for="org in orgTree"
            :key="org.id"
            v-show="shouldShowRow(org)"
            class="group w-full flex items-center justify-between px-3 py-2 rounded-[8px] text-sm transition-colors cursor-pointer"
            :style="{ paddingLeft: `${org.level * 12 + 12}px` }"
            :class="
              activeOrg === org.id
                ? 'bg-[#e6f7f8] text-[#00b4b6] font-medium'
                : 'text-gray-600 hover:bg-gray-100'
            "
            @click="selectTreeRow(org)"
          >
            <div class="flex items-center space-x-2 truncate pr-1 min-w-0">
              <!-- 折叠/展开图标 -->
              <button
                v-if="org.hasChildren"
                class="w-4 h-4 flex items-center justify-center shrink-0 text-gray-400 hover:text-[#00b4b6] transition-colors"
                @click.stop="toggleCollapse(org)"
              >
                <svg
                  class="w-3 h-3 transition-transform duration-200"
                  :class="isCollapsed(org.id) ? '' : 'rotate-90'"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                    clip-rule="evenodd"
                  />
                </svg>
              </button>
              <div v-else class="w-4 h-4 shrink-0"></div>
              
              <BuildingIcon
                class="w-4 h-4 shrink-0"
                :class="activeOrg === org.id ? 'text-[#00b4b6]' : 'text-gray-400'"
              />
              <span class="truncate">{{ org.name }}</span>
            </div>
            <div class="flex items-center gap-0.5 shrink-0">
              <!-- <span
                class="text-xs bg-white border border-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full mr-1"
              >
                {{ org.count }}
              </span> -->
              <!-- 新增子部门 -->
              <span
                class="inline-flex items-center justify-center w-5 h-5 rounded text-gray-400 hover:text-[#00b4b6] hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity"
                role="button"
                tabindex="0"
                title="新增子部门"
                @click.stop="openCreateChildDepartmentDialog(org)"
                @keydown.enter.stop.prevent="openCreateChildDepartmentDialog(org)"
                @keydown.space.stop.prevent="openCreateChildDepartmentDialog(org)"
              >
                <PlusIcon class="w-3.5 h-3.5" />
              </span>
              <!-- 编辑部门 -->
              <!-- <span
                class="inline-flex items-center justify-center w-5 h-5 rounded text-gray-400 hover:text-[#00b4b6] hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity"
                role="button"
                tabindex="0"
                title="重命名部门"
                @click.stop="openEditDepartmentDialog(org)"
                @keydown.enter.stop.prevent="openEditDepartmentDialog(org)"
                @keydown.space.stop.prevent="openEditDepartmentDialog(org)"
              >
                <PencilIcon class="w-3.5 h-3.5" />
              </span> -->
              <!-- 删除部门 -->
              <span
                class="inline-flex items-center justify-center w-5 h-5 rounded text-gray-400 hover:text-red-500 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity"
                role="button"
                tabindex="0"
                title="删除部门"
                @click.stop="openDeleteDepartmentDialog(org)"
                @keydown.enter.stop.prevent="openDeleteDepartmentDialog(org)"
                @keydown.space.stop.prevent="openDeleteDepartmentDialog(org)"
              >
                <TrashIcon class="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: User List -->
      <div class="flex-1 flex flex-col overflow-hidden">
        <!-- Toolbar -->
        <div
          class="h-14 px-5 border-t border-b border-gray-100 flex items-center justify-between shrink-0 bg-white"
        >
          <div class="flex items-center space-x-2">
            <!-- <UserGroupIcon class="w-5 h-5 text-[#00b4b6]" /> -->
            <span class="font-medium text-sm text-[#333]">人员信息</span>
          </div>
          <div class="flex items-center gap-3">
            <!-- Search -->
            <div class="relative">
              <SearchIcon
                class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
              />
              <label for="organization-member-search" class="sr-only">
                搜索姓名或手机号
              </label>
              <input
                id="organization-member-search"
                v-model="searchQuery"
                type="text"
                placeholder="搜索姓名/手机号..."
                class="focus-brand w-56 bg-[#f5f7fa] border border-transparent rounded-[8px] py-1.5 pl-9 pr-4 text-sm focus:outline-none text-[#333] transition-all"
              />
            </div>
          </div>
        </div>

        <!-- Table -->
        <div class="flex-1 overflow-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50/80 text-gray-500 text-sm border-b border-gray-100">
                <th class="py-3 pl-6 font-medium">姓名</th>
                <th class="py-3 font-medium">手机号</th>
                <th class="py-3 font-medium">部门</th>
                <th class="py-3 font-medium">角色</th>
                <th class="py-3 font-medium">状态</th>
                <th class="py-3 pr-6 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody class="text-sm text-[#333]">
              <tr
                v-for="user in filteredUsers"
                :key="user.id"
                class="border-b border-gray-50 hover:bg-[#fcfcfc] transition-colors"
              >
                <td class="py-3.5 pl-6">
                  <div class="flex items-center space-x-3">
                    <div
                      class="h-8 w-8 rounded-lg bg-[#e6f7f8] flex items-center justify-center text-[#00b4b6] font-semibold text-xs shrink-0"
                    >
                      {{ user.name.charAt(0) }}
                    </div>
                    <span class="font-medium">{{ user.name }}</span>
                  </div>
                </td>
                <td class="py-3.5 text-gray-500">{{ user.phone }}</td>
                <td class="py-3.5 text-gray-500">{{ user.dept }}</td>
                <td class="py-3.5">
                  <span
                    class="px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-xs border border-gray-200"
                  >
                    {{ user.role }}
                  </span>
                </td>
                <td class="py-3.5">
                  <span
                    class="flex items-center space-x-1.5"
                    :class="statusColor(user.status)"
                  >
                    <span
                      class="w-1.5 h-1.5 rounded-full"
                      :class="statusDotColor(user.status)"
                    />
                    <span>{{ user.status }}</span>
                  </span>
                </td>
                <td class="py-3.5 pr-6 text-right">
                  <div class="relative inline-block text-left action-menu-container">
                    <button
                      class="text-gray-400 hover:text-[#00b4b6] transition-colors p-1 rounded hover:bg-gray-100"
                      @click.stop="toggleActionMenu(user.id)"
                    >
                      <EllipsisHorizontalIcon class="w-4 h-4" />
                    </button>
                    
                    <!-- 下拉菜单 -->
                    <div
                      v-if="activeActionMenu === user.id"
                      class="absolute right-0 mt-2 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10"
                    >
                      <button
                        class="w-full px-4 py-2 text-sm text-left text-[#00b4b6] hover:bg-gray-50 transition-colors"
                        @click.stop="openRoleManageDialog(user)"
                      >
                        角色管理
                      </button>
                      <div class="border-t border-gray-100 my-1"></div>
                      <button
                        class="w-full px-4 py-2 text-sm text-left text-red-500 hover:bg-red-50 transition-colors"
                        @click.stop="openDeleteMemberDialog(user)"
                      >
                        删除成员
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredUsers.length === 0">
                <td colspan="6" class="py-16 text-center text-gray-400 text-sm">
                  暂无相关人员数据
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 编辑部门弹窗 -->
    <LayoutDialog v-model:open="editDepartmentDialogOpen" max-width="sm">
      <template #header>重命名部门</template>
      <div class="flex flex-col gap-3">
        <label for="organization-edit-department-name" class="sr-only">部门名称</label>
        <input
          id="organization-edit-department-name"
          v-model.trim="editDepartmentName"
          class="w-full bg-[#f5f7fa] border border-transparent rounded-[8px] py-2 px-3 text-sm focus:outline-none focus:border-[#00b4b6] focus:bg-white text-[#333] transition-all"
          placeholder="请输入新的部门名称"
          @keydown.enter.prevent="submitEditDepartment"
          @keydown.esc="closeEditDepartmentDialog"
        />
        <div v-if="editDepartmentError" class="text-xs text-red-500">
          {{ editDepartmentError }}
        </div>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="px-3 py-1.5 text-sm rounded-[8px] border border-gray-200 text-gray-600 hover:bg-gray-50"
            @click="closeEditDepartmentDialog"
          >
            取消
          </button>
          <button
            type="button"
            class="px-3 py-1.5 text-sm rounded-[8px] bg-[#00b4b6] hover:bg-[#009fa1] text-white disabled:opacity-60"
            :disabled="!editDepartmentName || editDepartmentLoading"
            @click="submitEditDepartment"
          >
            {{ editDepartmentLoading ? '保存中...' : '确定' }}
          </button>
        </div>
      </div>
    </LayoutDialog>

    <!-- 删除部门弹窗 -->
    <LayoutDialog v-model:open="deleteDepartmentDialogOpen" max-width="sm">
      <template #header>删除部门</template>
      <div class="flex flex-col gap-4">
        <div class="text-sm text-gray-600">
          确认要删除部门
          <span class="font-semibold text-[#333]">
            {{ deleteDepartmentTarget?.name }}
          </span>
          ？删除后该部门下的成员将被移出。
        </div>
        <div v-if="deleteDepartmentError" class="text-xs text-red-500">
          {{ deleteDepartmentError }}
        </div>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="px-3 py-1.5 text-sm rounded-[8px] border border-gray-200 text-gray-600 hover:bg-gray-50"
            :disabled="deleteDepartmentLoading"
            @click="closeDepartmentDeleteDialog"
          >
            取消
          </button>
          <button
            type="button"
            class="px-3 py-1.5 text-sm rounded-[8px] bg-red-500 hover:bg-red-600 text-white disabled:opacity-60"
            :disabled="deleteDepartmentLoading"
            @click="submitDeleteDepartment"
          >
            {{ deleteDepartmentLoading ? '删除中...' : '确定删除' }}
          </button>
        </div>
      </div>
    </LayoutDialog>

    <LayoutDialog v-model:open="createDepartmentDialogOpen" max-width="sm">
      <template #header>新建部门</template>
      <div class="flex flex-col gap-3">
        <div class="text-sm text-gray-500">请输入部门名称</div>
        <div class="text-xs text-gray-400">
          {{
            createDepartmentParentName
              ? `父部门：${createDepartmentParentName}`
              : '当前将创建一级部门'
          }}
        </div>
        <label for="organization-new-department-name" class="sr-only">部门名称</label>
        <input
          id="organization-new-department-name"
          v-model.trim="newDepartmentName"
          class="w-full bg-[#f5f7fa] border border-transparent rounded-[8px] py-2 px-3 text-sm focus:outline-none focus:border-[#00b4b6] focus:bg-white text-[#333] transition-all"
          placeholder="请输入部门名称"
          @keydown.enter.prevent="submitCreateDepartment"
          @keydown.esc="closeCreateDepartmentDialog"
        />
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="px-3 py-1.5 text-sm rounded-[8px] border border-gray-200 text-gray-600 hover:bg-gray-50"
            @click="closeCreateDepartmentDialog"
          >
            取消
          </button>
          <button
            type="button"
            class="px-3 py-1.5 text-sm rounded-[8px] bg-[#00b4b6] hover:bg-[#009fa1] text-white disabled:opacity-60"
            :disabled="!newDepartmentName || createDepartmentLoading"
            @click="submitCreateDepartment"
          >
            {{ createDepartmentLoading ? '创建中...' : '确定' }}
          </button>
        </div>
      </div>
    </LayoutDialog>

    <LayoutDialog v-model:open="createMemberDialogOpen" max-width="sm">
      <template #header>新增成员</template>
      <div class="flex flex-col gap-3">
        <div class="text-sm text-gray-500">请填写成员信息</div>
        <div class="flex flex-col gap-1">
          <label for="member-name-input" class="text-xs text-gray-500 font-medium">
            姓名
            <span class="text-red-500">*</span>
          </label>
          <input
            id="member-name-input"
            v-model.trim="newMemberForm.name"
            type="text"
            placeholder="请输入姓名"
            class="focus-brand w-full bg-[#f5f7fa] border border-transparent rounded-[8px] py-2 px-3 text-sm focus:outline-none text-[#333] transition-all"
            :disabled="createMemberLoading"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label for="member-phone-input" class="text-xs text-gray-500 font-medium">
            手机号
            <span class="text-red-500">*</span>
          </label>
          <input
            id="member-phone-input"
            v-model.trim="newMemberForm.phone"
            type="tel"
            placeholder="请输入手机号"
            class="focus-brand w-full bg-[#f5f7fa] border border-transparent rounded-[8px] py-2 px-3 text-sm focus:outline-none text-[#333] transition-all"
            :disabled="createMemberLoading"
          />
        </div>
        <div class="text-xs text-gray-400">部门：{{ activeRow?.name || '未选择' }}</div>
        <div v-if="memberFormError" class="text-xs text-red-500">
          {{ memberFormError }}
        </div>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="px-3 py-1.5 text-sm rounded-[8px] border border-gray-200 text-gray-600 hover:bg-gray-50"
            @click="closeCreateMemberDialog"
          >
            取消
          </button>
          <button
            type="button"
            class="px-3 py-1.5 text-sm rounded-[8px] bg-[#00b4b6] hover:bg-[#009fa1] text-white disabled:opacity-60"
            :disabled="
              !newMemberForm.name || !newMemberForm.phone || createMemberLoading
            "
            @click="submitCreateMember"
          >
            {{ createMemberLoading ? '添加中...' : '确定' }}
          </button>
        </div>
      </div>
    </LayoutDialog>

    <LayoutDialog v-model:open="deleteMemberDialogOpen" max-width="sm">
      <template #header>删除成员</template>
      <div class="flex flex-col gap-4">
        <div class="text-sm text-gray-600">
          确认要删除成员
          <span class="font-semibold text-[#333]">{{ deleteMemberTarget?.name }}</span>
          ？
        </div>
        <div class="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          ⚠️ 警告：该操作将永久删除该用户账号，且无法恢复！
        </div>
        <div v-if="deleteMemberError" class="text-xs text-red-500">
          {{ deleteMemberError }}
        </div>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="px-3 py-1.5 text-sm rounded-[8px] border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            :disabled="deleteMemberLoading"
            @click="closeDeleteMemberDialog"
          >
            取消
          </button>
          <button
            type="button"
            class="px-3 py-1.5 text-sm rounded-[8px] bg-red-500 hover:bg-red-600 text-white disabled:opacity-60 transition-colors"
            :disabled="deleteMemberLoading"
            @click="submitDeleteMember"
          >
            {{ deleteMemberLoading ? '删除中...' : '确定删除' }}
          </button>
        </div>
      </div>
    </LayoutDialog>

    <!-- 角色管理弹窗 -->
    <LayoutDialog v-model:open="roleManageDialogOpen" max-width="sm">
      <template #header>角色管理</template>
      <div class="flex flex-col gap-4">
        <div class="text-sm text-gray-600">
          为成员
          <span class="font-semibold text-[#333]">{{ roleManageTarget?.name }}</span>
          分配角色
        </div>
        
        <div class="flex flex-col gap-2">
          <label class="text-xs text-gray-500 font-medium">
            选择角色
            <span class="text-red-500">*</span>
          </label>
          <div class="max-h-48 overflow-y-auto border border-gray-200 rounded-[8px] p-2 space-y-1">
            <div
              v-for="role in roleList"
              :key="role.id"
              class="flex items-center px-3 py-2 rounded cursor-pointer transition-colors"
              :class="selectedRoleId === role.id ? 'bg-[#e6f7f8] border border-[#00b4b6]' : 'hover:bg-gray-50 border border-transparent'"
              @click="selectedRoleId = role.id"
            >
              <div
                class="w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center"
                :class="selectedRoleId === role.id ? 'border-[#00b4b6] bg-[#00b4b6]' : 'border-gray-300'"
              >
                <div v-if="selectedRoleId === role.id" class="w-1.5 h-1.5 rounded-full bg-white"></div>
              </div>
              <span class="text-sm text-[#333]">{{ role.name }}</span>
            </div>
            <div v-if="roleList.length === 0" class="text-center py-4 text-sm text-gray-400">
              暂无可用角色
            </div>
          </div>
        </div>

        <div v-if="roleManageError" class="text-xs text-red-500">
          {{ roleManageError }}
        </div>
        
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="px-3 py-1.5 text-sm rounded-[8px] border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            :disabled="roleManageLoading"
            @click="closeRoleManageDialog"
          >
            取消
          </button>
          <button
            type="button"
            class="px-3 py-1.5 text-sm rounded-[8px] bg-[#00b4b6] hover:bg-[#009fa1] text-white disabled:opacity-60 transition-colors"
            :disabled="!selectedRoleId || roleManageLoading"
            @click="submitRoleUpdate"
          >
            {{ roleManageLoading ? '更新中...' : '确定' }}
          </button>
        </div>
      </div>
    </LayoutDialog>
  </div>
</template>

<script setup lang="ts">
import {
  PlusIcon,
  MagnifyingGlassIcon as SearchIcon,
  BuildingOfficeIcon as BuildingIcon,
  EllipsisHorizontalIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/vue/24/outline'
import { useApolloClient, useMutation, useQuery } from '@vue/apollo-composable'
import { gql } from 'graphql-tag'
import { registerAndGetAccessCode } from '~~/lib/auth/services/auth'
import { randomString } from '~~/lib/common/helpers/random'
import { useRuntimeConfig } from '#app'
import { useApiOrigin } from '~~/composables/env'
import { ToastNotificationType, useGlobalToast } from '~~/lib/common/composables/toast'

type OrganizationTreeRow = {
  id: string
  name: string
  count: number
  level: number
  type: 'unit'
  organizationId: string
  children?: DepartmentTreeNode[]
  hasChildren: boolean
}
type MemberStatus = '正常' | '离线' | '禁用'
type MemberRow = {
  id: string
  name: string
  phone: string
  dept: string
  role: string
  status: MemberStatus
  organizationId: string
  nodeId: string
}
type DepartmentTreeNode = {
  id: string
  name: string
  parentId?: string | null
  path?: string
  children?: DepartmentTreeNode[]
}
type DepartmentUser = {
  id: string
  name?: string | null
  role?: string | null
  verified?: boolean | null
  email?: string | null
}

const departmentTreeQuery = gql`
  query DepartmentTreeData {
    departmentTree {
      id
      name
      parentId
      path
      children {
        id
        name
        parentId
        path
        children {
          id
          name
          parentId
          path
          children {
            id
            name
            parentId
            path
          }
        }
      }
    }
  }
`

const createDepartmentMutation = gql`
  mutation CreateDepartment($name: String!, $parentId: String) {
    departmentMutations {
      create(input: { name: $name, parentId: $parentId }) {
        id
      }
    }
  }
`

const departmentUsersQuery = gql`
  query DepartmentUsersData($departmentId: String!) {
    departmentUsers(departmentId: $departmentId) {
      id
      name
      role
      verified
      email
    }
  }
`

const addDepartmentMemberMutation = gql`
  mutation AddDepartmentMember(
    $departmentId: String!
    $userIds: [String!]!
    $title: String
  ) {
    departmentMutations {
      addMember(
        input: { departmentId: $departmentId, userIds: $userIds, title: $title }
      )
    }
  }
`

const memberSearchUsersQuery = gql`
  query OrganizationMemberSearchUsers($query: String!, $limit: Int!, $cursor: String) {
    users(input: { query: $query, limit: $limit, cursor: $cursor, projectId: null }) {
      items {
        id
        name
        email
      }
    }
  }
`

const activeOrg = ref<string | null>(null)
const searchQuery = ref('')
const collapsedOrgs = ref<Set<string>>(new Set())
const createDepartmentDialogOpen = ref(false)
const newDepartmentName = ref('')
const createDepartmentParentId = ref<string | null>(null)
const createDepartmentParentName = ref('')
const createMemberDialogOpen = ref(false)
const createMemberLoading = ref(false)
const memberFormError = ref('')
const newMemberForm = ref({
  name: '',
  phone: ''
})
const apolloClient = useApolloClient().client
const runtimeConfig = useRuntimeConfig()
const { triggerNotification: triggerToast } = useGlobalToast()

// 角色相关数据
const roleList = ref<Array<{ id: string; name: string }>>([])
const userRoleMap = ref<Map<string, string>>(new Map()) // userId -> roleName

const apiOrigin = useApiOrigin()
const ROLE_API_BASE = `${apiOrigin}/api/v1/custom-roles`

const { result: departmentTreeResult, refetch: refetchDepartmentTree } =
  useQuery(departmentTreeQuery)

const departmentTreeNodes = computed<DepartmentTreeNode[]>(() => {
  const tree = (departmentTreeResult.value?.departmentTree ||
    []) as DepartmentTreeNode[]
  return tree
})

const buildDepartmentTreeRows = (
  nodes: DepartmentTreeNode[],
  organizationId: string,
  level = 1
): OrganizationTreeRow[] => {
  const rows: OrganizationTreeRow[] = []
  nodes.forEach((node) => {
    const children = node.children || []
    rows.push({
      id: node.id,
      name: node.name,
      count: children.length,
      level,
      type: 'unit',
      organizationId,
      children: children.length > 0 ? children : undefined,
      hasChildren: children.length > 0
    })
    if (children.length) {
      rows.push(...buildDepartmentTreeRows(children, organizationId, level + 1))
    }
  })
  return rows
}

const orgTree = computed<OrganizationTreeRow[]>(() => {
  return buildDepartmentTreeRows(departmentTreeNodes.value, 'departments-root')
})

watch(
  orgTree,
  (rows) => {
    if (!rows.length) {
      activeOrg.value = null
      return
    }

    if (!activeOrg.value || !rows.some((row) => row.id === activeOrg.value)) {
      activeOrg.value = rows[0].id
    }
  },
  { immediate: true }
)

const activeRow = computed(() => {
  return orgTree.value.find((row) => row.id === activeOrg.value) || null
})
const activeDepartmentId = computed(() => {
  return activeRow.value?.id || null
})

const selectTreeRow = (row: OrganizationTreeRow) => {
  activeOrg.value = row.id
}

const toggleCollapse = (row: OrganizationTreeRow) => {
  if (!row.hasChildren) return
  
  if (collapsedOrgs.value.has(row.id)) {
    collapsedOrgs.value.delete(row.id)
  } else {
    collapsedOrgs.value.add(row.id)
  }
  // 触发响应式更新
  collapsedOrgs.value = new Set(collapsedOrgs.value)
}

const isCollapsed = (rowId: string) => {
  return collapsedOrgs.value.has(rowId)
}

const shouldShowRow = (row: OrganizationTreeRow): boolean => {
  // 检查所有父级是否被折叠
  const orgTreeArray = orgTree.value
  const rowIndex = orgTreeArray.findIndex(r => r.id === row.id)
  if (rowIndex === -1) return true
  
  // 向前查找所有层级小于当前行的父级
  for (let i = rowIndex - 1; i >= 0; i--) {
    const parentRow = orgTreeArray[i]
    if (parentRow.level < row.level) {
      // 找到一个父级，检查是否被折叠
      if (collapsedOrgs.value.has(parentRow.id)) {
        return false
      }
      // 继续查找更上层
      if (parentRow.level === 1) break
    }
  }
  return true
}

const { result: departmentUsersResult, refetch: refetchDepartmentUsers } = useQuery(
  departmentUsersQuery,
  () => ({
    departmentId: activeDepartmentId.value as string
  }),
  () => ({
    enabled: !!activeDepartmentId.value
  })
)

const activeMemberRows = computed<MemberRow[]>(() => {
  const departmentId = activeDepartmentId.value
  const departmentName = activeRow.value?.name
  if (!departmentId || !departmentName) return []

  const users = (departmentUsersResult.value?.departmentUsers || []) as DepartmentUser[]
  return users.map((user) => {
    const roleName = userRoleMap.value.get(user.id) || '暂无'
    return {
      id: user.id,
      name: user.name || user.id,
      phone: user.email || '-',
      dept: departmentName,
      role: roleName,
      status: user.verified === false ? '离线' : '正常',
      organizationId: 'departments-root',
      nodeId: departmentId
    }
  })
})

const filteredUsers = computed(() => {
  const keyword = searchQuery.value.trim()

  return activeMemberRows.value.filter((u) => {
    if (!keyword) return true
    return u.name.includes(keyword) || u.phone.includes(keyword)
  })
})

const deleteMemberDialogOpen = ref(false)
const deleteMemberLoading = ref(false)
const deleteMemberError = ref('')
const deleteMemberTarget = ref<MemberRow | null>(null)

// 操作菜单控制
const activeActionMenu = ref<string | null>(null)

const removeDepartmentMemberMutation = gql`
  mutation RemoveDepartmentMember($departmentId: String!, $userId: String!) {
    departmentMutations {
      removeMember(input: { departmentId: $departmentId, userId: $userId })
    }
  }
`

const adminDeleteUserMutation = gql`
  mutation OrganizationAdminDeleteUser($userConfirmation: UserDeleteInput!) {
    adminDeleteUser(userConfirmation: $userConfirmation)
  }
`

const updateDepartmentMutation = gql`
  mutation UpdateDepartment($id: String!, $name: String!) {
    departmentMutations {
      update(input: { id: $id, name: $name }) {
        id
        name
      }
    }
  }
`

const deleteDepartmentMutation = gql`
  mutation DeleteDepartment($id: String!) {
    departmentMutations {
      delete(input: { id: $id })
    }
  }
`

// 编辑部门
const editDepartmentDialogOpen = ref(false)
const editDepartmentName = ref('')
const editDepartmentLoading = ref(false)
const editDepartmentError = ref('')
const editDepartmentTarget = ref<OrganizationTreeRow | null>(null)

const openEditDepartmentDialog = (org: OrganizationTreeRow) => {
  editDepartmentTarget.value = org
  editDepartmentName.value = org.name
  editDepartmentError.value = ''
  editDepartmentDialogOpen.value = true
}

const closeEditDepartmentDialog = () => {
  editDepartmentDialogOpen.value = false
  editDepartmentName.value = ''
  editDepartmentError.value = ''
  editDepartmentTarget.value = null
}

const submitEditDepartment = async () => {
  if (editDepartmentLoading.value || !editDepartmentTarget.value) return
  const name = editDepartmentName.value.trim()
  if (!name) return
  editDepartmentLoading.value = true
  editDepartmentError.value = ''
  try {
    await apolloClient.mutate({
      mutation: updateDepartmentMutation,
      variables: { id: editDepartmentTarget.value.id, name }
    })
    await refetchDepartmentTree()
    closeEditDepartmentDialog()
  } catch (e) {
    editDepartmentError.value = e instanceof Error ? e.message : '保存失败，请重试'
  } finally {
    editDepartmentLoading.value = false
  }
}

// 删除部门
const deleteDepartmentDialogOpen = ref(false)
const deleteDepartmentLoading = ref(false)
const deleteDepartmentError = ref('')
const deleteDepartmentTarget = ref<OrganizationTreeRow | null>(null)

const openDeleteDepartmentDialog = (org: OrganizationTreeRow) => {
  deleteDepartmentTarget.value = org
  deleteDepartmentError.value = ''
  deleteDepartmentDialogOpen.value = true
}

const closeDepartmentDeleteDialog = () => {
  deleteDepartmentDialogOpen.value = false
  deleteDepartmentTarget.value = null
  deleteDepartmentError.value = ''
}

const submitDeleteDepartment = async () => {
  if (deleteDepartmentLoading.value || !deleteDepartmentTarget.value) return
  deleteDepartmentLoading.value = true
  deleteDepartmentError.value = ''
  try {
    await apolloClient.mutate({
      mutation: deleteDepartmentMutation,
      variables: { id: deleteDepartmentTarget.value.id }
    })
    await refetchDepartmentTree()
    closeDepartmentDeleteDialog()
  } catch (e) {
    deleteDepartmentError.value = e instanceof Error ? e.message : '删除失败，请重试'
  } finally {
    deleteDepartmentLoading.value = false
  }
}

const { mutate: createDepartmentMutate, loading: createDepartmentLoading } =
  useMutation(createDepartmentMutation)
const { mutate: addDepartmentMemberMutate } = useMutation(addDepartmentMemberMutation)

const openCreateRootDepartmentDialog = () => {
  createDepartmentParentId.value = null
  createDepartmentParentName.value = ''
  createDepartmentDialogOpen.value = true
}

const openCreateChildDepartmentDialog = (row: OrganizationTreeRow) => {
  createDepartmentParentId.value = row.id
  createDepartmentParentName.value = row.name
  createDepartmentDialogOpen.value = true
}

const closeCreateDepartmentDialog = () => {
  createDepartmentDialogOpen.value = false
  newDepartmentName.value = ''
  createDepartmentParentId.value = null
  createDepartmentParentName.value = ''
}

const submitCreateDepartment = async () => {
  if (createDepartmentLoading.value) return

  const name = newDepartmentName.value.trim()
  if (!name) return
  const parentId = createDepartmentParentId.value

  await createDepartmentMutate({
    name,
    parentId
  })

  closeCreateDepartmentDialog()
  await refetchDepartmentTree()
}

const openCreateMemberDialog = () => {
  if (!activeDepartmentId.value && orgTree.value.length) {
    activeOrg.value = orgTree.value[0].id
  }
  memberFormError.value = ''
  createMemberDialogOpen.value = true
}

const closeCreateMemberDialog = () => {
  createMemberDialogOpen.value = false
  memberFormError.value = ''
  newMemberForm.value = {
    name: '',
    phone: ''
  }
}

const submitCreateMember = async () => {
  if (createMemberLoading.value) return

  const departmentId = activeDepartmentId.value
  if (!departmentId) {
    memberFormError.value = '请先选择一个部门后再新增成员'
    return
  }

  const name = newMemberForm.value.name.trim()
  const phone = newMemberForm.value.phone.trim()

  if (!name) {
    memberFormError.value = '请输入姓名'
    return
  }
  if (!phone) {
    memberFormError.value = '请输入手机号'
    return
  }
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    memberFormError.value = '请输入有效的手机号'
    return
  }

  createMemberLoading.value = true
  memberFormError.value = ''
  try {
    // Step 1: 调用注册接口创建账号（手机号作 email，密码固定）
    const apiOrigin = runtimeConfig.public.apiOrigin as string
    const challenge = randomString(10)
    await registerAndGetAccessCode({
      apiOrigin,
      challenge,
      user: {
        email: phone,
        password: '51World@51',
        name
      }
    }).catch((err: unknown) => {
      // 如果账号已存在，尝试继续查找用户并加入部门
      const msg = err instanceof Error ? err.message : String(err)
      if (!msg.includes('already') && !msg.includes('exists') && !msg.includes('已')) {
        throw err
      }
    })

    // Step 2: 同时调用第三方注册接口（使用代理避免CORS）
    try {
      const dtpOrigin = useDtpApiOrigin()
      const thirdPartyRegisterUrl = `${dtpOrigin}/v1/oauth/third-party/register`
      await fetch(thirdPartyRegisterUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          username: name,
          mobile: phone
        })
      })
      console.log('第三方注册成功')
    } catch (thirdPartyError) {
      // 第三方注册失败不影响主流程
      console.warn('第三方注册失败，但主注册成功:', thirdPartyError)
    }

    // Step 3: 通过手机号搜索用户得到 userId
    const searchResp = await apolloClient.query({
      query: memberSearchUsersQuery,
      variables: { query: phone, limit: 5, cursor: null },
      fetchPolicy: 'network-only'
    })
    const foundUsers =
      (
        searchResp.data as {
          users?: { items?: Array<{ id: string; name: string | null }> | null } | null
        }
      ).users?.items || []
    const matched = foundUsers.find((u) => u.name === name) || foundUsers[0]
    if (!matched) {
      memberFormError.value = '创建账号后未找到用户，请重试'
      return
    }

    // Step 4: 将用户加入当前部门
    await addDepartmentMemberMutate({
      departmentId,
      userIds: [matched.id],
      title: null
    })
    await refetchDepartmentUsers({ departmentId })
    closeCreateMemberDialog()
  } catch (e) {
    memberFormError.value = e instanceof Error ? e.message : '添加失败，请重试'
  } finally {
    createMemberLoading.value = false
  }
}

const openDeleteMemberDialog = (user: MemberRow) => {
  deleteMemberTarget.value = user
  deleteMemberError.value = ''
  deleteMemberDialogOpen.value = true
  activeActionMenu.value = null // 关闭下拉菜单
}

const closeDeleteMemberDialog = () => {
  deleteMemberDialogOpen.value = false
  deleteMemberTarget.value = null
  deleteMemberError.value = ''
}

const submitDeleteMember = async () => {
  if (deleteMemberLoading.value || !deleteMemberTarget.value) return

  deleteMemberLoading.value = true
  deleteMemberError.value = ''
  try {
    const userId = deleteMemberTarget.value.id
    const userName = deleteMemberTarget.value.name
    const userPhone = deleteMemberTarget.value.phone

    // 使用 adminDeleteUser 删除用户账号（需要 email 作为标识）
    await apolloClient.mutate({
      mutation: adminDeleteUserMutation,
      variables: {
        userConfirmation: {
          email: userPhone // 使用手机号作为 email 标识
        }
      }
    })

    // 刷新部门用户列表
    await refetchDepartmentUsers({ departmentId: activeDepartmentId.value as string })
    
    // 显示成功提示
    triggerToast({
      type: ToastNotificationType.Success,
      title: '删除成功',
      description: `用户 ${userName} 已被永久删除`
    })
    
    closeDeleteMemberDialog()
  } catch (e) {
    deleteMemberError.value = e instanceof Error ? e.message : '删除失败，请重试'
  } finally {
    deleteMemberLoading.value = false
  }
}

// 切换操作菜单
const toggleActionMenu = (userId: string) => {
  activeActionMenu.value = activeActionMenu.value === userId ? null : userId
}

// 关闭操作菜单
const closeActionMenu = () => {
  activeActionMenu.value = null
}

// 角色管理对话框
const roleManageDialogOpen = ref(false)
const roleManageLoading = ref(false)
const roleManageError = ref('')
const roleManageTarget = ref<MemberRow | null>(null)
const selectedRoleId = ref<string>('')

const openRoleManageDialog = (user: MemberRow) => {
  roleManageTarget.value = user
  roleManageError.value = ''
  
  // 查找用户当前的角色
  const currentRole = roleList.value.find(r => r.name === user.role)
  selectedRoleId.value = currentRole?.id || ''
  
  roleManageDialogOpen.value = true
  activeActionMenu.value = null // 关闭下拉菜单
}

const closeRoleManageDialog = () => {
  roleManageDialogOpen.value = false
  roleManageTarget.value = null
  roleManageError.value = ''
  selectedRoleId.value = ''
}

const submitRoleUpdate = async () => {
  if (roleManageLoading.value || !roleManageTarget.value) return
  
  if (!selectedRoleId.value) {
    roleManageError.value = '请选择一个角色'
    return
  }

  roleManageLoading.value = true
  roleManageError.value = ''
  
  try {
    const userId = roleManageTarget.value.id
    const selectedRole = roleList.value.find(r => r.id === selectedRoleId.value)
    
    if (!selectedRole) {
      roleManageError.value = '所选角色不存在'
      return
    }

    // 首先获取用户当前的角色信息
    let currentRoleId: string | null = null
    try {
      const permRes = await $fetch<{ roleId: string | null }>(
        `${ROLE_API_BASE}/users/${userId}/effective-permissions`,
        { method: 'GET' }
      )
      currentRoleId = permRes.roleId
    } catch (e) {
      console.log('用户可能还没有分配角色')
    }

    // 如果用户已经有角色，先移除
    if (currentRoleId) {
      await $fetch(`${ROLE_API_BASE}/${currentRoleId}/users/${userId}`, {
        method: 'DELETE'
      })
    }

    // 将用户添加到新角色
    await $fetch(`${ROLE_API_BASE}/${selectedRoleId.value}/users`, {
      method: 'POST',
      body: {
        userIds: [userId]
      }
    })

    // 刷新角色数据
    await loadRoleData()
    await refetchDepartmentUsers({ departmentId: activeDepartmentId.value as string })
    
    // 显示成功提示
    triggerToast({
      type: ToastNotificationType.Success,
      title: '角色更新成功',
      description: `用户 ${roleManageTarget.value.name} 的角色已更新为 ${selectedRole.name}`
    })
    
    closeRoleManageDialog()
  } catch (e) {
    roleManageError.value = e instanceof Error ? e.message : '更新角色失败，请重试'
  } finally {
    roleManageLoading.value = false
  }
}

// 监听窗口点击事件，关闭菜单
const handleClickOutside = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (!target.closest('.action-menu-container')) {
    closeActionMenu()
  }
}

if (import.meta.client) {
  onMounted(() => {
    document.addEventListener('click', handleClickOutside)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('click', handleClickOutside)
  })
}

watch(activeDepartmentId, (departmentId) => {
  if (!departmentId) return
  refetchDepartmentUsers({
    departmentId
  })
})

watch(createMemberDialogOpen, (open) => {
  if (open) {
    memberFormError.value = ''
  }
})

const statusColor = (status: string) => {
  if (status === '正常') return 'text-green-600'
  if (status === '离线') return 'text-gray-400'
  return 'text-red-500'
}

const statusDotColor = (status: string) => {
  if (status === '正常') return 'bg-green-500'
  if (status === '离线') return 'bg-gray-400'
  return 'bg-red-500'
}

// 加载角色列表并构建用户角色映射
const loadRoleData = async () => {
  try {
    // 获取所有角色
    const rolesRes = await $fetch<{ items: Array<{ id: string; name: string }> }>(
      ROLE_API_BASE,
      { method: 'GET' }
    )
    roleList.value = rolesRes.items || []

    // 构建用户 ID 到角色名称的映射
    const userRoleMapping = new Map<string, string>()

    // 遍历所有角色，获取每个角色下的用户
    for (const role of roleList.value) {
      try {
        const usersRes = await $fetch<{
          items: Array<{ userId: string; userName: string }>
        }>(`${ROLE_API_BASE}/${role.id}/users`, { method: 'GET' })

        const roleUsers = usersRes.items || []
        roleUsers.forEach((user) => {
          // 如果用户还没有被分配角色，或者当前角色优先级更高，则更新映射
          if (!userRoleMapping.has(user.userId)) {
            userRoleMapping.set(user.userId, role.name)
          }
        })
      } catch (e) {
        console.error(`加载角色 ${role.name} 的用户失败:`, e)
      }
    }

    userRoleMap.value = userRoleMapping
  } catch (e) {
    console.error('加载角色数据失败:', e)
  }
}

// 在组件挂载时加载角色数据
onMounted(() => {
  loadRoleData()
})

// 监听部门用户变化，重新加载角色数据
watch(departmentUsersResult, () => {
  loadRoleData()
})
</script>

<style scoped>
/* 强制覆盖输入框聚焦时的边框颜色与背景色 */
.focus-brand:focus,
.focus-brand:focus-visible {
  border: 1px solid #00b4b6 !important;
  background-color: #ffffff !important;
  outline: none !important;
  box-shadow: none !important;
}
</style>
