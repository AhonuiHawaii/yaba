import Database from 'better-sqlite3-multiple-ciphers'
// import dpapi from 'node-dpapi-prebuilt'
import { app } from 'electron'
import { join } from 'path'
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs'
// import { randomBytes } from 'crypto'
import { buildMerchantHistory, scoreRecurring, rescanRecurring } from './util/detectRecurring.js'

/*
  Database initialization
  - Encryption key generated once, protected by Windows DPAPI (CurrentUser)
  - Only the current Windows user can recover the key
  - SQLite-level encryption via better-sqlite3-multiple-ciphers
*/

const DB_DIR = join(app.getPath('userData'), 'data')
const DB_PATH = join(DB_DIR, 'budget.db')
// const KEY_PATH = join(DB_DIR, 'budget.key')

mkdirSync(DB_DIR, { recursive: true })

// // Resolve or create encryption key — DPAPI CurrentUser scope ties it to this Windows account
// const encryptionKey = (() => {
//   if (existsSync(KEY_PATH)) {
//     return dpapi.unprotectData(readFileSync(KEY_PATH), null, 'CurrentUser').toString('utf8')
//   }
//   const key = randomBytes(32).toString('hex')
//   writeFileSync(KEY_PATH, dpapi.protectData(Buffer.from(key), null, 'CurrentUser'))
//   return key
// })()

const db = new Database(DB_PATH)
// db.pragma(`key='${encryptionKey}'`)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// ── Schema initialization ─────────────────────────────────────────────────────

// Linked bank accounts. accountCategory lets the user override whether an
// account is treated as an asset or liability in net worth calculations.
db.exec(`
  CREATE TABLE IF NOT EXISTS Accounts (
    ACCTID          TEXT PRIMARY KEY,
    ACCTTYPE        TEXT,
    ORG             TEXT,
    INTU_BID        TEXT,
    displayName     TEXT,
    interestRate    REAL,
    dueDate         INTEGER,
    paymentFrequency TEXT,
    paymentStartDate TEXT,
    paymentCount    INTEGER,
    startingBalance REAL,
    accountCategory TEXT DEFAULT NULL,
    createdAt       TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    lastImport      TEXT
  )
`)

// One row per OFX transaction. OFX fields come from the bank; app fields
// (transactionType, category, split*, notes, recurring) are set by the user.
db.exec(`
  CREATE TABLE IF NOT EXISTS Transactions (
    FITID           TEXT PRIMARY KEY,
    ACCTID          TEXT,
    TRNTYPE         TEXT,
    DTPOSTED        TEXT,
    DTUSER          TEXT,
    TRNAMT          REAL,
    NAME            TEXT,
    MEMO            TEXT,
    CHECKNUM        TEXT,
    REFNUM          TEXT,
    DTAVAIL         TEXT,
    SRVRTID         TEXT,
    PAYEEID         TEXT,
    EXTDNAME        TEXT,
    SIC             TEXT,
    ORG             TEXT,
    rawTransaction  TEXT NOT NULL,
    createdAt       TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    transactionType TEXT,
    category        TEXT,
    splitAmount1    REAL,
    splitCategory2  TEXT,
    splitAmount2    REAL,
    notes           TEXT,
    dueDate         INTEGER,
    recurring       INTEGER DEFAULT 0
  )
`)

db.exec(`CREATE INDEX IF NOT EXISTS idx_transactions_dtposted ON Transactions(DTPOSTED)`)
db.exec(`CREATE INDEX IF NOT EXISTS idx_transactions_acctid   ON Transactions(ACCTID)`)
db.exec(`CREATE INDEX IF NOT EXISTS idx_transactions_category ON Transactions(category)`)

// ── Column sets ──────────────────────────────────────────────────────────────

/*
  Transaction fields (from OFX STMTTRN):
    FITID, TRNTYPE, DTPOSTED, DTUSER, TRNAMT, NAME, MEMO,
    CHECKNUM, REFNUM, DTAVAIL, SRVRTID, PAYEEID, EXTDNAME, SIC

  App fields (set by user in the app):
    transactionType = income, expense, bills, variable (expenses)
    category        = first split category (or regular category)
    splitAmount1    = first split amount
    splitCategory2  = second split category
    splitAmount2    = second split amount

  Account metadata now lives in the Accounts table, linked by ACCTID.
*/

