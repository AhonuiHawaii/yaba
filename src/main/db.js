import Database from 'better-sqlite3-multiple-ciphers'
import dpapi from 'node-dpapi-prebuilt'
import { app } from 'electron'
import { join } from 'path'
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs'
import { randomBytes } from 'crypto'

/*
  Database initialization
  - Encryption key generated once, protected by Windows DPAPI (CurrentUser)
  - Only the current Windows user can recover the key
  - SQLite-level encryption via better-sqlite3-multiple-ciphers
*/

const DB_DIR = join(app.getPath('userData'), 'data')
const DB_PATH = join(DB_DIR, 'budget.db')
const KEY_PATH = join(DB_DIR, 'budget.key')

mkdirSync(DB_DIR, { recursive: true })

// // Resolve or create encryption key — DPAPI CurrentUser scope ties it to this Windows account
const encryptionKey = (() => {
  if (existsSync(KEY_PATH)) {
    return dpapi.unprotectData(readFileSync(KEY_PATH), null, 'CurrentUser').toString('utf8')
  }
  const key = randomBytes(32).toString('hex')
  writeFileSync(KEY_PATH, dpapi.protectData(Buffer.from(key), null, 'CurrentUser'))
  return key
})()

const db = new Database(DB_PATH)
db.pragma(`key='${encryptionKey}'`)
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
    tags            TEXT, 
    dueDate         INTEGER,
    frequency       TEXT,
    subscription       INTEGER NOT NULL DEFAULT 0,
    bill               INTEGER NOT NULL DEFAULT 0,
    linkedAccount      TEXT
  )
`)

// Migrate: add linkedAccount if it doesn't exist yet (idempotent)
try {
  db.exec(`ALTER TABLE Transactions ADD COLUMN linkedAccount TEXT`)
} catch {
  /* column already exists */
}

db.exec(`CREATE INDEX IF NOT EXISTS idx_transactions_dtposted ON Transactions(DTPOSTED)`)
db.exec(`CREATE INDEX IF NOT EXISTS idx_transactions_acctid   ON Transactions(ACCTID)`)
db.exec(`CREATE INDEX IF NOT EXISTS idx_transactions_category ON Transactions(category)`)

// ── Categories & Budgets ──────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS Categories (
    id        TEXT PRIMARY KEY,
    name      TEXT NOT NULL,
    type      TEXT NOT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS Budgets (
    categoryId TEXT NOT NULL,
    month      TEXT NOT NULL,
    amount     REAL NOT NULL,
    createdAt  TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt  TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (categoryId, month)
  )
`)

// Clean up orphaned categories in Transactions & CategoryRules (from old Dexie state)
db.exec(`
  UPDATE Transactions SET category = NULL WHERE category IS NOT NULL AND category NOT IN (SELECT id FROM Categories);
  UPDATE Transactions SET splitCategory2 = NULL WHERE splitCategory2 IS NOT NULL AND splitCategory2 NOT IN (SELECT id FROM Categories);
`)

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
  'tags',
  'dueDate',
  'frequency',
  'subscription',
  'bill',
  'linkedAccount'
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
    return db
      .prepare(
        `
      SELECT t.*, a.displayName as accountName, a.ACCTTYPE as accountType,
             c.name as categoryName, c.type as categoryType,
             c2.name as splitCategory2Name, c2.type as splitCategory2Type
      FROM Transactions t
      LEFT JOIN Accounts a ON t.ACCTID = a.ACCTID
      LEFT JOIN Categories c ON t.category = c.id
      LEFT JOIN Categories c2 ON t.splitCategory2 = c2.id
      WHERE t.DTPOSTED LIKE ?
    `
      )
      .all(`${yyyymm}%`)
  }

  const clauses = entries.map(([col]) =>
    DATE_COLUMNS.has(col) ? `t.${col} LIKE ?` : `t.${col} = ?`
  )
  const values = entries.map(([col, val]) => (DATE_COLUMNS.has(col) ? `${val}%` : val))

  return db
    .prepare(
      `
    SELECT t.*, a.displayName as accountName, a.ACCTTYPE as accountType,
           c.name as categoryName, c.type as categoryType,
           c2.name as splitCategory2Name, c2.type as splitCategory2Type
    FROM Transactions t
    LEFT JOIN Accounts a ON t.ACCTID = a.ACCTID
    LEFT JOIN Categories c ON t.category = c.id
    LEFT JOIN Categories c2 ON t.splitCategory2 = c2.id
    WHERE ${clauses.join(' AND ')}
  `
    )
    .all(...values)
}

