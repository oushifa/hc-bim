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
        <span>添加成员</span>
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
          <button
            v-for="org in orgTree"
            :key="org.id"
            class="w-full flex items-center justify-between px-3 py-2 rounded-[8px] text-sm transition-colors"
            type="button"
            :style="{ paddingLeft: `${org.level * 12 + 12}px` }"
            :class="
              activeOrg === org.id
                ? 'bg-[#e6f7f8] text-[#00b4b6] font-medium'
                : 'text-gray-600 hover:bg-gray-100'
            "
            @click="selectTreeRow(org)"
          >
            <div class="flex items-center space-x-2">
              <BuildingIcon
                class="w-4 h-4"
                :class="activeOrg === org.id ? 'text-[#00b4b6]' : 'text-gray-400'"
              />
              <span>{{ org.name }}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span
                class="text-xs bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full"
              >
                {{ org.count }}
              </span>
              <span
                class="inline-flex items-center justify-center w-5 h-5 rounded text-gray-400 hover:text-[#00b4b6] hover:bg-white"
                role="button"
                tabindex="0"
                title="新增子部门"
                @click.stop="openCreateChildDepartmentDialog(org)"
                @keydown.enter.stop.prevent="openCreateChildDepartmentDialog(org)"
                @keydown.space.stop.prevent="openCreateChildDepartmentDialog(org)"
              >
                <PlusIcon class="w-3.5 h-3.5" />
              </span>
            </div>
          </button>
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
                搜索姓名或工号
              </label>
              <input
                id="organization-member-search"
                v-model="searchQuery"
                type="text"
                placeholder="搜索姓名/工号..."
                class="w-56 bg-[#f5f7fa] border border-transparent rounded-[8px] py-1.5 pl-9 pr-4 text-sm focus:outline-none focus:border-[#00b4b6] focus:bg-white text-[#333] transition-all"
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
                <th class="py-3 font-medium">工号</th>
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
                <td class="py-3.5 text-gray-500">{{ user.empNo }}</td>
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
                  <button
                    class="text-[#00b4b6] hover:text-[#009fa1] text-sm font-medium mr-4 transition-colors"
                  >
                    角色管理
                  </button>
                  <button class="text-gray-400 hover:text-[#00b4b6] transition-colors">
                    <EllipsisHorizontalIcon class="w-4 h-4" />
                  </button>
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
      <template #header>添加成员</template>
      <div class="flex flex-col gap-3">
        <div class="text-sm text-gray-500">请填写成员信息</div>
        <label :for="memberSelectButtonId" class="sr-only">成员用户</label>
        <FormSelectBase
          v-model="selectedMemberUsers"
          :items="memberUserOptions"
          :multiple="true"
          :search="true"
          label="成员用户"
          :show-label="false"
          name="organization-member-user-select"
          by="id"
          :label-id="memberSelectLabelId"
          :button-id="memberSelectButtonId"
          search-placeholder="输入用户名搜索"
          :get-search-results="invokeSearchMemberUsers"
        >
          <template #nothing-selected>请选择成员（可多选）</template>
          <template #something-selected="{ value }">
            <span v-if="Array.isArray(value) && value.length" class="truncate">
              {{ value.map((item) => item.name).join(', ') }}
            </span>
            <span v-else-if="!Array.isArray(value)" class="truncate">
              {{ value.name }} ({{ value.id }})
            </span>
            <span v-else class="truncate">请选择成员</span>
          </template>
          <template #option="{ item }">
            <span class="truncate">{{ item.name }} ({{ item.id }})</span>
          </template>
        </FormSelectBase>
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
            :disabled="!newMemberForm.userIds.length || createMemberLoading"
            @click="submitCreateMember"
          >
            {{ createMemberLoading ? '添加中...' : '确定' }}
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
  EllipsisHorizontalIcon,
  BuildingOfficeIcon as BuildingIcon
} from '@heroicons/vue/24/outline'
import { useApolloClient, useMutation, useQuery } from '@vue/apollo-composable'
import { gql } from 'graphql-tag'

