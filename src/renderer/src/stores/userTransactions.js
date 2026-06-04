import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const ipc = window.electron.ipcRenderer

export const useUserTransactionsStore = defineStore('userTransactions', () => {
  // ── State ─────────────────────────────────────────────────────────────────

  const transactions = ref([])
  const monthsWithData = ref([]) // string[] of 'yyyymm'
  const activeMonth = ref(null) // currently selected 'yyyymm'

  const accountSummary = ref([]) // [{ ACCTID, count, total }]
  const monthlyTotals = ref([]) // [{ month, income, spending }]
  const netWorthHistory = ref([]) // [{ month, assets, liabilities, netWorth }]

  const loadingCount = ref(0)
  const loading = computed(() => loadingCount.value > 0)
  const error = ref(null)

  // ── Helpers ───────────────────────────────────────────────────────────────

  function setError(err) {
    error.value = err?.message ?? String(err)
  }

  function clearError() {
    error.value = null
  }

  // ── Transactions: reads ───────────────────────────────────────────────────

  /**
   * Fetch transactions from the DB with optional filters.
   * Defaults to the current month when no filters are passed.
   * @param {Object} [filters] - e.g. { ACCTID: '4321' } or { DTPOSTED: '202605' }
   */
  async function fetchTransactions(filters = {}) {
    loadingCount.value++
    error.value = null
    try {
      const result = await ipc.invoke('transactions:fetch', filters)
      if (!result.success) throw new Error(result.error)
      transactions.value = result.data
    } catch (err) {
      setError(err)
    } finally {
      loadingCount.value--
    }
  }

  /**
   * Convenience: fetch transactions for a specific month and cache the active month.
   * @param {string} yyyymm - e.g. '202605'
   */
  async function fetchTransactionsByMonth(yyyymm) {
    activeMonth.value = yyyymm
    await fetchTransactions({ DTPOSTED: yyyymm })
  }

  /**
   * Fetch transactions for multiple months in parallel and merge results.
   * Needed for Quarter and Year granularity in the Transactions view.
   * Falls back to single-month fetch when only one month is given.
   * @param {string[]} months - Array of 'yyyymm' strings
   */
  async function fetchTransactionsForPeriod(months = []) {
    if (!months.length) return
    if (months.length === 1) return fetchTransactionsByMonth(months[0])

    loadingCount.value++
    error.value = null
    try {
      const results = await Promise.all(
        months.map((ym) => ipc.invoke('transactions:fetch', { DTPOSTED: ym }))
      )
      for (const result of results) {
        if (!result.success) throw new Error(result.error)
      }
      transactions.value = results.flatMap((r) => r.data)
      activeMonth.value = months[months.length - 1]
    } catch (err) {
      setError(err)
    } finally {
      loadingCount.value--
    }
  }

  // ── Transactions: writes ──────────────────────────────────────────────────

  /**
   * Import transactions from an OFX file.
   * Also upserts the account automatically (handled by main.js).
   * @param {string} ofxData - Raw OFX file content
   * @returns {{ total: number, inserted: number, skipped: number }|null}
   */
  async function importTransactionsFromOfx(ofxData) {
    loadingCount.value++
    error.value = null
    try {
      const result = await ipc.invoke('ofx:importTransactions', ofxData)
      if (!result.success) throw new Error(result.error)
      await fetchTransactions({ DTPOSTED: activeMonth.value ?? undefined })
      return result.data
    } catch (err) {
      setError(err)
      return null
    } finally {
      loadingCount.value--
    }
  }

  /**
   * Update writable fields on a transaction (transactionType, category, split fields, etc.).
   * @param {string} fitid
   * @param {Object} updates
   */
  async function editTransaction(fitid, updates) {
    loadingCount.value++
    error.value = null
    try {
      const result = await ipc.invoke('transactions:edit', fitid, updates)
      if (!result.success) throw new Error(result.error)
      // Patch in-place so the UI doesn't need a full re-fetch
      const idx = transactions.value.findIndex((t) => t.FITID === fitid)
      if (idx !== -1) transactions.value[idx] = { ...transactions.value[idx], ...updates }
    } catch (err) {
      setError(err)
    } finally {
      loadingCount.value--
    }
  }

  /**
   * Delete a single transaction by FITID.
   * @param {string} fitid
   */
  async function removeTransaction(fitid) {
    loadingCount.value++
    error.value = null
    try {
      const result = await ipc.invoke('transactions:remove', fitid)
      if (!result.success) throw new Error(result.error)
      transactions.value = transactions.value.filter((t) => t.FITID !== fitid)
    } catch (err) {
      setError(err)
    } finally {
      loadingCount.value--
    }
  }

  // ── Reports ───────────────────────────────────────────────────────────────

  /**
   * Load the account-level summary (count + total per account).
   */
  async function fetchAccountSummary() {
    loadingCount.value++
    error.value = null
    try {
      const result = await ipc.invoke('reports:accountSummary')
      if (!result.success) throw new Error(result.error)
      accountSummary.value = result.data
    } catch (err) {
      setError(err)
    } finally {
      loadingCount.value--
    }
  }

  async function fetchMonthlyTotals() {
    loadingCount.value++
    error.value = null
    try {
      const result = await ipc.invoke('reports:monthlyTotals')
      if (!result.success) throw new Error(result.error)
      monthlyTotals.value = result.data
    } catch (err) {
      setError(err)
    } finally {
      loadingCount.value--
    }
  }

  async function fetchNetWorthHistory() {
    loadingCount.value++
    error.value = null
    try {
      const result = await ipc.invoke('reports:netWorthHistory')
      if (!result.success) throw new Error(result.error)
      netWorthHistory.value = result.data
    } catch (err) {
      setError(err)
    } finally {
      loadingCount.value--
    }
  }

  /**
   * Load the list of months that have transaction data.
   * Sets activeMonth to the most recent month if not already set.
   */
  async function fetchMonthsWithData() {
    loadingCount.value++
    error.value = null
    try {
      const result = await ipc.invoke('reports:monthsWithData')
      if (!result.success) throw new Error(result.error)
      monthsWithData.value = result.data
      if (!activeMonth.value && result.data.length) {
        activeMonth.value = result.data[result.data.length - 1]
      }
    } catch (err) {
      setError(err)
    } finally {
      loadingCount.value--
    }
  }

  // ── Exposed ───────────────────────────────────────────────────────────────

  return {
    // State
    transactions,
    accountSummary,
    monthlyTotals,
    netWorthHistory,
    loading,
    error,
    // Transactions
    fetchTransactions,
    fetchTransactionsByMonth,
    fetchTransactionsForPeriod,
    importTransactionsFromOfx,
    editTransaction,
    removeTransaction,
    // Reports
    fetchAccountSummary,
    fetchMonthsWithData,
    fetchMonthlyTotals,
    fetchNetWorthHistory,
    // Util
    clearError
  }
})
