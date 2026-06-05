import { randomUUID } from 'node:crypto'
import { extractAccountData, extractTransactionData } from './ofx.js'
import { extractHeaders as csvExtractHeaders, extractCsvTransactions } from './csvImport.js'
import {
  exportTransactionsToCSV,
  exportAccountsToCSV,
  exportCategoriesToCSV,
  exportBudgetsToCSV,
  exportRulesToCSV,
  exportRuleConditionsToCSV,
  exportRuleActionsToCSV,
  exportAllToCSV,
  getSuggestedFilename
} from './csvExport.js'
import {
  createTransactions,
  getTransactions,
  getAllTransactions,
  updateTransaction,
  deleteTransaction,
  upsertAccount,
  createManualAccount,
  getAccounts,
  getAccount,
  updateAccount,
  deleteAccount,
  getMonthlySummary,
  getCategoryTotals,
  getUncategorized,
  getAccountSummary,
  getMonthsWithData,
  getMonthlyTotals,
  getNetWorthHistory,
  getRules,
  createRule as dbCreateRule,
  updateRule as dbUpdateRule,
  deleteRule as dbDeleteRule,
  applyRules,
  previewRule as dbPreviewRule,
  checkDuplicateFitids,
  checkFuzzyDuplicates,
  getAccountBalance,
  getCategories as dbGetCategories,
  createCategory as dbCreateCategory,
  updateCategory as dbUpdateCategory,
  deleteCategory as dbDeleteCategory,
  getBudgets as dbGetBudgets,
  upsertBudget as dbUpsertBudget,
  getCategoryTypes as dbGetCategoryTypes,
  getDebtPayments
} from './db.js'

/*
  main.js — Service layer between ofx.js (parsing) and db.js (persistence).
  All operations called by ipcHandler go through here.
  Returns a consistent { success, data, error } envelope.
*/

const ok = (data) => ({ success: true, data })
const fail = (error) => ({ success: false, error: error?.message ?? String(error) })

// ─── OFX Import ─────────────────────────────────────────────────────────────

export const importAccount = async (ofxData) => {
  try {
    const data = await extractAccountData(ofxData)
    if (!data) return fail(new Error('No account data found in the file.'))
    upsertAccount(data)
    return ok(data)
  } catch (e) {
    return fail(e)
  }
}

export const importTransactions = async (ofxData) => {
  try {
    const transactions = await extractTransactionData(ofxData)
    if (!transactions.length) return fail(new Error('No transactions found in the file.'))

    const [firstTransaction] = transactions
    if (firstTransaction?.ACCTID) {
      upsertAccount({
        ACCTID: firstTransaction.ACCTID,
        ACCTTYPE: firstTransaction.ACCTTYPE,
        ORG: firstTransaction.ORG,
        INTU_BID: firstTransaction.INTU_BID
      })
    }

    const result = createTransactions(transactions)

    // Auto-categorize newly inserted transactions using saved rules
    const patches = applyRules(transactions)
    for (const patch of patches) {
      const updates = {}
      if ('category' in patch) updates.category = patch.category
      if ('transactionType' in patch) updates.transactionType = patch.transactionType
      if ('rename' in patch) updates.NAME = patch.rename
      if ('subscription' in patch) updates.subscription = patch.subscription
      if ('bill' in patch) updates.bill = patch.bill
      if ('linkAccount' in patch) updates.linkedAccount = patch.linkAccount
      if (Object.keys(updates).length > 0) {
        updateTransaction(patch.FITID, updates)
      }
    }

    return ok(result)
  } catch (e) {
    return fail(e)
  }
}

// ─── Transactions ────────────────────────────────────────────────────────────

export const fetchTransactions = (filters) => {
  try {
    const txs = getTransactions(filters)
    return ok(txs)
  } catch (e) {
    return fail(e)
  }
}

export const fetchAllTransactions = () => {
  try {
    const txs = getAllTransactions()
    return ok(txs)
  } catch (e) {
    return fail(e)
  }
}

