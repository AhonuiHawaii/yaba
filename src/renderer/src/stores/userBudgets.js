import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useUserBudgetsStore = defineStore('userBudgets', () => {
  const budgets = ref([])
  const types = ref([])
  const loadingCount = ref(0)
  const loading = computed(() => loadingCount.value > 0)
  const error = ref(null)

  function setError(err) {
    error.value = err?.message ?? String(err)
  }

  async function fetchBudgets() {
    loadingCount.value++
    error.value = null
    try {
      const res = await window.electron.ipcRenderer.invoke('budgets:fetch')
      if (res.success) {
        budgets.value = res.data
      } else {
        setError(res.error)
      }
    } catch (err) {
      setError(err)
    } finally {
      loadingCount.value--
    }
  }

  async function fetchTypes() {
    try {
      const res = await window.electron.ipcRenderer.invoke('budgets:fetchTypes')
      if (res.success) {
        types.value = res.data
      }
    } catch (err) {
      setError(err)
    }
  }

  function getBudget(categoryId, month = null) {
    return budgets.value.find(
      (b) => b.categoryId === categoryId && (month ? b.month === month : true)
    )
  }

  async function upsertBudget(categoryId, amount, month) {
    loadingCount.value++
    error.value = null
    try {
      const res = await window.electron.ipcRenderer.invoke(
        'budgets:upsert',
        categoryId,
        amount,
        month
      )
      if (res.success) {
        await fetchBudgets()
      } else {
        setError(res.error)
      }
    } catch (err) {
      setError(err)
    } finally {
      loadingCount.value--
    }
  }

  async function addType(name) {
    if (!types.value.includes(name)) {
      types.value.push(name)
      types.value.sort()
    }
  }

  function clearError() {
    error.value = null
  }

  // Initial load
  fetchBudgets()
  fetchTypes()

  return {
    budgets,
    types,
    loading,
    error,
    fetchBudgets,
    fetchTypes,
    getBudget,
    upsertBudget,
    addType,
    clearError
  }
})
