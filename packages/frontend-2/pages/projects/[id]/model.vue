<template>
  <ModelDetail :model="modelData" @close="goBack" />
</template>

<script setup lang="ts">
import ModelDetail from '~/components/Model/Detail.vue'

const route = useRoute()
const router = useRouter()

// Mock model data - will be replaced with real data from API
const modelData = {
  id: 1,
  title: '建筑主体模型',
  updateTime: '2024-01-15',
  comments: 0,
  versions: 5,
  status: 'active'
}

const goBack = () => {
  router.back()
}
</script>