export const editTransaction = (fitid, updates) => {
  try {
    const changes = updateTransaction(fitid, updates)
    return ok({ fitid, changes })
  } catch (e) {
    return fail(e)
  }
}

export const removeTransaction = (fitid) => {
  try {
    const changes = deleteTransaction(fitid)
    if (!changes) return fail(new Error(`No transaction found with FITID: ${fitid}`))
    return ok({ fitid, changes })
  } catch (e) {
    return fail(e)
  }
}

export const removeAccountTransactions = (acctid) => {
  try {
    const changes = deleteTransaction(acctid, 'ACCTID')
    return ok({ acctid, changes })
  } catch (e) {
    return fail(e)
  }
}

// Accounts

export const fetchAccounts = () => {
  try {
    return ok(getAccounts())
  } catch (e) {
    return fail(e)
  }
}

export const fetchAccount = (acctid) => {
  try {
    const account = getAccount(acctid)
    if (!account) return fail(new Error(`No account found with ACCTID: ${acctid}`))
    return ok(account)
  } catch (e) {
    return fail(e)
  }
}

export const addManualAccount = (data) => {
  try {
    const ACCTID = `manual-${randomUUID()}`
    createManualAccount({ ...data, ACCTID })
    const created = getAccount(ACCTID)
    return ok(created)
  } catch (e) {
    return fail(e)
  }
}

export const editAccount = (acctid, updates) => {
  try {
    const changes = updateAccount(acctid, updates)
    return ok({ acctid, changes })
  } catch (e) {
    return fail(e)
  }
}

export const removeAccount = (acctid) => {
  try {
    const changes = deleteAccount(acctid)
    if (!changes) return fail(new Error(`No account found with ACCTID: ${acctid}`))
    return ok({ acctid, changes })
  } catch (e) {
    return fail(e)
  }
}

// Reporting

export const fetchMonthlySummary = (yyyymm) => {
  try {
    return ok(getMonthlySummary(yyyymm))
  } catch (e) {
    return fail(e)
  }
}

export const fetchCategoryTotals = (yyyymm) => {
  try {
    return ok(getCategoryTotals(yyyymm))
  } catch (e) {
    return fail(e)
  }
}

export const fetchUncategorized = (yyyymm) => {
  try {
    return ok(getUncategorized(yyyymm))
  } catch (e) {
    return fail(e)
  }
}

export const fetchAccountSummary = () => {
  try {
    return ok(getAccountSummary())
  } catch (e) {
    return fail(e)
  }
}

export const fetchDebtPayments = () => {
  try {
    return ok(getDebtPayments())
  } catch (e) {
    return fail(e)
  }
}

export const fetchMonthsWithData = () => {
  try {
    return ok(getMonthsWithData())
  } catch (e) {
    return fail(e)
  }
}

export const fetchMonthlyTotals = () => {
  try {
    return ok(getMonthlyTotals())
  } catch (e) {
    return fail(e)
  }
}

export const fetchNetWorthHistory = () => {
  try {
    return ok(getNetWorthHistory())
  } catch (e) {
    return fail(e)
  }
}

// Rules

export const fetchRules = () => {
  try {
    return ok(getRules())
  } catch (e) {
    return fail(e)
  }
}

export const addRule = (rule) => {
  try {
    return ok(dbCreateRule(rule))
  } catch (e) {
    return fail(e)
  }
}

export const editRule = (id, updates) => {
  try {
    const changes = dbUpdateRule(id, updates)
    if (!changes) return fail(new Error(`No rule found with id: ${id}`))
    return ok({ id, changes })
  } catch (e) {
    return fail(e)
  }
}

export const removeRule = (id) => {
  try {
    const changes = dbDeleteRule(id)
    if (!changes) return fail(new Error(`No rule found with id: ${id}`))
    return ok({ id, changes })
  } catch (e) {
    return fail(e)
  }
}

export const previewRuleMatch = (rule) => {
  try {
    return ok(dbPreviewRule(rule))
  } catch (e) {
    return fail(e)
  }
}

// Categories & Budgets

export const fetchCategories = () => {
  try {
    return ok(dbGetCategories())
  } catch (e) {
    return fail(e)
  }
}

