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
    const all = await db.budgets.toArray()
    categories.value = all
      .filter((b) => b.categoryId === b.id)
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  function getCategoriesByType(type) {
    return categories.value.filter((c) => c.type === type)
  }

  async function addCategory(category) {
    const id = crypto.randomUUID()
    const newCategory = {
      id,
      categoryId: id,
      name: category.name,
      type: category.type,
      amount: 0,
      month: null,
      createdAt: new Date().toISOString()
    }
    await db.budgets.add(newCategory)
    await fetchCategories()
    return newCategory
  }

  async function updateCategory(id, updates) {
    await db.budgets.update(id, updates)
    await fetchCategories()
  }

  async function deleteCategory(id) {
    await db.budgets.where('categoryId').equals(id).delete()
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
