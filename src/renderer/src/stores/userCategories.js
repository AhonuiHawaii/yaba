import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useUserCategoriesStore = defineStore('userCategories', () => {
  const categories = ref([])

  const categoryById = computed(() => {
    const map = {}
    for (const c of categories.value) map[c.id] = c
    return map
  })

  async function fetchCategories() {
    const res = await window.electron.ipcRenderer.invoke('categories:fetch')
    if (res.success) {
      categories.value = res.data
    } else {
      console.error(res.error)
    }
  }

  function getCategoriesByType(type) {
    return categories.value.filter((c) => c.type === type)
  }

  async function addCategory(category) {
    const res = await window.electron.ipcRenderer.invoke('categories:create', category)
    if (res.success) {
      await fetchCategories()
      return res.data
    }
    throw new Error(res.error)
  }

  async function updateCategory(id, updates) {
    const res = await window.electron.ipcRenderer.invoke('categories:update', id, updates)
    if (res.success) {
      await fetchCategories()
      return res.data
    }
    throw new Error(res.error)
  }

  async function deleteCategory(id) {
    const res = await window.electron.ipcRenderer.invoke('categories:delete', id)
    if (res.success) {
      await fetchCategories()
    } else {
      throw new Error(res.error)
    }
  }

  // Initial load
  fetchCategories()

  return {
    categories,
    categoryById,
    fetchCategories,
    getCategoriesByType,
    addCategory,
    updateCategory,
    deleteCategory
  }
})
