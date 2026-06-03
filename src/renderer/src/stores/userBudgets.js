import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import db from './dexie'

export const useUserBudgetsStore = defineStore('userBudgets', () => {
  const budgets = ref([])
  const rollovers = ref([])
  const loadingCount = ref(0)
  const loading = computed(() => loadingCount.value > 0)
  const error = ref(null)

  const monthlyBudgets = computed(() =>
    budgets.value.filter((budget) => !budget.period || budget.period === 'monthly')
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

  async function fetchRollovers() {
    rollovers.value = await db.budgetRollovers.toArray()
  }

  function getRolloverAmount(categoryId, month) {
    return (
      rollovers.value.find((r) => r.categoryId === categoryId && r.month === month)
        ?.rolloverAmount || 0
    )
  }

  function getEffectiveBudget(categoryId, month) {
    const base = getBudget(categoryId, month)?.amount || 0
    return base + getRolloverAmount(categoryId, month)
  }

  // Returns the unused budget amount for a category in a given month.
  // Call with the actual spending for that month; persists nothing on its own.
  function calculateRollover(categoryId, month, actual) {
    const budget = getBudget(categoryId, month)
    if (!budget?.rolloverEnabled) return 0
    return Math.max((budget.amount || 0) - Math.abs(actual), 0)
  }

  async function upsertRollover(categoryId, month, rolloverAmount) {
    const existing = rollovers.value.find((r) => r.categoryId === categoryId && r.month === month)
    const now = new Date().toISOString()
    if (existing) {
      await db.budgetRollovers.update(existing.id, { rolloverAmount, updatedAt: now })
    } else {
      await db.budgetRollovers.add({
        id: crypto.randomUUID(),
        categoryId,
        month,
        rolloverAmount,
        createdAt: now
      })
    }
    await fetchRollovers()
  }

  async function toggleRolloverEnabled(categoryId, enabled) {
    const budget = getBudget(categoryId)
    if (budget) {
      await db.budgets.update(budget.id, { rolloverEnabled: !!enabled })
      await fetchBudgets()
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
      const existing = budgets.value.find((b) => b.categoryId === categoryId && b.month === month)
      const normalizedAmount = Number(amount) || 0
      const now = new Date().toISOString()

      if (existing) {
        await db.budgets.update(existing.id, { amount: normalizedAmount, updatedAt: now })
      } else {
        await db.budgets.add({
          id: crypto.randomUUID(),
          categoryId,
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

  function clearError() {
    error.value = null
  }

  // Initial load
  fetchBudgets()
  fetchRollovers()

  return {
    budgets,
    rollovers,
    monthlyBudgets,
    loading,
    error,
    fetchBudgets,
    fetchRollovers,
    getBudget,
    getEffectiveBudget,
    getRolloverAmount,
    calculateRollover,
    upsertRollover,
    toggleRolloverEnabled,
    upsertBudget,
    deleteBudget,
    clearError
  }
})
