import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const ipc = window.electron.ipcRenderer

export const useUserRulesStore = defineStore('userRules', () => {
  const rules = ref([])
  const loadingCount = ref(0)
  const loading = computed(() => loadingCount.value > 0)
  const error = ref(null)

  function clearError() {
    error.value = null
  }

  async function fetchRules() {
    loadingCount.value++
    error.value = null
    try {
      const result = await ipc.invoke('rules:fetch')
      if (!result.success) throw new Error(result.error)
      rules.value = result.data
    } catch (e) {
      error.value = e.message
    } finally {
      loadingCount.value--
    }
  }

  async function createRule(rule) {
    loadingCount.value++
    error.value = null
    try {
      const result = await ipc.invoke('rules:create', rule)
      if (!result.success) throw new Error(result.error)
      await fetchRules()
      return result
    } catch (e) {
      error.value = e.message
    } finally {
      loadingCount.value--
    }
  }

  async function editRule(id, updates) {
    loadingCount.value++
    error.value = null
    try {
      const result = await ipc.invoke('rules:update', id, updates)
      if (!result.success) throw new Error(result.error)
      await fetchRules()
      return result
    } catch (e) {
      error.value = e.message
    } finally {
      loadingCount.value--
    }
  }

  async function removeRule(id) {
    loadingCount.value++
    error.value = null
    try {
      const result = await ipc.invoke('rules:delete', id)
      if (!result.success) throw new Error(result.error)
      await fetchRules()
      return result
    } catch (e) {
      error.value = e.message
    } finally {
      loadingCount.value--
    }
  }

  async function applyToMonth(yyyymm) {
    loadingCount.value++
    error.value = null
    try {
      const result = await ipc.invoke('rules:applyToMonth', yyyymm)
      if (!result.success) throw new Error(result.error)
      return result
    } catch (e) {
      error.value = e.message
    } finally {
      loadingCount.value--
    }
  }

  async function moveRule(id, direction) {
    const sorted = [...rules.value].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
    const idx = sorted.findIndex((r) => r.id === id)
    const swapIdx = idx + direction
    if (idx === -1 || swapIdx < 0 || swapIdx >= sorted.length) return

    // Assign clean sequential priorities so ties never block a swap
    const withPriorities = sorted.map((r, i) => ({ ...r, priority: sorted.length - i }))
    const tmp = withPriorities[idx].priority
    withPriorities[idx].priority = withPriorities[swapIdx].priority
    withPriorities[swapIdx].priority = tmp

    loadingCount.value++
    error.value = null
    try {
      await ipc.invoke('rules:update', withPriorities[idx].id, { priority: withPriorities[idx].priority })
      await ipc.invoke('rules:update', withPriorities[swapIdx].id, { priority: withPriorities[swapIdx].priority })
      await fetchRules()
    } catch (e) {
      error.value = e.message
    } finally {
      loadingCount.value--
    }
  }

  async function applyToAll() {
    loadingCount.value++
    error.value = null
    try {
      const result = await ipc.invoke('rules:applyToAll')
      if (!result.success) throw new Error(result.error)
      return result
    } catch (e) {
      error.value = e.message
    } finally {
      loadingCount.value--
    }
  }

  return {
    rules,
    loading,
    error,
    clearError,
    fetchRules,
    createRule,
    editRule,
    removeRule,
    moveRule,
    applyToMonth,
    applyToAll
  }
})
