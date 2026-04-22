<template>
  <div class="h-full">
    <!-- Header -->
    <div class="pt-3 pb-3 flex items-center justify-between bg-gray-50">
      <h1 class="text-heading pl-5">组织管理</h1>
      <button
        class="flex items-center space-x-1.5 bg-[#00b4b6] hover:bg-[#009fa1] text-white px-3.5 py-1.5 rounded-[8px] text-sm font-medium transition-colors mr-5"
      >
        <PlusIcon class="w-4 h-4" />
        <span>添加成员</span>
      </button>
    </div>

    <!-- Main Content -->
    <div
      class="bg-white overflow-hidden flex"
      style="height: calc(100vh - 11rem)"
    >
      <!-- Left: Org Tree -->
      <div
        class="w-60 shrink-0 border-r border-gray-100 bg-[#fafbfc] flex flex-col"
      >
        <div
          class="h-12 px-4 border-t border-b border-gray-100 flex items-center justify-between shrink-0"
        >
          <span class="text-sm font-medium text-[#333]">组织架构</span>
          <button
            class="text-gray-400 hover:text-[#00b4b6] transition-colors"
            title="新增部门"
          >
            <PlusIcon class="w-4 h-4" />
          </button>
        </div>
        <div class="flex-1 overflow-y-auto p-2 space-y-1">
          <button
            v-for="org in orgTree"
            :key="org.id"
            class="w-full flex items-center justify-between px-3 py-2 rounded-[8px] text-sm transition-colors"
            :class="
              activeOrg === org.id
                ? 'bg-[#e6f7f8] text-[#00b4b6] font-medium'
                : 'text-gray-600 hover:bg-gray-100'
            "
            @click="activeOrg = org.id"
          >
            <div class="flex items-center space-x-2">
              <BuildingIcon
                class="w-4 h-4"
                :class="activeOrg === org.id ? 'text-[#00b4b6]' : 'text-gray-400'"
              />
              <span>{{ org.name }}</span>
            </div>
            <span
              class="text-xs bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full"
            >{{ org.count }}</span>
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
              <input
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
  </div>
</template>

<script setup lang="ts">
import {
  PlusIcon,
  MagnifyingGlassIcon as SearchIcon,
  EllipsisHorizontalIcon,
  BuildingOfficeIcon as BuildingIcon,
  UsersIcon,
  UserGroupIcon
} from '@heroicons/vue/24/outline'

const orgTree = [
  { id: 1, name: '集团总部', count: 120 },
  { id: 2, name: '华东大区', count: 45 },
  { id: 3, name: '研发中心', count: 86 },
  { id: 4, name: '设计院', count: 32 }
]

const allUsers = [
  { id: 1, name: '李明', empNo: 'EMP001', dept: '集团总部', role: '系统管理员', status: '正常', orgId: 1 },
  { id: 2, name: '王建国', empNo: 'EMP002', dept: '集团总部', role: '项目经理', status: '正常', orgId: 1 },
  { id: 3, name: '张伟', empNo: 'EMP003', dept: '集团总部', role: '普通成员', status: '离线', orgId: 1 },
  { id: 4, name: '刘洋', empNo: 'EMP004', dept: '集团总部', role: '模型审核员', status: '正常', orgId: 1 },
  { id: 5, name: '陈工', empNo: 'EMP005', dept: '集团总部', role: '普通成员', status: '禁用', orgId: 1 },
  { id: 6, name: '赵磊', empNo: 'EMP006', dept: '华东大区', role: '区域负责人', status: '正常', orgId: 2 },
  { id: 7, name: '孙芳', empNo: 'EMP007', dept: '华东大区', role: '项目经理', status: '正常', orgId: 2 },
  { id: 8, name: '周浩', empNo: 'EMP008', dept: '华东大区', role: '普通成员', status: '离线', orgId: 2 },
  { id: 9, name: '吴敏', empNo: 'EMP009', dept: '研发中心', role: '技术总监', status: '正常', orgId: 3 },
  { id: 10, name: '郑博', empNo: 'EMP010', dept: '研发中心', role: '高级工程师', status: '正常', orgId: 3 },
  { id: 11, name: '冯强', empNo: 'EMP011', dept: '研发中心', role: '工程师', status: '正常', orgId: 3 },
  { id: 12, name: '陈静', empNo: 'EMP012', dept: '设计院', role: '设计总监', status: '正常', orgId: 4 },
  { id: 13, name: '林涛', empNo: 'EMP013', dept: '设计院', role: 'BIM工程师', status: '禁用', orgId: 4 }
]

const activeOrg = ref(1)
const searchQuery = ref('')

const filteredUsers = computed(() => {
  return allUsers
    .filter((u) => u.orgId === activeOrg.value)
    .filter((u) => {
      if (!searchQuery.value) return true
      return (
        u.name.includes(searchQuery.value) || u.empNo.includes(searchQuery.value)
      )
    })
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