export const createCategory = (data) => {
  try {
    return ok(dbCreateCategory(data))
  } catch (e) {
    return fail(e)
  }
}

export const updateCategory = (id, updates) => {
  try {
    const changes = dbUpdateCategory(id, updates)
    if (!changes) return fail(new Error(`No category found with id: ${id}`))
    return ok({ id, changes })
  } catch (e) {
    return fail(e)
  }
}

export const removeCategory = (id) => {
  try {
    dbDeleteCategory(id)
    return ok({ id, deleted: true })
  } catch (e) {
    return fail(e)
  }
}

export const fetchBudgets = () => {
  try {
    return ok(dbGetBudgets())
  } catch (e) {
    return fail(e)
  }
}

export const upsertBudget = (categoryId, amount, month) => {
  try {
    const changes = dbUpsertBudget(categoryId, amount, month)
    return ok({ categoryId, month, changes })
  } catch (e) {
    return fail(e)
  }
}

export const fetchCategoryTypes = () => {
  try {
    return ok(dbGetCategoryTypes())
  } catch (e) {
    return fail(e)
  }
}

export const applyRulesToMonth = (yyyymm, categoryNames = {}) => {
  try {
    const transactions = getTransactions({ DTPOSTED: yyyymm })
    const patches = applyRules(transactions)
    for (const patch of patches) {
      const updates = {}
      if ('category' in patch) updates.category = patch.category
      if ('transactionType' in patch) updates.transactionType = patch.transactionType
      if ('rename' in patch) updates.NAME = patch.rename
      else if ('category' in patch) {
        const name = categoryNames[patch.category]
        if (name) updates.NAME = name
      }
      if ('subscription' in patch) updates.subscription = patch.subscription
      if ('bill' in patch) updates.bill = patch.bill
      if (Object.keys(updates).length > 0) updateTransaction(patch.FITID, updates)
    }
    return ok({ applied: patches.length })
  } catch (e) {
    return fail(e)
  }
}

// ─── Wizard Import ───────────────────────────────────────────────────────────

export const parseOfxFile = async (ofxText) => {
  try {
    const account = await extractAccountData(ofxText)
    const transactions = await extractTransactionData(ofxText)
    return ok({
      account,
      txCount: transactions.length,
      fitids: transactions.map((t) => t.FITID)
    })
  } catch (e) {
    return fail(e)
  }
}

export const checkDuplicates = (fitids) => {
  try {
    if (!Array.isArray(fitids)) return fail(new Error('fitids must be an array'))
    return ok({ duplicates: checkDuplicateFitids(fitids) })
  } catch (e) {
    return fail(e)
  }
}

export const importBatch = async (items) => {
  try {
    const results = []
    for (const { ofxText, targetAcctId, skipFitids = [], targetBalance } of items) {
      const transactions = await extractTransactionData(ofxText)
      if (!transactions.length) {
        results.push({ total: 0, inserted: 0, skipped: 0 })
        continue
      }

      let realAcctid = null

      if (targetAcctId) {
        realAcctid = targetAcctId
      } else {
        const accountData = (await extractAccountData(ofxText)) || {
          ACCTID: transactions[0].ACCTID,
          ACCTTYPE: transactions[0].ACCTTYPE,
          ORG: transactions[0].ORG,
          INTU_BID: transactions[0].INTU_BID
        }
        if (accountData.ACCTID) {
          upsertAccount(accountData)
          realAcctid = accountData.ACCTID
        }
      }

      const remapped = realAcctid
        ? transactions.map((t) => ({ ...t, ACCTID: realAcctid }))
        : transactions
      const skipSet = new Set(skipFitids)
      const validTxns = remapped.filter((t) => !skipSet.has(t.FITID))

      const result = createTransactions(validTxns)

      const patches = applyRules(validTxns)
      for (const patch of patches) {
        const upd = {}
        if ('category' in patch) upd.category = patch.category
        if ('transactionType' in patch) upd.transactionType = patch.transactionType
        if ('rename' in patch) upd.NAME = patch.rename
        if ('subscription' in patch) upd.subscription = patch.subscription
        if ('bill' in patch) upd.bill = patch.bill
        if ('linkAccount' in patch) upd.linkedAccount = patch.linkAccount
        if (Object.keys(upd).length > 0) {
          updateTransaction(patch.FITID, upd)
        }
      }

      // After everything is inserted, if a targetBalance is provided, adjust startingBalance
      if (targetBalance !== undefined && targetBalance !== null && targetBalance !== '') {
        const currentDbBalance = getAccountBalance(realAcctid)
        const diff = Number(targetBalance) - currentDbBalance
        if (Math.abs(diff) > 0.01) {
          const acc = getAccount(realAcctid)
          if (acc) {
            acc.startingBalance = (acc.startingBalance || 0) + diff
            upsertAccount(acc)
          }
        }
      }

      results.push({ ...result, accountId: realAcctid })
    }
    return ok(results)
  } catch (e) {
    return fail(e)
  }
}

