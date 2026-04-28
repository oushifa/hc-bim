<template>
  <div class="h-full">
    <!-- Header -->
    <div class="pt-3 pb-3 flex items-center justify-between bg-gray-50">
      <h1 class="text-heading pl-5">权限管理</h1>
      <button
        class="flex items-center space-x-1.5 bg-[#00b4b6] hover:bg-[#009fa1] text-white px-3.5 py-1.5 rounded-[8px] text-sm font-medium transition-colors mr-5"
        @click="openCreateRoleModal"
      >
        <PlusIcon class="w-4 h-4" />
        <span>新建角色</span>
      </button>
    </div>

    <!-- Main Content Card -->
    <div
      class="bg-white overflow-hidden flex relative"
      style="height: calc(100vh - 11rem)"
    >
      <!-- Left: Role List -->
      <div class="w-60 shrink-0 border-r border-gray-100 bg-[#fafbfc] flex flex-col">
        <!-- Left Header -->
        <div
          class="h-12 px-4 border-t border-b border-gray-100 flex items-center justify-between shrink-0"
        >
          <span class="text-sm font-medium text-[#333]">角色列表</span>
        </div>
        <!-- Role Items -->
        <div class="flex-1 overflow-y-auto p-2 space-y-1">
          <div
            v-for="role in roles"
            :key="role.id"
            class="group w-full flex items-center justify-between px-3 py-2 rounded-[8px] text-sm transition-colors cursor-pointer"
            :class="
              activeRoleId === role.id
                ? 'bg-[#e6f7f8] text-[#00b4b6] font-medium'
                : 'text-gray-600 hover:bg-gray-100'
            "
            @click="activeRoleId = role.id"
          >
            <div class="flex items-center space-x-2 truncate pr-1">
              <ShieldCheckIcon
                class="w-4 h-4 shrink-0"
                :class="activeRoleId === role.id ? 'text-[#00b4b6]' : 'text-gray-400'"
              />
              <span class="truncate">{{ role.name }}</span>
            </div>
            <div
              class="flex items-center space-x-0.5 shrink-0 transition-opacity"
              :class="
                activeRoleId === role.id
                  ? 'opacity-100'
                  : 'opacity-0 group-hover:opacity-100'
              "
            >
              <button
                class="p-1 rounded-[6px] text-gray-400 hover:text-[#00b4b6] hover:bg-white/80 transition-colors"
                title="编辑角色"
                @click.stop="openEditRoleModal(role)"
              >
                <PencilIcon class="w-3.5 h-3.5" />
              </button>
              <button
                class="p-1 rounded-[6px] text-gray-400 hover:text-[#00b4b6] hover:bg-white/80 transition-colors"
                title="设置默认权限"
                @click.stop="openEditRolePermsModal(role)"
              >
                <Cog6ToothIcon class="w-3.5 h-3.5" />
              </button>
              <button
                class="p-1 rounded-[6px] text-gray-400 hover:text-red-500 hover:bg-white/80 transition-colors"
                title="删除角色"
                @click.stop="deleteRole(role.id)"
              >
                <TrashIcon class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div v-if="roles.length === 0" class="p-4 text-center text-xs text-gray-400">
            暂无角色，请新建
          </div>
        </div>
      </div>

      <!-- Right: User List -->
      <div class="flex-1 flex flex-col overflow-hidden">
        <!-- Right Toolbar -->
        <div
          class="h-14 px-5 border-t border-b border-gray-100 flex items-center justify-between shrink-0 bg-white"
        >
          <div class="flex items-center space-x-2">
            <!-- <UserGroupIcon class="w-5 h-5 text-[#00b4b6]" /> -->
            <span class="font-medium text-sm text-[#333]">
              {{ activeRole ? activeRole.name + ' - 用户列表' : '请选择角色' }}
            </span>
          </div>
          <button
            class="flex items-center space-x-1.5 bg-[#00b4b6] hover:bg-[#009fa1] text-white px-3.5 py-1.5 rounded-[8px] text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="!activeRole"
            @click="openAddUserModal"
          >
            <UserPlusIcon class="w-4 h-4" />
            <span>添加用户</span>
          </button>
        </div>

        <!-- User Table -->
        <div class="flex-1 overflow-auto p-5">
          <div class="border border-gray-100 rounded-[8px] overflow-hidden">
            <table class="w-full text-left border-collapse">
              <thead class="bg-slate-50/80">
                <tr class="border-b border-gray-100 text-sm text-gray-500">
                  <th class="py-3 px-4 font-medium w-24">用户名</th>
                  <th class="py-3 px-4 font-medium">菜单权限</th>
                  <th class="py-3 px-4 font-medium">模型权限</th>
                  <th class="py-3 px-4 font-medium w-24">状态</th>
                  <th class="py-3 px-4 font-medium text-right w-32">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="user in roleUsers"
                  :key="user.id"
                  class="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                >
                  <td class="py-3 px-4 text-sm text-[#333] font-medium">
                    {{ user.name }}
                  </td>
                  <td class="py-3 px-4 text-xs text-gray-600 leading-relaxed">
                    {{ getMenuPermNames(user.menuPerms) }}
                  </td>
                  <td class="py-3 px-4 text-xs text-gray-600 leading-relaxed">
                    {{ getModelPermNames(user.modelPerms) }}
                  </td>
                  <td class="py-3 px-4 text-sm">
                    <span
                      v-if="isDefaultPerms(user)"
                      class="px-2 py-1 bg-gray-100 text-gray-600 rounded-[6px] text-xs whitespace-nowrap"
                    >
                      默认
                    </span>
                    <span
                      v-else
                      class="px-2 py-1 bg-amber-50 text-amber-600 border border-amber-200 rounded-[6px] text-xs whitespace-nowrap"
                    >
                      非默认
                    </span>
                  </td>
                  <td class="py-3 px-4 text-sm text-right space-x-3 whitespace-nowrap">
                    <button
                      class="text-[#00b4b6] hover:text-[#009fa1] font-medium transition-colors"
                      @click="openEditUserPermsModal(user)"
                    >
                      修改
                    </button>
                    <button
                      class="text-red-400 hover:text-red-600 font-medium transition-colors"
                      @click="removeUser(user.id)"
                    >
                      移除
                    </button>
                  </td>
                </tr>
                <tr v-if="roleUsers.length === 0">
                  <td colspan="5" class="py-16 text-center text-gray-400 text-sm">
                    {{ activeRole ? '当前角色下暂无用户' : '请先从左侧选择一个角色' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ===== Modal: 权限设置 (角色/用户) ===== -->
      <Teleport to="body">
        <div
          v-if="permModal.isOpen"
          class="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50"
          @click.self="permModal.isOpen = false"
        >
          <div
            class="bg-white rounded-[16px] shadow-2xl w-[580px] max-h-[80vh] flex flex-col overflow-hidden"
          >
            <div
              class="px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0"
            >
              <h3 class="text-base font-semibold text-[#333]">
                {{
                  permModal.type === 'role'
                    ? `设置默认权限 · ${
                        roles.find((r) => r.id === permModal.targetId)?.name
                      }`
                    : `修改用户权限 · ${
                        users.find((u) => u.id === permModal.targetId)?.name
                      }`
                }}
              </h3>
              <button
                class="text-gray-400 hover:text-gray-600 transition-colors"
                @click="permModal.isOpen = false"
              >
                <XMarkIcon class="w-5 h-5" />
              </button>
            </div>

            <div class="p-6 overflow-y-auto space-y-7">
              <!-- Menu Perms -->
              <section>
                <h4
                  class="text-xs font-semibold text-gray-400 mb-3 tracking-widest uppercase"
                >
                  菜单功能权限
                </h4>
                <div class="grid grid-cols-2 gap-3">
                  <div
                    v-for="perm in ALL_MENU_PERMS"
                    :key="perm.id"
                    class="flex items-center space-x-3 p-3 rounded-[8px] border cursor-pointer transition-colors"
                    :class="
                      modalMenuPerms.includes(perm.id)
                        ? 'border-[#00b4b6] bg-[#e6f7f8]'
                        : 'border-gray-200 hover:border-[#00b4b6] bg-white'
                    "
                    @click="toggleMenuPerm(perm.id)"
                  >
                    <div
                      class="w-4 h-4 rounded border flex items-center justify-center shrink-0"
                      :class="
                        modalMenuPerms.includes(perm.id)
                          ? 'bg-[#00b4b6] border-[#00b4b6]'
                          : 'border-gray-300'
                      "
                    >
                      <CheckIcon
                        v-if="modalMenuPerms.includes(perm.id)"
                        class="w-3 h-3 text-white"
                      />
                    </div>
                    <span class="text-sm text-[#333] select-none">{{ perm.name }}</span>
                  </div>
                </div>
              </section>

              <div class="h-px bg-gray-100" />

              <!-- Model Perms -->
              <section>
                <h4
                  class="text-xs font-semibold text-gray-400 mb-3 tracking-widest uppercase"
                >
                  模型操作权限
                </h4>
                <div class="grid grid-cols-2 gap-3">
                  <div
                    v-for="perm in ALL_MODEL_PERMS"
                    :key="perm.id"
                    class="flex items-center space-x-3 p-3 rounded-[8px] border cursor-pointer transition-colors"
                    :class="
                      modalModelPerms.includes(perm.id)
                        ? 'border-[#00b4b6] bg-[#e6f7f8]'
                        : 'border-gray-200 hover:border-[#00b4b6] bg-white'
                    "
                    @click="toggleModelPerm(perm.id)"
                  >
                    <div
                      class="w-4 h-4 rounded border flex items-center justify-center shrink-0"
                      :class="
                        modalModelPerms.includes(perm.id)
                          ? 'bg-[#00b4b6] border-[#00b4b6]'
                          : 'border-gray-300'
                      "
                    >
                      <CheckIcon
                        v-if="modalModelPerms.includes(perm.id)"
                        class="w-3 h-3 text-white"
                      />
                    </div>
                    <span class="text-sm text-[#333] select-none">{{ perm.name }}</span>
                  </div>
                </div>
              </section>
            </div>

            <div
              class="px-6 py-4 border-t border-gray-100 flex justify-end space-x-3 shrink-0 bg-gray-50/80"
            >
              <button
                class="px-4 py-2 rounded-[8px] text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                @click="permModal.isOpen = false"
              >
                取消
              </button>
              <button
                class="px-4 py-2 rounded-[8px] text-sm font-medium bg-[#00b4b6] text-white hover:bg-[#009fa1] transition-colors"
                @click="savePerms"
              >
                保存配置
              </button>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- ===== Modal: 新建/编辑角色 ===== -->
      <Teleport to="body">
        <div
          v-if="roleModal.isOpen"
          class="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50"
          @click.self="roleModal.isOpen = false"
        >
          <div
            class="bg-white rounded-[16px] shadow-2xl w-[400px] flex flex-col overflow-hidden"
          >
            <div
              class="px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0"
            >
              <h3 class="text-base font-semibold text-[#333]">
                {{ roleModal.id ? '编辑角色名称' : '新建角色' }}
              </h3>
              <button
                class="text-gray-400 hover:text-gray-600 transition-colors"
                @click="roleModal.isOpen = false"
              >
                <XMarkIcon class="w-5 h-5" />
              </button>
            </div>
            <div class="p-6">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                角色名称
              </label>
              <input
                v-model="roleModal.name"
                type="text"
                placeholder="输入角色名称"
                class="w-full px-3 py-2 border border-gray-300 rounded-[8px] text-sm focus:outline-none focus:border-[#00b4b6] transition-all"
                @keydown.enter="saveRole"
              />
            </div>
            <div
              class="px-6 py-4 border-t border-gray-100 flex justify-end space-x-3 shrink-0 bg-gray-50/80"
            >
              <button
                class="px-4 py-2 rounded-[8px] text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                @click="roleModal.isOpen = false"
              >
                取消
              </button>
              <button
                class="px-4 py-2 rounded-[8px] text-sm font-medium bg-[#00b4b6] text-white hover:bg-[#009fa1] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                :disabled="!roleModal.name.trim()"
                @click="saveRole"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- ===== Modal: 添加用户 ===== -->
      <Teleport to="body">
        <div
          v-if="addUserModalOpen"
          class="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50"
          @click.self="addUserModalOpen = false"
        >
          <div
            class="bg-white rounded-[16px] shadow-2xl w-[480px] flex flex-col overflow-hidden"
          >
            <div
              class="px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0"
            >
              <h3 class="text-base font-semibold text-[#333]">
                从组织架构添加用户到「{{ activeRole?.name }}」
              </h3>
              <button
                class="text-gray-400 hover:text-gray-600 transition-colors"
                @click="addUserModalOpen = false"
              >
                <XMarkIcon class="w-5 h-5" />
              </button>
            </div>
            <div class="p-6">
              <p class="text-sm text-gray-500 mb-4">
                请选择要添加的用户（已过滤当前角色中存在的用户）：
              </p>
              <div
                class="max-h-64 overflow-y-auto border border-gray-200 rounded-[8px]"
              >
                <div
                  v-if="systemUsersLoading"
                  class="py-10 text-center text-sm text-gray-400"
                >
                  加载中...
                </div>
                <template v-else>
                  <label
                    v-for="user in availableOrgUsers"
                    :key="user.id"
                    class="flex items-center px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div
                      class="w-4 h-4 rounded border flex items-center justify-center mr-3 shrink-0"
                      :class="
                        selectedOrgUsers.includes(user.id)
                          ? 'bg-[#00b4b6] border-[#00b4b6]'
                          : 'border-gray-300'
                      "
                      @click="toggleOrgUserSelect(user.id)"
                    >
                      <CheckIcon
                        v-if="selectedOrgUsers.includes(user.id)"
                        class="w-3 h-3 text-white"
                      />
                    </div>
                    <div @click="toggleOrgUserSelect(user.id)">
                      <div class="text-sm font-medium text-[#333]">{{ user.name }}</div>
                    </div>
                  </label>
                  <div
                    v-if="availableOrgUsers.length === 0"
                    class="py-10 text-center text-sm text-gray-400"
                  >
                    所有系统用户均已在该角色中
                  </div>
                </template>
              </div>
            </div>
            <div
              class="px-6 py-4 border-t border-gray-100 flex justify-between items-center shrink-0 bg-gray-50/80"
            >
              <span class="text-sm text-gray-500">
                已选择
                <span class="font-semibold text-[#00b4b6]">
                  {{ selectedOrgUsers.length }}
                </span>
                名用户
              </span>
              <div class="flex space-x-3">
                <button
                  class="px-4 py-2 rounded-[8px] text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                  @click="addUserModalOpen = false"
                >
                  取消
                </button>
                <button
                  class="px-4 py-2 rounded-[8px] text-sm font-medium bg-[#00b4b6] text-white hover:bg-[#009fa1] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  :disabled="selectedOrgUsers.length === 0"
                  @click="confirmAddUsers"
                >
                  确认添加
                </button>
              </div>
            </div>
          </div>
        </div>
      </Teleport>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  PlusIcon,
  XMarkIcon,
  CheckIcon,
  PencilIcon,
  TrashIcon,
  UserPlusIcon,
  ShieldCheckIcon,
  Cog6ToothIcon
} from '@heroicons/vue/24/outline'
import { useApolloClient } from '@vue/apollo-composable'
import { gql } from 'graphql-tag'

// ─── 常量数据 ────────────────────────────────────────────────
const ALL_MENU_PERMS = [
  { id: 'p1', name: '项目管理' },
  { id: 'p2', name: '组织管理' },
  { id: 'p3', name: '权限管理' },
  { id: 'p4', name: '日志管理' },
  { id: 'p5', name: '模型库' }
]

const ALL_MODEL_PERMS = [
  { id: 'm1', name: '上传模型' },
  { id: 'm2', name: '编辑模型' },
  { id: 'm3', name: '下载模型' },
  { id: 'm4', name: '归档模型' }
]

const searchUsersQuery = gql`
  query PermissionsSearchUsers($query: String!, $limit: Int!) {
    users(input: { query: $query, limit: $limit, cursor: null, projectId: null }) {
      items {
        id
        name
      }
    }
  }
`

type SystemUser = { id: string; name: string }

const apolloClient = useApolloClient().client

// ─── 响应式数据 ──────────────────────────────────────────────
const roles = ref<
  Array<{ id: string; name: string; menuPerms: string[]; modelPerms: string[] }>
>([])

const users = ref<
  Array<{
    id: string
    orgUserId: string
    name: string
    roleId: string
    menuPerms: string[]
    modelPerms: string[]
  }>
>([])

const activeRoleId = ref('')
const systemUsers = ref<SystemUser[]>([])
const systemUsersLoading = ref(false)

// ─── 计算属性 ────────────────────────────────────────────────
const activeRole = computed(() => roles.value.find((r) => r.id === activeRoleId.value))
const roleUsers = computed(() =>
  users.value.filter((u) => u.roleId === activeRoleId.value)
)
const availableOrgUsers = computed(() =>
  systemUsers.value.filter(
    (su) => !roleUsers.value.some((ru) => ru.orgUserId === su.id)
  )
)

// ─── 权限弹窗 ────────────────────────────────────────────────
const permModal = ref<{
  isOpen: boolean
  type: 'role' | 'user'
  targetId: string | number | null
}>({
  isOpen: false,
  type: 'role',
  targetId: null
})
const modalMenuPerms = ref<string[]>([])
const modalModelPerms = ref<string[]>([])

const openEditUserPermsModal = (user: (typeof users.value)[0]) => {
  permModal.value = { isOpen: true, type: 'user', targetId: user.id }
  modalMenuPerms.value = [...user.menuPerms]
  modalModelPerms.value = [...user.modelPerms]
}

const openEditRolePermsModal = (role: (typeof roles.value)[0]) => {
  permModal.value = { isOpen: true, type: 'role', targetId: role.id }
  modalMenuPerms.value = [...role.menuPerms]
  modalModelPerms.value = [...role.modelPerms]
}

const toggleMenuPerm = (id: string) => {
  const idx = modalMenuPerms.value.indexOf(id)
  if (idx >= 0) modalMenuPerms.value.splice(idx, 1)
  else modalMenuPerms.value.push(id)
}
const toggleModelPerm = (id: string) => {
  const idx = modalModelPerms.value.indexOf(id)
  if (idx >= 0) modalModelPerms.value.splice(idx, 1)
  else modalModelPerms.value.push(id)
}

const savePerms = () => {
  if (permModal.value.type === 'role') {
    const r = roles.value.find((r) => r.id === permModal.value.targetId)
    if (r) {
      r.menuPerms = [...modalMenuPerms.value]
      r.modelPerms = [...modalModelPerms.value]
    }
  } else {
    const u = users.value.find((u) => u.id === permModal.value.targetId)
    if (u) {
      u.menuPerms = [...modalMenuPerms.value]
      u.modelPerms = [...modalModelPerms.value]
    }
  }
  permModal.value.isOpen = false
}

// ─── 角色弹窗 ────────────────────────────────────────────────
const roleModal = ref({ isOpen: false, id: null as string | null, name: '' })

const openCreateRoleModal = () => {
  roleModal.value = { isOpen: true, id: null, name: '' }
}
const openEditRoleModal = (role: (typeof roles.value)[0]) => {
  roleModal.value = { isOpen: true, id: role.id, name: role.name }
}
const saveRole = () => {
  if (!roleModal.value.name.trim()) return
  if (roleModal.value.id) {
    const r = roles.value.find((r) => r.id === roleModal.value.id)
    if (r) r.name = roleModal.value.name
  } else {
    const newId = 'r_' + Date.now()
    roles.value.push({
      id: newId,
      name: roleModal.value.name,
      menuPerms: [],
      modelPerms: []
    })
    activeRoleId.value = newId
  }
  roleModal.value.isOpen = false
}
const deleteRole = (id: string) => {
  roles.value = roles.value.filter((r) => r.id !== id)
  users.value = users.value.filter((u) => u.roleId !== id)
  if (activeRoleId.value === id) {
    activeRoleId.value = roles.value[0]?.id || ''
  }
}

// ─── 添加用户弹窗 ────────────────────────────────────────────
const addUserModalOpen = ref(false)
const selectedOrgUsers = ref<string[]>([])

const loadSystemUsers = async () => {
  systemUsersLoading.value = true
  try {
    const resp = await apolloClient.query({
      query: searchUsersQuery,
      variables: { query: '%', limit: 100 },
      fetchPolicy: 'network-only'
    })
    const items =
      (
        resp.data as {
          users?: { items?: Array<{ id: string; name: string | null }> | null } | null
        }
      ).users?.items || []
    systemUsers.value = items.map((u) => ({ id: u.id, name: u.name || u.id }))
  } finally {
    systemUsersLoading.value = false
  }
}

const openAddUserModal = () => {
  selectedOrgUsers.value = []
  addUserModalOpen.value = true
  loadSystemUsers()
}
const toggleOrgUserSelect = (id: string) => {
  const idx = selectedOrgUsers.value.indexOf(id)
  if (idx >= 0) selectedOrgUsers.value.splice(idx, 1)
  else selectedOrgUsers.value.push(id)
}
const confirmAddUsers = () => {
  if (!activeRole.value) return
  selectedOrgUsers.value.forEach((userId) => {
    const sysUser = systemUsers.value.find((u) => u.id === userId)
    if (!sysUser) return
    users.value.push({
      id: String(Date.now() + Math.random()),
      orgUserId: sysUser.id,
      name: sysUser.name,
      roleId: activeRoleId.value,
      menuPerms: [...(activeRole.value?.menuPerms ?? [])],
      modelPerms: [...(activeRole.value?.modelPerms ?? [])]
    })
  })
  addUserModalOpen.value = false
}

const removeUser = (id: string) => {
  users.value = users.value.filter((u) => u.id !== id)
}

// ─── 工具函数 ────────────────────────────────────────────────
const getMenuPermNames = (perms: string[]) =>
  perms
    .map((id) => ALL_MENU_PERMS.find((p) => p.id === id)?.name)
    .filter(Boolean)
    .join('、') || '-'

const getModelPermNames = (perms: string[]) =>
  perms
    .map((id) => ALL_MODEL_PERMS.find((p) => p.id === id)?.name)
    .filter(Boolean)
    .join('、') || '-'

const isDefaultPerms = (user: (typeof users.value)[0]) => {
  const role = activeRole.value
  if (!role) return false
  const sortedEq = (a: string[], b: string[]) =>
    a.length === b.length && [...a].sort().every((v, i) => v === [...b].sort()[i])
  return (
    sortedEq(user.menuPerms, role.menuPerms) &&
    sortedEq(user.modelPerms, role.modelPerms)
  )
}
</script>
