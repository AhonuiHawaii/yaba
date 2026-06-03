import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import db from './dexie'

export const useUserCategoriesStore = defineStore('userCategories', () => {
  const categories = ref([])

  const categoryById = computed(() => {
    const map = {}
    for (const c of categories.value) map[c.id] = c
    return map
  })

  async function fetchCategories() {
    categories.value = await db.categories.orderBy('name').toArray()
  }

  function getCategoriesByType(type) {
    return categories.value.filter((c) => c.type === type)
  }

  async function addCategory(category) {
    const newCategory = {
      id: crypto.randomUUID(),
      name: category.name,
      type: category.type,
      createdAt: new Date().toISOString()
    }
    await db.categories.add(newCategory)
    await fetchCategories()
    return newCategory
  }

  async function updateCategory(id, updates) {
    await db.categories.update(id, updates)
    await fetchCategories()
  }

  async function deleteCategory(id) {
    await Promise.all([
      db.categories.delete(id),
      db.budgets.where('categoryId').equals(id).delete()
    ])
    await fetchCategories()
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