const getAllTransactions = () => {
  return db
    .prepare(
      `
    SELECT t.*, a.displayName as accountName, a.ACCTTYPE as accountType,
           c.name as categoryName, c.type as categoryType,
           c2.name as splitCategory2Name, c2.type as splitCategory2Type
    FROM Transactions t
    LEFT JOIN Accounts a ON t.ACCTID = a.ACCTID
    LEFT JOIN Categories c ON t.category = c.id
    LEFT JOIN Categories c2 ON t.splitCategory2 = c2.id
  `
    )
    .all()
}

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
       CHECKNUM, REFNUM, DTAVAIL, SRVRTID, PAYEEID, EXTDNAME, SIC, ORG, rawTransaction)
    VALUES
      (@FITID, @ACCTID, @TRNTYPE, @DTPOSTED, @DTUSER, @TRNAMT, @NAME, COALESCE(NULLIF(@MEMO, ''), @NAME),
       @CHECKNUM, @REFNUM, @DTAVAIL, @SRVRTID, @PAYEEID, @EXTDNAME, @SIC, @ORG, @rawTransaction)
  `)

  let inserted = 0
  db.transaction((rows) => {
    for (const txn of rows) {
      inserted += stmt.run({ ...txn, rawTransaction: JSON.stringify(txn) }).changes
    }
  })(txns)

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

  const data = {
    ...acct,
    startingBalance: acct.startingBalance !== undefined ? acct.startingBalance : null
  }

  db.prepare(
    `
    INSERT INTO Accounts (ACCTID, ACCTTYPE, ORG, INTU_BID, startingBalance, lastImport)
    VALUES (@ACCTID, @ACCTTYPE, @ORG, @INTU_BID, @startingBalance, CURRENT_TIMESTAMP)
    ON CONFLICT(ACCTID) DO UPDATE SET
      ACCTTYPE        = excluded.ACCTTYPE,
      ORG             = excluded.ORG,
      INTU_BID        = excluded.INTU_BID,
      startingBalance = COALESCE(excluded.startingBalance, startingBalance),
      lastImport      = CURRENT_TIMESTAMP
  `
  ).run(data)
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

// ── Categories & Budgets API ──────────────────────────────────────────────────

function getCategories() {
  return db.prepare('SELECT * FROM Categories ORDER BY name ASC').all()
}

function createCategory(data) {
  const id = crypto.randomUUID()
  db.prepare('INSERT INTO Categories (id, name, type) VALUES (@id, @name, @type)').run({
    id,
    name: data.name,
    type: data.type
  })
  return db.prepare('SELECT * FROM Categories WHERE id = ?').get(id)
}

function updateCategory(id, updates) {
  const ALLOWED = new Set(['name', 'type'])
  const entries = Object.entries(updates).filter(([col]) => ALLOWED.has(col))
  if (entries.length === 0) return 0

  const setClause = entries
    .map(([col]) => `${col} = ?`)
    .concat('updatedAt = CURRENT_TIMESTAMP')
    .join(', ')
  const values = entries.map(([, val]) => val)

  return db.prepare(`UPDATE Categories SET ${setClause} WHERE id = ?`).run(...values, id).changes
}

function deleteCategory(id) {
  return db.transaction(() => {
    db.prepare('DELETE FROM Categories WHERE id = ?').run(id)
    db.prepare('DELETE FROM Budgets WHERE categoryId = ?').run(id)
    db.prepare('UPDATE Transactions SET category = NULL WHERE category = ?').run(id)
    db.prepare('UPDATE Transactions SET splitCategory2 = NULL WHERE splitCategory2 = ?').run(id)
    db.prepare("DELETE FROM RuleActions WHERE type = 'category' AND value = ?").run(id)
  })()
}

function getBudgets() {
  return db.prepare('SELECT * FROM Budgets').all()
}

function upsertBudget(categoryId, amount, month) {
  return db
    .prepare(
      `
    INSERT INTO Budgets (categoryId, month, amount)
    VALUES (@categoryId, @month, @amount)
    ON CONFLICT(categoryId, month) DO UPDATE SET
      amount = excluded.amount,
      updatedAt = CURRENT_TIMESTAMP
  `
    )
    .run({ categoryId, month, amount: Number(amount) || 0 }).changes
}

function getCategoryTypes() {
  return db
    .prepare('SELECT DISTINCT type FROM Categories ORDER BY type ASC')
    .all()
    .map((r) => r.type)
}

// ── Rule Engine (Relational) ───────────────────────────────────────────────────

db.exec(`
  DROP TABLE IF EXISTS CategoryRules;
  DROP TABLE IF EXISTS CustomRecurring;

  CREATE TABLE IF NOT EXISTS Rules (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT NOT NULL,
    priority     INTEGER DEFAULT 0,
    createdAt    TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS RuleConditions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    ruleId       INTEGER NOT NULL,
    field        TEXT NOT NULL,
    operator     TEXT NOT NULL,
    value        TEXT NOT NULL,
    FOREIGN KEY(ruleId) REFERENCES Rules(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS RuleActions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    ruleId       INTEGER NOT NULL,
    type         TEXT NOT NULL,
    value        TEXT,
    FOREIGN KEY(ruleId) REFERENCES Rules(id) ON DELETE CASCADE
  );

  DELETE FROM RuleActions WHERE type = 'category' AND value NOT IN (SELECT id FROM Categories);
`)

function getRules() {
  const rules = db.prepare('SELECT * FROM Rules ORDER BY priority DESC, id ASC').all()
  const conditions = db.prepare('SELECT * FROM RuleConditions').all()
  const actions = db.prepare('SELECT * FROM RuleActions').all()

  // Map them together
  const condMap = {}
  const actMap = {}
  for (const c of conditions) {
    if (!condMap[c.ruleId]) condMap[c.ruleId] = []
    condMap[c.ruleId].push(c)
  }
  for (const a of actions) {
    if (!actMap[a.ruleId]) actMap[a.ruleId] = []
    actMap[a.ruleId].push(a)
  }

  return rules.map((r) => ({
    ...r,
    conditions: condMap[r.id] || [],
    actions: actMap[r.id] || []
  }))
}

function createRule(rule) {
  return db.transaction(() => {
    const info = db.prepare('INSERT INTO Rules (name, priority) VALUES (@name, @priority)').run({
      name: rule.name || 'Untitled Rule',
      priority: rule.priority ?? 0
    })
    const ruleId = info.lastInsertRowid

    if (rule.conditions && rule.conditions.length > 0) {
      const stmt = db.prepare(
        'INSERT INTO RuleConditions (ruleId, field, operator, value) VALUES (?, ?, ?, ?)'
      )
      for (const c of rule.conditions) {
        stmt.run(ruleId, c.field, c.operator, c.value)
      }
    }

    if (rule.actions && rule.actions.length > 0) {
      const stmt = db.prepare('INSERT INTO RuleActions (ruleId, type, value) VALUES (?, ?, ?)')
      for (const a of rule.actions) {
        stmt.run(ruleId, a.type, a.value)
      }
    }

    // Return the inserted rule by re-fetching
    const r = db.prepare('SELECT * FROM Rules WHERE id = ?').get(ruleId)
    r.conditions = db.prepare('SELECT * FROM RuleConditions WHERE ruleId = ?').all(ruleId)
    r.actions = db.prepare('SELECT * FROM RuleActions WHERE ruleId = ?').all(ruleId)
    return r
  })()
}

function updateRule(id, updates) {
  return db.transaction(() => {
    // Update main table if fields exist
    if (updates.name !== undefined || updates.priority !== undefined) {
      const sets = []
      const vals = []
      if (updates.name !== undefined) {
        sets.push('name = ?')
        vals.push(updates.name)
      }
      if (updates.priority !== undefined) {
        sets.push('priority = ?')
        vals.push(updates.priority)
      }
      if (sets.length > 0) {
        db.prepare(`UPDATE Rules SET ${sets.join(', ')} WHERE id = ?`).run(...vals, id)
      }
    }

    // Replace conditions if provided
    if (updates.conditions) {
      db.prepare('DELETE FROM RuleConditions WHERE ruleId = ?').run(id)
      const stmt = db.prepare(
        'INSERT INTO RuleConditions (ruleId, field, operator, value) VALUES (?, ?, ?, ?)'
      )
      for (const c of updates.conditions) {
        stmt.run(id, c.field, c.operator, c.value)
      }
    }

    // Replace actions if provided
    if (updates.actions) {
      db.prepare('DELETE FROM RuleActions WHERE ruleId = ?').run(id)
      const stmt = db.prepare('INSERT INTO RuleActions (ruleId, type, value) VALUES (?, ?, ?)')
      for (const a of updates.actions) {
        stmt.run(id, a.type, a.value)
      }
    }
    return 1
  })()
}

function deleteRule(id) {
  return db.prepare('DELETE FROM Rules WHERE id = ?').run(id).changes
}

const normalizeBankText = (value) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['']/g, '')
    .replace(/[*#:/\\|_()[\]{}-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

function matchesOneCondition(tx, { field, operator, value }) {
  const raw = tx[field]
  const fieldStr = String(raw ?? '')
  switch (operator) {
    case 'contains':
      return normalizeBankText(fieldStr).includes(normalizeBankText(value))
    case 'notContains':
      return !normalizeBankText(fieldStr).includes(normalizeBankText(value))
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

/**
 * Evaluates rules (highest priority first). Returns patch actions for matched rules.
 */
function applyRules(transactions) {
  const rules = getRules()
  if (!rules.length || !transactions.length) return []

  const patches = []
  for (const txn of transactions) {
    for (const rule of rules) {
      if (!rule.conditions || rule.conditions.length === 0) continue

      // All conditions must pass (AND logic)
      let matches = true
      for (const cond of rule.conditions) {
        if (!matchesOneCondition(txn, cond)) {
          matches = false
          break
        }
      }

      if (matches) {
        const patch = { FITID: txn.FITID }
        for (const action of rule.actions || []) {
          // Flatten action array into object keys for the updater
          if (action.type === 'category') patch.category = action.value
          if (action.type === 'transactionType') patch.transactionType = action.value
          if (action.type === 'rename') patch.rename = action.value
          if (action.type === 'subscription') patch.subscription = Number(action.value)
          if (action.type === 'bill') patch.bill = Number(action.value)
          if (action.type === 'linkAccount') patch.linkAccount = action.value
        }
        // Always push a patch if there's a match, even if actions are empty,
        // though normally actions aren't empty.
        if (Object.keys(patch).length > 1) {
          patches.push(patch)
        }
        break
      }
    }
  }
  return patches
}

function previewRule({ conditions }) {
  if (!conditions || !conditions.length) return { count: 0, samples: [] }
  const txs = db
    .prepare(
      'SELECT FITID, NAME, MEMO, TRNAMT, DTPOSTED, category FROM Transactions ORDER BY DTPOSTED DESC'
    )
    .all()

  const matches = txs.filter((tx) => {
    for (const cond of conditions) {
      if (!matchesOneCondition(tx, cond)) return false
    }
    return true
  })
  return { count: matches.length, samples: matches }
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
    SELECT COALESCE(c.type, sub.transactionType) as transactionType, SUM(sub.amount) AS total FROM (
      SELECT transactionType, category, TRNAMT AS amount
      FROM Transactions
      WHERE DTPOSTED LIKE ? AND splitAmount1 IS NULL

      UNION ALL

      SELECT transactionType, category, splitAmount1 AS amount
      FROM Transactions
      WHERE DTPOSTED LIKE ? AND splitAmount1 IS NOT NULL

      UNION ALL

      SELECT transactionType, splitCategory2 AS category, splitAmount2 AS amount
      FROM Transactions
      WHERE DTPOSTED LIKE ? AND splitCategory2 IS NOT NULL
    ) sub
    LEFT JOIN Categories c ON sub.category = c.id
    GROUP BY COALESCE(c.type, sub.transactionType)
  `
    )
    .all(month, month, month)
}

