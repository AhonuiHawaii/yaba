import Papa from 'papaparse'
import { getAllTransactions, getAccounts, getCategories, getBudgets, getRules } from './db.js'

// Columns excluded from transaction export (raw binary blob + redundant FK fields
// that are already represented by their joined name equivalents).
const EXCLUDED_TX_KEYS = new Set(['rawTransaction', 'ACCTID', 'category', 'splitCategory2'])

/**
 * @param {Object[]} rows - Raw transaction rows from getAllTransactions()
 * @param {string[]} [columns] - Optional allowlist of column keys to include
 * @returns {Object[]} Rows with excluded fields stripped
 */
function reshapeTransactions(rows, columns) {
  return rows.map((row) => {
    const out = {}
    for (const [k, v] of Object.entries(row)) {
      if (EXCLUDED_TX_KEYS.has(k)) continue
      if (columns && !columns.includes(k)) continue
      out[k] = v ?? ''
    }
    return out
  })
}

/**
 * @param {Object} [options]
 * @param {string} [options.month] - Filter to a YYYYMM month (e.g. "202601")
 * @param {string} [options.acctid] - Filter to a specific account ID
 * @param {string} [options.startDate] - ISO date string lower bound (inclusive)
 * @param {string} [options.endDate] - ISO date string upper bound (inclusive)
 * @param {string[]} [options.columns] - Subset of TRANSACTION_COLUMNS keys to include
 * @returns {string} CSV string
 */
export const exportTransactionsToCSV = (options = {}) => {
  let rows = getAllTransactions()

  if (options.month) {
    rows = rows.filter((r) => r.DTPOSTED && r.DTPOSTED.startsWith(options.month))
  }
  if (options.acctid) {
    rows = rows.filter((r) => r.ACCTID === options.acctid)
  }
  if (options.startDate) {
    rows = rows.filter((r) => r.DTPOSTED && r.DTPOSTED >= options.startDate)
  }
  if (options.endDate) {
    rows = rows.filter((r) => r.DTPOSTED && r.DTPOSTED <= options.endDate)
  }

  return Papa.unparse(reshapeTransactions(rows, options.columns))
}

export const exportAccountsToCSV = () => {
  const EXCLUDED = new Set(['rawTransaction'])
  const rows = getAccounts().map((row) => {
    const out = {}
    for (const [k, v] of Object.entries(row)) {
      if (!EXCLUDED.has(k)) out[k] = v
    }
    return out
  })
  return Papa.unparse(rows)
}

export const exportCategoriesToCSV = () => {
  return Papa.unparse(getCategories())
}

/**
 * Enriches budget rows with the category name so the CSV is self-describing.
 */
export const exportBudgetsToCSV = () => {
  const budgets = getBudgets()
  const categoryMap = Object.fromEntries(getCategories().map((c) => [c.id, c.name]))

  const rows = budgets.map((b) => ({
    categoryId: b.categoryId,
    category: categoryMap[b.categoryId] ?? '',
    month: b.month,
    amount: b.amount,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt
  }))

  return Papa.unparse(rows)
}

/**
 * Rules have nested conditions/actions arrays — JSON-stringify them for CSV.
 * Each condition/action is also exported as its own flat row in separate sheets
 * via exportRuleConditionsToCSV / exportRuleActionsToCSV if needed.
 */
export const exportRulesToCSV = () => {
  const rows = getRules().map((rule) => ({
    id: rule.id,
    name: rule.name,
    priority: rule.priority,
    createdAt: rule.createdAt,
    conditions: JSON.stringify(rule.conditions ?? []),
    actions: JSON.stringify(rule.actions ?? [])
  }))
  return Papa.unparse(rows)
}

export const exportRuleConditionsToCSV = () => {
  const rows = getRules().flatMap((rule) =>
    (rule.conditions ?? []).map((c) => ({
      ruleId: rule.id,
      ruleName: rule.name,
      field: c.field,
      operator: c.operator,
      value: c.value
    }))
  )
  return Papa.unparse(rows)
}

export const exportRuleActionsToCSV = () => {
  const rows = getRules().flatMap((rule) =>
    (rule.actions ?? []).map((a) => ({
      ruleId: rule.id,
      ruleName: rule.name,
      type: a.type,
      value: a.value
    }))
  )
  return Papa.unparse(rows)
}

/**
 * Export every dataset in one call. Returns an object keyed by filename.
 * @param {Object} [txOptions] - Same options as exportTransactionsToCSV
 * @returns {{ [filename: string]: string }} Map of filename → CSV string
 */
export const exportAllToCSV = (txOptions = {}) => {
  const stamp = new Date().toISOString().slice(0, 10)
  return {
    [`transactions-${stamp}.csv`]: exportTransactionsToCSV(txOptions),
    [`accounts-${stamp}.csv`]: exportAccountsToCSV(),
    [`categories-${stamp}.csv`]: exportCategoriesToCSV(),
    [`budgets-${stamp}.csv`]: exportBudgetsToCSV(),
    [`rules-${stamp}.csv`]: exportRulesToCSV(),
    [`rule-conditions-${stamp}.csv`]: exportRuleConditionsToCSV(),
    [`rule-actions-${stamp}.csv`]: exportRuleActionsToCSV()
  }
}

/**
 * Returns a suggested save filename for a given export type.
 * @param {'transactions'|'accounts'|'categories'|'budgets'|'rules'} type
 * @param {string} [month] - Optional YYYYMM suffix for transaction exports
 */
export const getSuggestedFilename = (type, month) => {
  const stamp = new Date().toISOString().slice(0, 10)
  const suffix = month ? `-${month}` : ''
  return `${type}${suffix}-${stamp}.csv`
}