type OrganizationTreeRow = {
  id: string
  name: string
  count: number
  level: number
  type: 'unit'
  organizationId: string
}
type MemberStatus = '正常' | '离线' | '禁用'
type MemberRow = {
  id: string
  name: string
  empNo: string
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
}
type MemberUserOption = {
  id: string
  name: string
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
      }
    }
  }
`

const activeOrg = ref<string | null>(null)
const searchQuery = ref('')
const createDepartmentDialogOpen = ref(false)
const newDepartmentName = ref('')
const createDepartmentParentId = ref<string | null>(null)
const createDepartmentParentName = ref('')
const createMemberDialogOpen = ref(false)
const createMemberLoading = ref(false)
const memberFormError = ref('')
const newMemberForm = ref({
  userIds: [] as string[],
  title: ''
})
const memberUserOptions = ref<MemberUserOption[]>([])
const memberSelectLabelId = useId()
const memberSelectButtonId = useId()
const apolloClient = useApolloClient().client

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
      organizationId
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
  return users.map((user) => ({
    id: user.id,
    name: user.name || user.id,
    empNo: user.id.toUpperCase().slice(0, 8),
    dept: departmentName,
    role: user.role || '普通成员',
    status: user.verified === false ? '离线' : '正常',
    organizationId: 'departments-root',
    nodeId: departmentId
  }))
})

const filteredUsers = computed(() => {
  const keyword = searchQuery.value.trim()

  return activeMemberRows.value.filter((u) => {
    if (!keyword) return true
    return u.name.includes(keyword) || u.empNo.includes(keyword)
  })
})

const { mutate: createDepartmentMutate, loading: createDepartmentLoading } =
  useMutation(createDepartmentMutation)
const { mutate: addDepartmentMemberMutate } = useMutation(addDepartmentMemberMutation)

const selectedMemberUsers = computed({
  get: () => {
    const selectedIds = newMemberForm.value.userIds
    return memberUserOptions.value.filter((item) => selectedIds.includes(item.id))
  },
  set: (newValue: MemberUserOption[] | MemberUserOption | undefined) => {
    if (Array.isArray(newValue)) {
      newMemberForm.value.userIds = newValue.map((item) => item.id)
      return
    }
    newMemberForm.value.userIds = newValue ? [newValue.id] : []
  }
})

const loadMemberUserOptions = async (searchKeyword: string) => {
  const normalizedQuery = searchKeyword.trim().length ? searchKeyword.trim() : '%'
  const response = await apolloClient.query({
    query: memberSearchUsersQuery,
    variables: {
      query: normalizedQuery,
      limit: 50,
      cursor: null
    },
    fetchPolicy: 'network-only'
  })

  const users =
    (
      response.data as {
        users?: { items?: Array<{ id: string; name: string | null }> | null } | null
      }
    ).users?.items || []

  memberUserOptions.value = users.map((user) => ({
    id: user.id,
    name: user.name || user.id
  }))

  return memberUserOptions.value
}

const invokeSearchMemberUsers = async (searchKeyword: string) =>
  await loadMemberUserOptions(searchKeyword)

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
    userIds: [],
    title: ''
  }
}

const submitCreateMember = async () => {
  if (createMemberLoading.value) return

  const departmentId = activeDepartmentId.value
  if (!departmentId) {
    memberFormError.value = '请先选择一个部门后再添加成员'
    return
  }

  const selectedUserIds = Array.from(
    new Set(newMemberForm.value.userIds.map((id) => id.trim()).filter(Boolean))
  )
  if (!selectedUserIds.length) {
    memberFormError.value = '请选择至少一个成员'
    return
  }

  const existingUserIdSet = new Set(activeMemberRows.value.map((row) => row.id))
  const pendingUserIds = selectedUserIds.filter((id) => !existingUserIdSet.has(id))
  if (!pendingUserIds.length) {
    memberFormError.value = '所选成员均已在当前部门中'
    return
  }

  createMemberLoading.value = true
  try {
    await addDepartmentMemberMutate({
      departmentId,
      userIds: pendingUserIds,
      title: newMemberForm.value.title.trim() || null
    })
    await refetchDepartmentUsers({
      departmentId
    })
    closeCreateMemberDialog()
  } finally {
    createMemberLoading.value = false
  }
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
    loadMemberUserOptions('')
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
</script>
