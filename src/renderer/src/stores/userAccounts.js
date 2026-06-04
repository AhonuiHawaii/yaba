import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const ipc = window.electron.ipcRenderer

// ── Shared classification constants ───────────────────────────────────────────
// Single source of truth — imported by Accounts.vue and NetWorth.vue

/** Account types treated as assets by default (when accountCategory is not set). */
export const ASSET_TYPES = new Set(['Checking', 'Savings', 'Money Market'])

/**
 * Resolve whether a single account row should be treated as an asset,
 * honouring the explicit accountCategory override when present.
 * @param {{ ACCTTYPE: string, accountCategory?: string|null }} account
 */
export function resolveIsAsset(account) {
  if (account.accountCategory === 'asset') return true
  if (account.accountCategory === 'liability') return false
  return ASSET_TYPES.has(account.ACCTTYPE)
}

// ── Shared display helpers ────────────────────────────────────────────────────

/**
 * Returns the Vuetify colour token for a given account type.
 * @param {string} type
 */
export function accountTypeColor(type) {
  return (
    {
      Checking: 'primary',
      Savings: 'success',
      'Money Market': 'primary', // treat like Checking visually
      'Credit Line': 'error',
      'Buy Now Pay Later': 'error',
      'Personal Loan': 'error',
      'Auto Loan': 'error',
      'Student Loan': 'error',
      Mortgage: 'error',
      'Medical Debt': 'error',
      'Family / Friend Loan': 'error',
      Other: 'error'
    }[type] || 'secondary'
  )
}

/**
 * Returns the MDI icon name for a given account type.
 * @param {string} type
 */
export function accountTypeIcon(type) {
  return (
    {
      Checking: 'mdi-bank-outline',
      Savings: 'mdi-piggy-bank-outline',
      'Money Market': 'mdi-bank-outline', // treat like Checking visually
      'Credit Line': 'mdi-credit-card-outline',
      'Buy Now Pay Later': 'mdi-shopping-outline',
      'Personal Loan': 'mdi-cash-multiple',
      'Auto Loan': 'mdi-car',
      'Student Loan': 'mdi-school-outline',
      Mortgage: 'mdi-home-outline',
      'Medical Debt': 'mdi-hospital-box-outline',
      'Family / Friend Loan': 'mdi-account-heart-outline',
      Other: 'mdi-dots-horizontal-circle-outline'
    }[type] || 'mdi-bank-outline'
  )
}

/**
 * Format a number as USD currency.
 * @param {number} value
 */
export function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0)
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useUserAccountsStore = defineStore('userAccounts', () => {
  const accounts = ref([])
  const loadingCount = ref(0)
  const loading = computed(() => loadingCount.value > 0)
  const error = ref(null)

  // ── Helpers ──────────────────────────────────────────────────────────────

  function setError(err) {
    error.value = err?.message ?? String(err)
  }

  function clearError() {
    error.value = null
  }

  // ── Reads ─────────────────────────────────────────────────────────────────

  async function fetchAccounts() {
    loadingCount.value++
    error.value = null
    try {
      const result = await ipc.invoke('accounts:fetchAll')
      if (!result.success) throw new Error(result.error)
      accounts.value = result.data
    } catch (err) {
      setError(err)
    } finally {
      loadingCount.value--
    }
  }

  // ── OFX Import ────────────────────────────────────────────────────────────

  async function importAccountFromOfx(ofxData) {
    loadingCount.value++
    error.value = null
    try {
      const result = await ipc.invoke('ofx:importAccount', ofxData)
      if (!result.success) throw new Error(result.error)
      await fetchAccounts()
      return result.data
    } catch (err) {
      setError(err)
      return null
    } finally {
      loadingCount.value--
    }
  }

  async function createManualAccount(data) {
    loadingCount.value++
    error.value = null
    try {
      const result = await ipc.invoke('accounts:createManual', data)
      if (!result.success) throw new Error(result.error)
      await fetchAccounts()
      return result.data
    } catch (err) {
      setError(err)
      return null
    } finally {
      loadingCount.value--
    }
  }

  // ── Mutations ─────────────────────────────────────────────────────────────

  async function updateAccount(acctid, updates) {
    loadingCount.value++
    error.value = null
    try {
      const result = await ipc.invoke('accounts:edit', acctid, updates)
      if (!result.success) throw new Error(result.error)
      await fetchAccounts()
      return true
    } catch (err) {
      setError(err)
      return false
    } finally {
      loadingCount.value--
    }
  }

  async function removeAccount(acctid) {
    loadingCount.value++
    error.value = null
    try {
      const result = await ipc.invoke('accounts:remove', acctid)
      if (!result.success) throw new Error(result.error)
      await fetchAccounts()
    } catch (err) {
      setError(err)
    } finally {
      loadingCount.value--
    }
  }

  return {
    accounts,
    loading,
    error,
    fetchAccounts,
    importAccountFromOfx,
    createManualAccount,
    updateAccount,
    removeAccount,
    clearError
  }
})
