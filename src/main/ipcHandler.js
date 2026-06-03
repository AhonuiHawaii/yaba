import { ipcMain, BrowserWindow } from 'electron'
import { setupBackupHandlers } from './backup.js'
import {
  importAccount,
  importTransactions,
  parseOfxFile,
  checkDuplicates,
  importBatch,
  fetchTransactions,
  editTransaction,
  removeTransaction,
  removeAccountTransactions,
  fetchAccounts,
  fetchAccount,
  editAccount,
  addManualAccount,
  removeAccount,
  fetchMonthlySummary,
  fetchCategoryTotals,
  fetchUncategorized,
  fetchAccountSummary,
  fetchMonthsWithData,
  fetchMonthlyTotals,
  fetchNetWorthHistory,
  fetchRules,
  addRule,
  editRule,
  removeRule,
  applyRulesToMonth,
  applyRulesToAll,
  previewRuleMatch,
  previewKeywordsMatch,
  rescanRecurringTransactions,
  fetchCustomRecurring,
  addCustomRecurring,
  editCustomRecurring,
  removeCustomRecurring
} from './main.js'

const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0
const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const isFiniteNumber = (v) => typeof v === 'number' && Number.isFinite(v)
const isYyyymm = (v) => /^\d{6}$/.test(v)

export const setupIpcHandlers = () => {
  ipcMain.on('window-minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize()
  })

  ipcMain.on('window-maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    if (win.isMaximized()) {
      win.unmaximize()
    } else {
      win.maximize()
    }
  })

  ipcMain.on('window-close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close()
  })

  ipcMain.handle('window-is-maximized', (event) => {
    return BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false
  })

  ipcMain.handle('ofx:importAccount', (_, ofxData) => importAccount(ofxData))
  ipcMain.handle('ofx:importTransactions', (_, ofxData) => importTransactions(ofxData))
  ipcMain.handle('ofx:parseFile', (_, ofxText) => parseOfxFile(ofxText))
  ipcMain.handle('ofx:checkDuplicates', (_, fitids) => checkDuplicates(fitids))
  ipcMain.handle('ofx:importBatch', (_, items) => importBatch(items))

  ipcMain.handle('transactions:fetch', (_, filters) => {
    if (filters !== undefined && !isObject(filters)) throw new Error('Invalid filters')
    return fetchTransactions(filters)
  })
  ipcMain.handle('transactions:edit', (_, fitid, updates) => {
    if (!isNonEmptyString(fitid)) throw new Error('Invalid FITID')
    if (!isObject(updates)) throw new Error('Invalid updates')
    return editTransaction(fitid, updates)
  })
  ipcMain.handle('transactions:remove', (_, fitid) => {
    if (!isNonEmptyString(fitid)) throw new Error('Invalid FITID')
    return removeTransaction(fitid)
  })
  ipcMain.handle('transactions:removeByAccount', (_, acctid) => {
    if (!isNonEmptyString(acctid)) throw new Error('Invalid ACCTID')
    return removeAccountTransactions(acctid)
  })

  ipcMain.handle('accounts:fetchAll', () => fetchAccounts())
  ipcMain.handle('accounts:fetchOne', (_, acctid) => {
    if (!isNonEmptyString(acctid)) throw new Error('Invalid ACCTID')
    return fetchAccount(acctid)
  })
  ipcMain.handle('accounts:edit', (_, acctid, updates) => {
    if (!isNonEmptyString(acctid)) throw new Error('Invalid ACCTID')
    if (!isObject(updates)) throw new Error('Invalid updates')
    return editAccount(acctid, updates)
  })
  ipcMain.handle('accounts:createManual', (_, data) => {
    if (!isObject(data) || !isNonEmptyString(data.displayName))
      throw new Error('Invalid account data')
    return addManualAccount(data)
  })
  ipcMain.handle('accounts:remove', (_, acctid) => {
    if (!isNonEmptyString(acctid)) throw new Error('Invalid ACCTID')
    return removeAccount(acctid)
  })

  ipcMain.handle('reports:monthlySummary', (_, yyyymm) => {
    if (!isYyyymm(yyyymm)) throw new Error('Invalid month format')
    return fetchMonthlySummary(yyyymm)
  })
  ipcMain.handle('reports:categoryTotals', (_, yyyymm) => {
    if (!isYyyymm(yyyymm)) throw new Error('Invalid month format')
    return fetchCategoryTotals(yyyymm)
  })
  ipcMain.handle('reports:uncategorized', (_, yyyymm) => {
    if (!isYyyymm(yyyymm)) throw new Error('Invalid month format')
    return fetchUncategorized(yyyymm)
  })
  ipcMain.handle('reports:accountSummary', () => fetchAccountSummary())
  ipcMain.handle('reports:monthsWithData', () => fetchMonthsWithData())
  ipcMain.handle('reports:monthlyTotals', () => fetchMonthlyTotals())
  ipcMain.handle('reports:netWorthHistory', () => fetchNetWorthHistory())

  ipcMain.handle('rules:fetch', () => fetchRules())
  ipcMain.handle('rules:create', (_, rule) => {
    if (!isObject(rule)) throw new Error('Invalid rule')
    return addRule(rule)
  })
  ipcMain.handle('rules:update', (_, id, updates) => {
    if (!isFiniteNumber(id)) throw new Error('Invalid rule ID')
    if (!isObject(updates)) throw new Error('Invalid updates')
    return editRule(id, updates)
  })
  ipcMain.handle('rules:delete', (_, id) => {
    if (!isFiniteNumber(id)) throw new Error('Invalid rule ID')
    return removeRule(id)
  })
  ipcMain.handle('rules:applyToMonth', (_, yyyymm) => {
    if (!isYyyymm(yyyymm)) throw new Error('Invalid month format')
    return applyRulesToMonth(yyyymm)
  })
  ipcMain.handle('rules:applyToAll', () => applyRulesToAll())
  ipcMain.handle('rules:preview', (_, rule) => {
    if (!isObject(rule)) throw new Error('Invalid rule')
    return previewRuleMatch(rule)
  })
  ipcMain.handle('rules:previewKeywords', (_, keywords) => {
    if (!Array.isArray(keywords)) throw new Error('Invalid keywords')
    return previewKeywordsMatch(keywords)
  })
  ipcMain.handle('transactions:rescanRecurring', () => rescanRecurringTransactions())

  ipcMain.handle('customRecurring:fetch', () => fetchCustomRecurring())
  ipcMain.handle('customRecurring:create', (_, entry) => {
    if (!isObject(entry)) throw new Error('Invalid entry')
    return addCustomRecurring(entry)
  })
  ipcMain.handle('customRecurring:update', (_, id, updates) => {
    if (!isFiniteNumber(id)) throw new Error('Invalid ID')
    if (!isObject(updates)) throw new Error('Invalid updates')
    return editCustomRecurring(id, updates)
  })
  ipcMain.handle('customRecurring:delete', (_, id) => {
    if (!isFiniteNumber(id)) throw new Error('Invalid ID')
    return removeCustomRecurring(id)
  })

  setupBackupHandlers()
}