// Valid columns for filtering — prevents SQL injection on dynamic column names
const VALID_COLUMNS = new Set([
  'FITID',
  'ACCTID',
  'TRNTYPE',
  'DTPOSTED',
  'DTUSER',
  'TRNAMT',
  'NAME',
  'MEMO',
  'CHECKNUM',
  'REFNUM',
  'DTAVAIL',
  'SRVRTID',
  'PAYEEID',
  'EXTDNAME',
  'SIC',
  'rawTransaction',
  'createdAt',
  'transactionType',
  'category',
  'splitAmount1',
  'splitCategory2',
  'splitAmount2',
  'ORG',
  'notes',
  'recurring',
  'dueDate'
])

// OFX date columns — use LIKE prefix matching so partial dates work
// e.g. '202605' → month, '20260506' → day, full timestamp → exact
const DATE_COLUMNS = new Set(['DTPOSTED', 'DTUSER', 'DTAVAIL'])

// ── Transaction reads ────────────────────────────────────────────────────────

// Get transactions by any field — defaults to current month by postedDate
const getTransactions = (filters = {}) => {
  const entries = Object.entries(filters).filter(([col]) => VALID_COLUMNS.has(col))

  if (entries.length === 0) {
    const now = new Date()
    const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
    return db.prepare('SELECT * FROM Transactions WHERE DTPOSTED LIKE ?').all(`${yyyymm}%`)
  }

  const clauses = entries.map(([col]) => (DATE_COLUMNS.has(col) ? `${col} LIKE ?` : `${col} = ?`))
  const values = entries.map(([col, val]) => (DATE_COLUMNS.has(col) ? `${val}%` : val))

  return db.prepare(`SELECT * FROM Transactions WHERE ${clauses.join(' AND ')}`).all(...values)
}

const getAllTransactions = () => db.prepare('SELECT * FROM Transactions').all()

// ── Transaction writes ───────────────────────────────────────────────────────

// Update a transaction by FITID — only whitelisted columns are accepted
const updateTransaction = (fitid, updates = {}) => {
  const entries = Object.entries(updates).filter(
    ([col]) => VALID_COLUMNS.has(col) && col !== 'FITID'
  )

  if (entries.length === 0) return 0

  const setClause = entries.map(([col]) => `${col} = ?`).join(', ')
  const values = entries.map(([, val]) => val)

  return db.prepare(`UPDATE Transactions SET ${setClause} WHERE FITID = ?`).run(...values, fitid)
    .changes
}

/**
 * Inserts a single transaction. Ignores duplicates on FITID (safe for OFX re-imports).
 * Account metadata must be upserted via upsertAccount() before calling this.
 *
 * @param {Object} txn - Transaction object from ofx.js extractTransactionData.
 * @returns {number} Rows inserted (0 = duplicate, 1 = inserted).
 */