function cleanBankName(name) {
  if (!name) return ''
  let cleaned = name
  cleaned = cleaned.replace(/^SQ\s*\*/i, '')
  cleaned = cleaned.replace(/^TST\s*\*/i, '')
  cleaned = cleaned.replace(/^PAYPAL\s*\*/i, '')
  cleaned = cleaned.replace(/^SP\s*\*/i, '')
  cleaned = cleaned.replace(/#\d+.*$/i, '')
  return cleaned.trim()
}

export const previewImportBatch = async (items) => {
  try {
    const results = []

    for (const { ofxText, targetAcctId, skipFitids = [] } of items) {
      const transactions = await extractTransactionData(ofxText)
      if (!transactions.length) {
        results.push({
          exactDuplicates: [],
          fuzzyDuplicates: [],
          rulesApplied: [],
          uncategorized: [],
          ledgerBalance: null,
          dbBalance: 0,
          txCount: 0
        })
        continue
      }

      const realAcctid = targetAcctId || null
      const accountData = (await extractAccountData(ofxText)) || transactions[0]

      const ledgerBalance = {
        BALAMT: accountData.BALAMT || null,
        DTASOF: accountData.DTASOF || null
      }

      const remapped = realAcctid
        ? transactions.map((t) => ({ ...t, ACCTID: realAcctid }))
        : transactions

      // Skip FITIDs explicitly marked by user in Fuzzy resolution
      const skipSet = new Set(skipFitids)
      const validTxns = remapped.filter((t) => !skipSet.has(t.FITID))

      const allFitids = validTxns.map((t) => t.FITID)
      const exactDupList = checkDuplicateFitids(allFitids)
      const exactDupSet = new Set(exactDupList)

      const remainingTxns = validTxns.filter((t) => !exactDupSet.has(t.FITID))

      const fuzzyMatches = checkFuzzyDuplicates(remainingTxns)
      const fuzzyImportedSet = new Set(fuzzyMatches.map((m) => m.imported.FITID))

      const freshTxns = remainingTxns.filter((t) => !fuzzyImportedSet.has(t.FITID))

      const patches = applyRules(freshTxns)
      const patchMap = new Map(patches.map((p) => [p.FITID, p]))

      const rulesApplied = []
      const uncategorized = []

      for (const txn of freshTxns) {
        const p = patchMap.get(txn.FITID)
        const cleanName = cleanBankName(txn.NAME)
        if (p) {
          rulesApplied.push({ txn: { ...txn, cleanName }, patch: p })
        } else {
          uncategorized.push({ ...txn, cleanName })
        }
      }

      const dbBalance = realAcctid ? getAccountBalance(realAcctid) : 0

      results.push({
        accountId: realAcctid,
        txCount: transactions.length,
        exactDuplicates: exactDupList,
        fuzzyDuplicates: fuzzyMatches,
        rulesApplied,
        uncategorized,
        ledgerBalance,
        dbBalance
      })
    }

    return ok(results)
  } catch (e) {
    return fail(e)
  }
}

// ─── CSV Import ─────────────────────────────────────────────────────────────

export const extractCsvHeaders = (csvText) => {
  try {
    return ok(csvExtractHeaders(csvText))
  } catch (e) {
    return fail(e)
  }
}

export const importCsvBatch = (items) => {
  try {
    const results = []

    for (const item of items) {
      const {
        csvText,
        mapping,
        options = {},
        accountStub = {},
        targetAcctId = null,
        targetBalance = null
      } = item

      const transactions = extractCsvTransactions(csvText, mapping, options)
      if (!transactions.length) {
        results.push({ total: 0, inserted: 0, skipped: 0, accountId: null, rulesApplied: 0 })
        continue
      }

      let realAcctid = targetAcctId
      if (!realAcctid) {
        realAcctid = `csv-${randomUUID()}`
        upsertAccount({
          ACCTID: realAcctid,
          ACCTTYPE: accountStub.ACCTTYPE || 'Checking',
          ORG: accountStub.ORG || 'CSV Import',
          INTU_BID: null
        })
      }

      const stamped = transactions.map((t) => ({ ...t, ACCTID: realAcctid }))
      const result = createTransactions(stamped)

      const patches = applyRules(stamped)
      for (const patch of patches) {
        const upd = {}
        if ('category' in patch) upd.category = patch.category
        if ('transactionType' in patch) upd.transactionType = patch.transactionType
        if ('rename' in patch) upd.NAME = patch.rename
        if ('subscription' in patch) upd.subscription = patch.subscription
        if ('bill' in patch) upd.bill = patch.bill
        if ('linkAccount' in patch) upd.linkedAccount = patch.linkAccount
        if (Object.keys(upd).length > 0) updateTransaction(patch.FITID, upd)
      }

      if (targetBalance !== null && targetBalance !== '' && targetBalance !== undefined) {
        const currentDbBalance = getAccountBalance(realAcctid)
        const diff = Number(targetBalance) - currentDbBalance
        if (Math.abs(diff) > 0.01) {
          const acc = getAccount(realAcctid)
          if (acc) {
            acc.startingBalance = (acc.startingBalance || 0) + diff
            upsertAccount(acc)
          }
        }
      }

      results.push({ ...result, accountId: realAcctid, rulesApplied: patches.length })
    }

    return ok(results)
  } catch (e) {
    return fail(e)
  }
}

// ─── CSV Export ─────────────────────────────────────────────────────────────

const CSV_EXPORTERS = {
  transactions: (options) => exportTransactionsToCSV(options),
  accounts: () => exportAccountsToCSV(),
  categories: () => exportCategoriesToCSV(),
  budgets: () => exportBudgetsToCSV(),
  rules: () => exportRulesToCSV(),
  'rule-conditions': () => exportRuleConditionsToCSV(),
  'rule-actions': () => exportRuleActionsToCSV()
}

export const generateCsv = (type, options = {}) => {
  try {
    const fn = CSV_EXPORTERS[type]
    if (!fn) return fail(new Error(`Unknown export type: ${type}`))
    return ok({ csv: fn(options), filename: getSuggestedFilename(type, options.month) })
  } catch (e) {
    return fail(e)
  }
}

export const generateAllCsv = (txOptions = {}) => {
  try {
    return ok(exportAllToCSV(txOptions))
  } catch (e) {
    return fail(e)
  }
}

export const applyRulesToAll = (categoryNames = {}) => {
  try {
    const transactions = getAllTransactions()
    const patches = applyRules(transactions)
    for (const patch of patches) {
      const updates = {}
      if ('category' in patch) updates.category = patch.category
      if ('transactionType' in patch) updates.transactionType = patch.transactionType
      if ('rename' in patch) updates.NAME = patch.rename
      else if ('category' in patch) {
        const name = categoryNames[patch.category]
        if (name) updates.NAME = name
      }
      if ('subscription' in patch) updates.subscription = patch.subscription
      if ('bill' in patch) updates.bill = patch.bill
      if (Object.keys(updates).length > 0) updateTransaction(patch.FITID, updates)
    }
    return ok({ applied: patches.length })
  } catch (e) {
    return fail(e)
  }
}
