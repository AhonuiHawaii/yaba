import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import db from './dexie'

export const useUserBudgetsStore = defineStore('userBudgets', () => {
  const budgets = ref([])
  const loadingCount = ref(0)
  const loading = computed(() => loadingCount.value > 0)
  const error = ref(null)

  const monthlyBudgets = computed(() =>
    budgets.value.filter((budget) => !budget.period || budget.period === 'monthly')
  )

  const types = computed(() =>
    [...new Set(budgets.value.map((b) => b.type).filter(Boolean))].sort()
  )

  function setError(err) {
    error.value = err?.message ?? String(err)
  }

  async function fetchBudgets() {
    loadingCount.value++
    error.value = null
    try {
      budgets.value = await db.budgets.toArray()
    } catch (err) {
      setError(err)
    } finally {
      loadingCount.value--
    }
  }

  function getBudget(id, month = null) {
    return budgets.value.find(
      (b) => b.id === id && (month ? b.month === month : true)
    )
  }

  async function upsertBudget(id, amount, month) {
    loadingCount.value++
    error.value = null
    try {
      const existing = budgets.value.find((b) => b.id === id && b.month === month)
      const normalizedAmount = Number(amount) || 0
      const now = new Date().toISOString()

      if (existing) {
        await db.budgets.update(existing.id, { amount: normalizedAmount, updatedAt: now })
      } else {
        await db.budgets.add({
          id,
          month,
          amount: normalizedAmount,
          createdAt: now,
          updatedAt: now
        })
      }
      await fetchBudgets()
    } catch (err) {
      setError(err)
    } finally {
      loadingCount.value--
    }
  }

  async function deleteBudget(id) {
    loadingCount.value++
    error.value = null
    try {
      if (!budgets.value.some((budget) => budget.id === id)) return
      await db.budgets.delete(id)
      await fetchBudgets()
    } catch (err) {
      setError(err)
    } finally {
      loadingCount.value--
    }
  }

  async function addType(name) {
    const id = crypto.randomUUID()
    await db.budgets.add({
      id,
      type: name,
      amount: 0,
      month: null,
      createdAt: new Date().toISOString()
    })
    await fetchBudgets()
  }

  function clearError() {
    error.value = null
  }

  // Initial load
  fetchBudgets()

  return {
    budgets,
    types,
    monthlyBudgets,
    loading,
    error,
    fetchBudgets,
    getBudget,
    upsertBudget,
    addType,
    deleteBudget,
    clearError
  }
})