function createTransaction(txn) {
  if (!txn) throw new Error('Transaction data is required to create a transaction.')
  if (!txn.FITID) throw new Error('A valid FITID is required to create a transaction.')

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO Transactions
      (FITID, ACCTID, TRNTYPE, DTPOSTED, DTUSER, TRNAMT, NAME, MEMO,
       CHECKNUM, REFNUM, DTAVAIL, SRVRTID, PAYEEID, EXTDNAME, SIC, ORG, rawTransaction, recurring)
    VALUES
      (@FITID, @ACCTID, @TRNTYPE, @DTPOSTED, @DTUSER, @TRNAMT, @NAME, COALESCE(NULLIF(@MEMO, ''), @NAME),
       @CHECKNUM, @REFNUM, @DTAVAIL, @SRVRTID, @PAYEEID, @EXTDNAME, @SIC, @ORG, @rawTransaction, @recurring)
  `)

  const history = buildMerchantHistory(db)
  const recurring = scoreRecurring(txn, history) ? 1 : 0
  return stmt.run({ ...txn, rawTransaction: JSON.stringify(txn), recurring }).changes
}

/**
 * Bulk-inserts an array of transactions inside a single SQLite transaction.
 * A mid-import crash leaves no partial state.
 *
 * @param {Object[]} txns - Array of transaction objects from ofx.js.
 * @returns {{ total: number, inserted: number, skipped: number }}
 */
function createTransactions(txns) {
  if (!Array.isArray(txns) || txns.length === 0) return { total: 0, inserted: 0, skipped: 0 }

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO Transactions
      (FITID, ACCTID, TRNTYPE, DTPOSTED, DTUSER, TRNAMT, NAME, MEMO,
       CHECKNUM, REFNUM, DTAVAIL, SRVRTID, PAYEEID, EXTDNAME, SIC, ORG, rawTransaction, recurring)
    VALUES
      (@FITID, @ACCTID, @TRNTYPE, @DTPOSTED, @DTUSER, @TRNAMT, @NAME, COALESCE(NULLIF(@MEMO, ''), @NAME),
       @CHECKNUM, @REFNUM, @DTAVAIL, @SRVRTID, @PAYEEID, @EXTDNAME, @SIC, @ORG, @rawTransaction, @recurring)
  `)

  let inserted = 0
  db.transaction((rows) => {
    for (const txn of rows) {
      inserted += stmt.run({ ...txn, rawTransaction: JSON.stringify(txn), recurring: 0 }).changes
    }
  })(txns)

  // Authoritative pass — runs after every bulk import so newly-eligible
  // merchants pick up their flag and stale flags get cleared.
  rescanRecurring(db)

  return { total: txns.length, inserted, skipped: txns.length - inserted }
}

/**
 * Deletes transactions by FITID (single row) or ACCTID (all rows for that account).
 *
 * @param {string} id - The FITID or ACCTID to match.
 * @param {string} [type='FITID'] - 'FITID' or 'ACCTID'.
 * @returns {number} Rows deleted.
 */
function deleteTransaction(id, type = 'FITID') {
  if (!id) throw new Error('An ID is required to perform a deletion.')

  const searchType = type ? type.toUpperCase() : 'FITID'

  if (searchType === 'ACCTID') {
    return db.prepare('DELETE FROM Transactions WHERE ACCTID = ?').run(id).changes
  }

  if (searchType === 'FITID') {
    return db.prepare('DELETE FROM Transactions WHERE FITID = ?').run(id).changes
  }

  throw new Error(`Unsupported deletion type provided: ${type}`)
}

// ── Account writes ───────────────────────────────────────────────────────────

/**
 * Insert or update an account row. Updates metadata and lastImport on conflict.
 * Call this before createTransactions() on each OFX import.
 *
 * @param {{ ACCTID: string, ACCTTYPE?: string, ORG?: string, INTU_BID?: string }} acct
 */
function upsertAccount(acct) {
  if (!acct?.ACCTID) throw new Error('ACCTID is required to upsert an account.')

  db.prepare(
    `
    INSERT INTO Accounts (ACCTID, ACCTTYPE, ORG, INTU_BID, lastImport)
    VALUES (@ACCTID, @ACCTTYPE, @ORG, @INTU_BID, CURRENT_TIMESTAMP)
    ON CONFLICT(ACCTID) DO UPDATE SET
      ACCTTYPE   = excluded.ACCTTYPE,
      ORG        = excluded.ORG,
      INTU_BID   = excluded.INTU_BID,
      lastImport = CURRENT_TIMESTAMP
  `
  ).run(acct)
}

/**
 * Insert a new manual (non-OFX) account. Caller supplies a unique ACCTID.
 * Used for loans like Affirm where there's no OFX feed.
 *
 * @param {{ ACCTID: string, displayName?: string, ORG?: string, ACCTTYPE?: string,
 *           interestRate?: number, dueDate?: number|null, paymentFrequency?: string }} acct
 */