/**
 * @param {string} yyyymm - e.g. '202605'
 * @returns {{ category: string, categoryName: string, categoryType: string, total: number }[]}
 */
function getCategoryTotals(yyyymm) {
  const month = `${yyyymm}%`
  return db
    .prepare(
      `
    SELECT sub.category, c.name as categoryName, c.type as categoryType, SUM(sub.amount) AS total FROM (
      SELECT category, TRNAMT AS amount
      FROM Transactions
      WHERE DTPOSTED LIKE ? AND splitAmount1 IS NULL AND category IS NOT NULL

      UNION ALL

      SELECT category, splitAmount1 AS amount
      FROM Transactions
      WHERE DTPOSTED LIKE ? AND splitAmount1 IS NOT NULL

      UNION ALL

      SELECT splitCategory2 AS category, splitAmount2 AS amount
      FROM Transactions
      WHERE DTPOSTED LIKE ? AND splitCategory2 IS NOT NULL
    ) sub
    LEFT JOIN Categories c ON sub.category = c.id
    GROUP BY sub.category
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

function getDebtPayments() {
  return db
    .prepare(
      'SELECT linkedAccount, SUM(TRNAMT) as total FROM Transactions WHERE linkedAccount IS NOT NULL GROUP BY linkedAccount'
    )
    .all()
}

function checkFuzzyDuplicates(transactions) {
  if (!transactions || !transactions.length) return []

  const fuzzyDuplicates = []
  const stmt = db.prepare('SELECT * FROM Transactions WHERE ACCTID = ? AND TRNAMT = ?')

  for (const txn of transactions) {
    if (!txn.ACCTID || !txn.TRNAMT || !txn.DTPOSTED) continue

    const candidates = stmt.all(txn.ACCTID, txn.TRNAMT)
    if (!candidates.length) continue

    const tYear = parseInt(txn.DTPOSTED.substring(0, 4), 10)
    const tMonth = parseInt(txn.DTPOSTED.substring(4, 6), 10) - 1
    const tDay = parseInt(txn.DTPOSTED.substring(6, 8), 10)
    const tDate = new Date(tYear, tMonth, tDay).getTime()

    for (const cand of candidates) {
      if (cand.FITID === txn.FITID) continue
      if (!cand.DTPOSTED) continue

      const cYear = parseInt(cand.DTPOSTED.substring(0, 4), 10)
      const cMonth = parseInt(cand.DTPOSTED.substring(4, 6), 10) - 1
      const cDay = parseInt(cand.DTPOSTED.substring(6, 8), 10)
      const cDate = new Date(cYear, cMonth, cDay).getTime()

      const diffDays = Math.abs(tDate - cDate) / (1000 * 60 * 60 * 24)
      if (diffDays <= 3) {
        fuzzyDuplicates.push({ imported: txn, existing: cand })
        break
      }
    }
  }
  return fuzzyDuplicates
}

function getAccountBalance(acctid) {
  const account = getAccount(acctid)
  if (!account) return null

  const row = db
    .prepare('SELECT SUM(TRNAMT) as total FROM Transactions WHERE ACCTID = ?')
    .get(acctid)
  const sumTransactions = row.total || 0
  const startingBalance = account.startingBalance || 0

  return startingBalance + sumTransactions
}

export default db
export {
  // Transactions
  getTransactions,
  getAllTransactions,
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
  checkDuplicateFitids,
  // Categories & Budgets
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getBudgets,
  upsertBudget,
  getCategoryTypes,
  getDebtPayments,
  checkFuzzyDuplicates,
  getAccountBalance
}
