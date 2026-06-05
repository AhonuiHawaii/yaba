import { app, dialog, ipcMain, BrowserWindow } from 'electron'
import fs from 'fs'
import path from 'path'
import { setupBackupHandlers } from './backup.js'
import {
  importAccount,
  importTransactions,
  parseOfxFile,
  checkDuplicates,
  previewImportBatch,
  importBatch,
  fetchTransactions,
  fetchAllTransactions,
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
  fetchCategories,
  createCategory,
  updateCategory,
  removeCategory,
  fetchBudgets,
  upsertBudget,
  fetchCategoryTypes,
  fetchDebtPayments,
  generateCsv,
  generateAllCsv
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
  ipcMain.handle('ofx:previewImportBatch', (_, items) => previewImportBatch(items))
  ipcMain.handle('ofx:importBatch', (_, items) => importBatch(items))

  ipcMain.handle('transactions:fetch', (_, filters) => {
    if (filters !== undefined && !isObject(filters)) throw new Error('Invalid filters')
    return fetchTransactions(filters)
  })
  ipcMain.handle('transactions:fetchAll', () => fetchAllTransactions())
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
  ipcMain.handle('reports:debtPayments', () => fetchDebtPayments())

  ipcMain.handle('rules:fetch', () => fetchRules())
  ipcMain.handle('rules:create', (_, rule) => {
    if (!isObject(rule)) throw new Error('Invalid rule')
    const result = addRule(rule)
    if (result.success && rule.applyRetroactively) {
      applyRulesToAll()
    }
    return result
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
  ipcMain.handle('rules:applyToMonth', (_, yyyymm, categoryNames = {}) => {
    if (!isYyyymm(yyyymm)) throw new Error('Invalid month format')
    return applyRulesToMonth(yyyymm, categoryNames)
  })
  ipcMain.handle('rules:applyToAll', (_, categoryNames = {}) => applyRulesToAll(categoryNames))
  ipcMain.handle('rules:preview', (_, rule) => {
    if (!isObject(rule)) throw new Error('Invalid rule')
    return previewRuleMatch(rule)
  })

  ipcMain.handle('categories:fetch', () => fetchCategories())
  ipcMain.handle('categories:create', (_, data) => {
    if (!isObject(data) || !isNonEmptyString(data.name) || !isNonEmptyString(data.type)) {
      throw new Error('Invalid category data')
    }
    return createCategory(data)
  })
  ipcMain.handle('categories:update', (_, id, updates) => {
    if (!isNonEmptyString(id)) throw new Error('Invalid Category ID')
    if (!isObject(updates)) throw new Error('Invalid updates')
    return updateCategory(id, updates)
  })
  ipcMain.handle('categories:delete', (_, id) => {
    if (!isNonEmptyString(id)) throw new Error('Invalid Category ID')
    return removeCategory(id)
  })

  ipcMain.handle('budgets:fetch', () => fetchBudgets())
  ipcMain.handle('budgets:upsert', (_, categoryId, amount, month) => {
    if (!isNonEmptyString(categoryId)) throw new Error('Invalid Category ID')
    if (!isYyyymm(month)) throw new Error('Invalid month format')
    return upsertBudget(categoryId, amount, month)
  })
  ipcMain.handle('budgets:fetchTypes', () => fetchCategoryTypes())

  ipcMain.handle('csv:export', async (event, type, options = {}) => {
    if (typeof type !== 'string') throw new Error('Invalid export type')
    const result = generateCsv(type, options)
    if (!result.success) return result

    const win = BrowserWindow.fromWebContents(event.sender)
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      defaultPath: result.data.filename,
      filters: [{ name: 'CSV', extensions: ['csv'] }]
    })
    if (canceled || !filePath) return { success: false, error: 'Cancelled' }

    fs.writeFileSync(filePath, result.data.csv, 'utf8')
    return { success: true, data: { path: filePath } }
  })

  ipcMain.handle('csv:exportAll', async (event, txOptions = {}) => {
    const result = generateAllCsv(txOptions)
    if (!result.success) return result

    const win = BrowserWindow.fromWebContents(event.sender)
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: 'Choose export folder',
      properties: ['openDirectory', 'createDirectory']
    })
    if (canceled || !filePaths?.[0]) return { success: false, error: 'Cancelled' }

    const dir = filePaths[0]
    for (const [filename, csv] of Object.entries(result.data)) {
      fs.writeFileSync(path.join(dir, filename), csv, 'utf8')
    }
    return { success: true, data: { path: dir, files: Object.keys(result.data) } }
  })

  ipcMain.handle('backup:dbSize', () => {
    try {
      const DB_PATH = path.join(app.getPath('userData'), 'data', 'budget.db')
      return fs.statSync(DB_PATH).size
    } catch {
      return 0
    }
  })

  setupBackupHandlers()
}