function createManualAccount(acct) {
  if (!acct?.ACCTID) throw new Error('ACCTID is required to create an account.')

  const dueDate = (() => {
    const n = Number(acct.dueDate)
    return Number.isInteger(n) && n >= 1 && n <= 31 ? n : null
  })()

  const VALID_FREQUENCIES = new Set(['Weekly', 'BiWeekly', 'Monthly'])

  db.prepare(
    `
    INSERT INTO Accounts (ACCTID, ACCTTYPE, ORG, displayName, interestRate, dueDate, paymentFrequency, paymentStartDate, paymentCount, startingBalance)
    VALUES (@ACCTID, @ACCTTYPE, @ORG, @displayName, @interestRate, @dueDate, @paymentFrequency, @paymentStartDate, @paymentCount, @startingBalance)
  `
  ).run({
    ACCTID: acct.ACCTID,
    ACCTTYPE: acct.ACCTTYPE || 'Loan',
    ORG: acct.ORG || null,
    displayName: acct.displayName || null,
    interestRate: Number(acct.interestRate) || 0,
    dueDate,
    paymentFrequency: VALID_FREQUENCIES.has(acct.paymentFrequency) ? acct.paymentFrequency : null,
    paymentStartDate: acct.paymentStartDate || null,
    paymentCount: Number(acct.paymentCount) > 0 ? Math.round(Number(acct.paymentCount)) : null,
    startingBalance: Number.isFinite(Number(acct.startingBalance))
      ? Number(acct.startingBalance)
      : null
  })
}

/** @returns {Object[]} All known accounts ordered by creation date. */
function getAccounts() {
  return db.prepare('SELECT * FROM Accounts ORDER BY createdAt').all()
}

/**
 * @param {string} acctid
 * @returns {Object|undefined} Account row, or undefined if not found.
 */
function getAccount(acctid) {
  return db.prepare('SELECT * FROM Accounts WHERE ACCTID = ?').get(acctid)
}

/**
 * Update writable account fields. Only displayName, ACCTTYPE, ORG, INTU_BID are allowed.
 *
 * @param {string} acctid
 * @param {Object} updates
 * @returns {number} Rows changed.
 */
function updateAccount(acctid, updates = {}) {
  const ALLOWED = new Set([
    'displayName',
    'ACCTTYPE',
    'ORG',
    'INTU_BID',
    'interestRate',
    'dueDate',
    'paymentFrequency',
    'paymentStartDate',
    'paymentCount',
    'startingBalance',
    'accountCategory'
  ])
  const entries = Object.entries(updates)
    .filter(([col]) => ALLOWED.has(col))
    .map(([col, val]) => {
      if (col === 'dueDate') {
        const n = Number(val)
        return [col, Number.isInteger(n) && n >= 1 && n <= 31 ? n : null]
      }
      if (col === 'paymentFrequency') {
        const VALID = new Set(['Weekly', 'BiWeekly', 'Monthly'])
        return [col, VALID.has(val) ? val : null]
      }
      return [col, val]
    })

  if (entries.length === 0) return 0

  return db.transaction(() => {
    const setClause = entries.map(([col]) => `${col} = ?`).join(', ')
    const values = entries.map(([, val]) => val)
    const changes = db
      .prepare(`UPDATE Accounts SET ${setClause} WHERE ACCTID = ?`)
      .run(...values, acctid).changes

    if ('ORG' in updates) {
      db.prepare('UPDATE Transactions SET ORG = ? WHERE ACCTID = ?').run(updates.ORG, acctid)
    }

    return changes
  })()
}

/**
 * Delete an account and all of its transactions atomically.
 *
 * @param {string} acctid
 * @returns {number} Account rows deleted (0 or 1).
 */
function deleteAccount(acctid) {
  if (!acctid) throw new Error('ACCTID is required to delete an account.')

  return db.transaction(() => {
    db.prepare('DELETE FROM Transactions WHERE ACCTID = ?').run(acctid)
    return db.prepare('DELETE FROM Accounts WHERE ACCTID = ?').run(acctid).changes
  })()
}

// ── Category Rules ───────────────────────────────────────────────────────────

// Rules are evaluated top-to-bottom (priority DESC) on import; first match wins.
// rename optionally overwrites the transaction's NAME (payee) field on match.
db.exec(`
  CREATE TABLE IF NOT EXISTS CategoryRules (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    field     TEXT NOT NULL,
    operator  TEXT NOT NULL,
    value     TEXT NOT NULL,
    category  TEXT NOT NULL,
    type      TEXT,
    rename    TEXT,
    priority  INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  )
`)

function getRules() {
  return db.prepare('SELECT * FROM CategoryRules ORDER BY priority DESC, id ASC').all()
}

function createRule(rule) {
  const stmt = db.prepare(`
    INSERT INTO CategoryRules (field, operator, value, category, type, priority, rename)
    VALUES (@field, @operator, @value, @category, @type, @priority, @rename)
  `)
  const info = stmt.run({
    field: rule.field,
    operator: rule.operator,
    value: rule.value,
    category: rule.category,
    type: rule.type ?? null,
    priority: rule.priority ?? 0,
    rename: rule.rename ?? null
  })
  return db.prepare('SELECT * FROM CategoryRules WHERE id = ?').get(info.lastInsertRowid)
}

function updateRule(id, updates) {
  const ALLOWED = new Set(['field', 'operator', 'value', 'category', 'type', 'priority', 'rename'])
  const entries = Object.entries(updates).filter(([col]) => ALLOWED.has(col))
  if (entries.length === 0) return 0
  const setClause = entries.map(([col]) => `${col} = ?`).join(', ')
  const values = entries.map(([, val]) => val)
  return db.prepare(`UPDATE CategoryRules SET ${setClause} WHERE id = ?`).run(...values, id).changes
}

function deleteRule(id) {
  return db.prepare('DELETE FROM CategoryRules WHERE id = ?').run(id).changes
}

/**
 * Normalize bank transaction text for matching. Bank feeds use inconsistent
 * delimiters (*, #, /, etc.) between merchant segments — e.g. "WALMART*GROCERIES",
 * "PAYPAL *MERCHANT", "AMAZON.COM/BILLING". This normalizes all such separators
 * to spaces so users can write natural phrases like "Uber Eats" and match
 * "UBER *EATS", "UBER*EATS", or "UBER/EATS" without needing wildcards.
 *
 * For advanced glob-style pattern matching, use the 'wildcard' operator.
 */
const normalizeBankText = (value) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['']/g, '')
    .replace(/[*#:/\\|_()\[\]{}-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * Evaluate all rules (highest priority first) against each transaction.
 * First matching rule wins per transaction.
 * @param {Object[]} transactions
 * @returns {{ FITID: string, category: string, transactionType?: string }[]}
 */
function applyRules(transactions) {
  const rules = getRules()
  if (!rules.length || !transactions.length) return []

  const patches = []
  for (const txn of transactions) {
    for (const rule of rules) {
      const raw = txn[rule.field]
      const fieldStr = String(raw ?? '')
      const ruleVal = rule.value
      let matches = false

      // contains / equals / startsWith use normalized text matching.
      // Bank separators (*, #, /, etc.) are collapsed to spaces before comparison
      // so "Uber Eats" matches "UBER *EATS", "UBER*EATS", "UBER/EATS", etc.
      // For raw glob-style pattern matching, use the 'wildcard' operator.
      switch (rule.operator) {
        case 'contains':
          matches = normalizeBankText(fieldStr).includes(normalizeBankText(ruleVal))
          break
        case 'equals':
          matches = normalizeBankText(fieldStr) === normalizeBankText(ruleVal)
          break
        case 'startsWith':
          matches = normalizeBankText(fieldStr).startsWith(normalizeBankText(ruleVal))
          break
        case 'gt':
          matches = Number(raw) > Number(ruleVal)
          break
        case 'lt':
          matches = Number(raw) < Number(ruleVal)
          break
        case 'wildcard': {
          const pattern = ruleVal.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')
          matches = new RegExp(`^${pattern}$`, 'i').test(fieldStr)
          break
        }
        case 'wholeWord': {
          const hasStar = ruleVal.includes('*')
          const escaped = ruleVal.replace(/[.+^${}()|[\]\\]/g, '\\$&')
          const pattern = hasStar ? escaped.replace(/\*/g, '\\S*') : escaped.replace(/\*/g, '\\*')
          matches = new RegExp(`\\b${pattern}\\b`, 'i').test(fieldStr)
          break
        }
      }

      if (matches) {
        const patch = { FITID: txn.FITID, category: rule.category }
        if (rule.type) patch.transactionType = rule.type
        if (rule.rename) patch.rename = rule.rename
        patches.push(patch)
        break
      }
    }
  }
  return patches
}

function matchesOneRule(tx, { field, operator, value }) {
  const raw = tx[field]
  const fieldStr = String(raw ?? '')
  // contains / equals / startsWith use normalized text matching (see normalizeBankText).
  // For raw glob-style pattern matching, use the 'wildcard' operator.
  switch (operator) {
    case 'contains':
      return normalizeBankText(fieldStr).includes(normalizeBankText(value))
    case 'equals':
      return normalizeBankText(fieldStr) === normalizeBankText(value)
    case 'startsWith':
      return normalizeBankText(fieldStr).startsWith(normalizeBankText(value))
    case 'gt':
      return Number(raw) > Number(value)
    case 'lt':
      return Number(raw) < Number(value)
    case 'wildcard': {
      const pattern = value.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')
      return new RegExp(`^${pattern}$`, 'i').test(fieldStr)
    }
    case 'wholeWord': {
      const hasStar = value.includes('*')
      const escaped = value.replace(/[.+^${}()|[\]\\]/g, '\\$&')
      const pattern = hasStar ? escaped.replace(/\*/g, '\\S*') : escaped.replace(/\*/g, '\\*')
      return new RegExp(`\\b${pattern}\\b`, 'i').test(fieldStr)
    }
    default:
      return false
  }
}

function previewRule({ field, operator, value }) {
  if (!field || !operator || !value) return { count: 0, samples: [] }
  const txs = db
    .prepare(
      'SELECT FITID, NAME, MEMO, TRNAMT, DTPOSTED, category FROM Transactions ORDER BY DTPOSTED DESC'
    )
    .all()
  const matches = txs.filter((tx) => matchesOneRule(tx, { field, operator, value }))
  return { count: matches.length, samples: matches }
}

function previewKeywords(keywords) {
  const clean = (keywords || []).map((k) => k.trim()).filter(Boolean)
  if (!clean.length) return { count: 0, samples: [] }
  const txs = db
    .prepare(
      'SELECT FITID, NAME, MEMO, TRNAMT, DTPOSTED, category FROM Transactions ORDER BY DTPOSTED DESC'
    )
    .all()
  const matches = txs.filter((tx) =>
    clean.some((kw) => {
      const needle = normalizeBankText(kw)
      return (
        normalizeBankText(tx.NAME).includes(needle) || normalizeBankText(tx.MEMO).includes(needle)
      )
    })
  )
  return { count: matches.length, samples: matches }
}

// ── Custom Recurring ─────────────────────────────────────────────────────────

// User-defined recurring transaction patterns matched against MEMO on import.
db.exec(`
  CREATE TABLE IF NOT EXISTS CustomRecurring (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    operator    TEXT NOT NULL DEFAULT 'contains',
    createdAt   TEXT DEFAULT CURRENT_TIMESTAMP
  )
`)
function matchesCustomEntry(memo, entry) {
  const haystack = (memo || '').toLowerCase()
  const needle = (entry.name || '').toLowerCase()
  switch (entry.operator) {
    case 'equals':
      return haystack === needle
    case 'startsWith':
      return haystack.startsWith(needle)
    case 'wholeWord':
      return new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(haystack)
    default:
      return haystack.includes(needle) // contains
  }
}

function getCustomRecurring() {
  return db.prepare('SELECT * FROM CustomRecurring ORDER BY name ASC').all()
}

function createCustomRecurring(entry) {
  const stmt = db.prepare(`INSERT INTO CustomRecurring (name, operator) VALUES (@name, @operator)`)
  const info = stmt.run({ name: entry.name, operator: entry.operator ?? 'contains' })
  return db.prepare('SELECT * FROM CustomRecurring WHERE id = ?').get(info.lastInsertRowid)
}

function updateCustomRecurring(id, updates) {
  const ALLOWED = new Set(['name', 'operator'])
  const entries = Object.entries(updates).filter(([col]) => ALLOWED.has(col))
  if (entries.length === 0) return 0
  const setClause = entries.map(([col]) => `${col} = ?`).join(', ')
  const values = entries.map(([, val]) => val)
  return db.prepare(`UPDATE CustomRecurring SET ${setClause} WHERE id = ?`).run(...values, id)
    .changes
}

function deleteCustomRecurring(id) {
  return db.prepare('DELETE FROM CustomRecurring WHERE id = ?').run(id).changes
}

// ── Reporting ────────────────────────────────────────────────────────────────

// TRNAMT is stored as TEXT (OFX format) — cast to REAL in SQL for aggregation

/**
 * @param {string} yyyymm - e.g. '202605'
 * @returns {{ transactionType: string, total: number }[]}
 */
function getMonthlySummary(yyyymm) {
  const month = `${yyyymm}%`
  return db
    .prepare(
      `
    SELECT transactionType, SUM(amount) AS total FROM (
      SELECT transactionType, TRNAMT AS amount
      FROM Transactions
      WHERE DTPOSTED LIKE ? AND splitCategory1 IS NULL

      UNION ALL

      SELECT transactionType, splitAmount1 AS amount
      FROM Transactions
      WHERE DTPOSTED LIKE ? AND splitCategory1 IS NOT NULL

      UNION ALL

      SELECT transactionType, splitAmount2 AS amount
      FROM Transactions
      WHERE DTPOSTED LIKE ? AND splitCategory2 IS NOT NULL
    )
    GROUP BY transactionType
  `
    )
    .all(month, month, month)
}

/**
 * @param {string} yyyymm - e.g. '202605'
 * @returns {{ category: string, total: number }[]}
 */
function getCategoryTotals(yyyymm) {
  const month = `${yyyymm}%`
  return db
    .prepare(
      `
    SELECT category, SUM(amount) AS total FROM (
      SELECT category, TRNAMT AS amount
      FROM Transactions
      WHERE DTPOSTED LIKE ? AND splitCategory1 IS NULL AND category IS NOT NULL

      UNION ALL

      SELECT splitCategory1 AS category, splitAmount1 AS amount
      FROM Transactions
      WHERE DTPOSTED LIKE ? AND splitCategory1 IS NOT NULL

      UNION ALL

      SELECT splitCategory2 AS category, splitAmount2 AS amount
      FROM Transactions
      WHERE DTPOSTED LIKE ? AND splitCategory2 IS NOT NULL
    )
    GROUP BY category
  `
    )
    .all(month, month, month)
}

/**
 * @param {string} yyyymm - e.g. '202605'
 * @returns {Object[]} Transactions with no category in the given month.
 */
function getUncategorized(yyyymm) {
  return db
    .prepare(
      `
    SELECT * FROM Transactions
    WHERE category IS NULL AND DTPOSTED LIKE ?
  `
    )
    .all(`${yyyymm}%`)
}

/**
 * All-time monthly income vs spending totals, ordered ascending.
 * @returns {{ month: string, income: number, spending: number }[]}
 */
function getMonthlyTotals() {
  return db
    .prepare(
      `
    SELECT
      SUBSTR(DTPOSTED, 1, 6) AS month,
      SUM(CASE WHEN transactionType = 'income'  THEN TRNAMT       ELSE 0 END) AS income,
      SUM(CASE WHEN transactionType = 'expense' THEN ABS(TRNAMT)  ELSE 0 END) AS spending
    FROM Transactions
    WHERE DTPOSTED IS NOT NULL
      AND COALESCE(transactionType, '') <> 'transfer'
    GROUP BY month
    ORDER BY month
  `
    )
    .all()
}

/**
 * @returns {{ ACCTID: string, count: number, total: number }[]}
 */
function getAccountSummary() {
  return db
    .prepare(
      `
    SELECT ACCTID, COUNT(*) AS count, SUM(CAST(TRNAMT AS REAL)) AS total
    FROM Transactions
    GROUP BY ACCTID
  `
    )
    .all()
}

/**
 * Cumulative month-end assets, liabilities, and net worth across all accounts.
 *
 * Classification order:
 *   1. accountCategory column ('asset' | 'liability') — explicit user override
 *   2. ACCTTYPE default — Checking / Savings / Money Market → asset; everything else → liability
 *
 * startingBalance is included as a month-0 seed so the headline number always
 * matches the per-account breakdown shown in the Net Worth view.
 *
 * Liabilities are reported as positive owed amounts (negated transaction sum).
 *
 * @returns {{ month: string, assets: number, liabilities: number, netWorth: number }[]}
 */
function getNetWorthHistory() {
  return db
    .prepare(
      `
      WITH
      -- Classify each account: explicit override wins, then ACCTTYPE default
      classified AS (
        SELECT
          ACCTID,
          COALESCE(
            accountCategory,
            CASE WHEN ACCTTYPE IN ('Checking','Savings','Money Market') THEN 'asset' ELSE 'liability' END
          ) AS role,
          COALESCE(startingBalance, 0) AS startingBalance
        FROM Accounts
      ),
      -- Sum startingBalance offsets once (month-independent base)
      base AS (
        SELECT
          COALESCE(SUM(CASE WHEN role = 'asset'     THEN startingBalance ELSE 0 END), 0) AS asset_base,
          COALESCE(SUM(CASE WHEN role = 'liability' THEN -startingBalance ELSE 0 END), 0) AS liab_base
        FROM classified
      ),
      -- Monthly transaction deltas per role
      monthly AS (
        SELECT
          SUBSTR(t.DTPOSTED, 1, 6) AS month,
          SUM(CASE WHEN c.role = 'asset'     THEN CAST(t.TRNAMT AS REAL) ELSE 0 END) AS asset_delta,
          SUM(CASE WHEN c.role = 'liability' THEN CAST(t.TRNAMT AS REAL) ELSE 0 END) AS liability_delta
        FROM Transactions t
        JOIN classified c ON t.ACCTID = c.ACCTID
        WHERE t.DTPOSTED IS NOT NULL
        GROUP BY month
      )
      SELECT
        m.month,
        b.asset_base + SUM(m.asset_delta)     OVER (ORDER BY m.month) AS assets,
        b.liab_base - SUM(m.liability_delta)  OVER (ORDER BY m.month) AS liabilities,
        (b.asset_base + SUM(m.asset_delta)    OVER (ORDER BY m.month))
          + (b.liab_base - SUM(m.liability_delta) OVER (ORDER BY m.month)) AS netWorth
      FROM monthly m, base b
      ORDER BY m.month
    `
    )
    .all()
}

/**
 * @returns {string[]} Distinct yyyymm strings that have transaction data, ascending.
 */
function getMonthsWithData() {
  return db
    .prepare(
      `
      SELECT DISTINCT SUBSTR(DTPOSTED, 1, 6) AS month
      FROM Transactions
      WHERE DTPOSTED IS NOT NULL
      ORDER BY month
    `
    )
    .all()
    .map((r) => r.month)
}

function checkDuplicateFitids(fitids) {
  if (!fitids.length) return []
  const placeholders = fitids.map(() => '?').join(',')
  return db
    .prepare(`SELECT FITID FROM Transactions WHERE FITID IN (${placeholders})`)
    .all(...fitids)
    .map((r) => r.FITID)
}

export default db
export {
  // Transactions
  getTransactions,
  getAllTransactions,
  createTransaction,
  createTransactions,
  updateTransaction,
  deleteTransaction,
  // Accounts
  upsertAccount,
  createManualAccount,
  getAccounts,
  getAccount,
  updateAccount,
  deleteAccount,
  // Reporting
  getMonthlySummary,
  getCategoryTotals,
  getUncategorized,
  getAccountSummary,
  getMonthsWithData,
  // Reporting (cont.)
  getMonthlyTotals,
  getNetWorthHistory,
  // Rules
  getRules,
  createRule,
  updateRule,
  deleteRule,
  applyRules,
  previewRule,
  previewKeywords,
  runRescanRecurring,
  // Custom Recurring
  getCustomRecurring,
  createCustomRecurring,
  updateCustomRecurring,
  deleteCustomRecurring,
  matchesCustomEntry,
  checkDuplicateFitids
}

function runRescanRecurring() {
  const customEntries = getCustomRecurring()
  const customFitids = new Set()

  if (customEntries.length) {
    const rows = db.prepare(`SELECT FITID, MEMO FROM Transactions WHERE TRNAMT < 0`).all()
    for (const row of rows) {
      if (customEntries.some((e) => matchesCustomEntry(row.MEMO, e))) {
        customFitids.add(row.FITID)
      }
    }
  }

  return rescanRecurring(db, customFitids)
}
