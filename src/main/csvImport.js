import Papa from 'papaparse'
import { randomUUID } from 'node:crypto'

/*
  csvImport.js — Parses raw CSV text into OFX-shaped transaction objects.
  Mirrors the role ofx.js plays for OFX/QFX files.

  Mapping shape (each value may be a string shorthand or a descriptor):
    {
      DTPOSTED: { columns: ['Date', 'Time'], join: ' ' },
      TRNAMT:   { columns: ['Amount'] },
      NAME:     'Description',                     // shorthand -> { columns: ['Description'] }
      MEMO:     { columns: ['Memo'] },             // optional
      TRNTYPE:  { columns: ['Type'] }              // optional
    }

  FITID is always generated here (CSV-<uuid>), never user-mapped.
*/

// Columns the user can map CSV headers into. The UI renders one row per entry.
export const TARGET_COLUMNS = [
  { key: 'DTPOSTED', label: 'Posted Date (+ Time)', required: true, multi: true, join: ' ' },
  { key: 'TRNAMT', label: 'Amount', required: true, multi: false },
  { key: 'NAME', label: 'Description / Payee', required: true, multi: true, join: ' ' },
  { key: 'TRNTYPE', label: 'Transaction Type', required: true, multi: false },
  { key: 'MEMO', label: 'Memo / Notes', required: false, multi: true, join: ' — ' },
  { key: 'CHECKNUM', label: 'Check Number', required: false, multi: false },
  { key: 'REFNUM', label: 'Reference #', required: false, multi: false }
]

/**
 * Read the first few rows of a CSV file so the renderer can show the header
 * list and a small sample preview. No auto-guessing — the user maps manually.
 *
 * @param {string} csvText - Full CSV file contents.
 * @returns {{ headers: string[], sampleRows: object[], rowCount: number }}
 */
export function extractHeaders(csvText) {
  const result = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    preview: 5
  })

  if (result.errors?.length && result.errors[0].type !== 'Delimiter') {
    throw new Error(result.errors[0].message || 'Failed to parse CSV')
  }

  const fullCount = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true
  })

  return {
    headers: result.meta.fields || [],
    sampleRows: result.data || [],
    rowCount: (fullCount.data || []).length
  }
}

/**
 * Apply the user's mapping to every CSV row and emit OFX-shaped transactions.
 *
 * @param {string} csvText
 * @param {object} mapping - { <DB_COLUMN>: string | { columns: string[], join?: string } }
 * @param {{ invertAmount?: boolean }} [options]
 * @returns {object[]} Array of objects matching the OFX transaction shape used by db.js.
 */
export function extractCsvTransactions(csvText, mapping, options = {}) {
  if (!mapping || typeof mapping !== 'object') {
    throw new Error('mapping is required')
  }

  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true
  })

  if (parsed.errors?.length && parsed.errors[0].type !== 'Delimiter') {
    throw new Error(parsed.errors[0].message || 'Failed to parse CSV')
  }

  const rows = parsed.data || []
  const invert = options.invertAmount === true

  return rows.map((row) => {
    const txn = {
      FITID: `CSV-${randomUUID()}`,
      ACCTID: null, // Stamped by importCsvBatch once the account is resolved
      TRNTYPE: null,
      DTPOSTED: null,
      DTUSER: null,
      TRNAMT: null,
      NAME: null,
      MEMO: null,
      CHECKNUM: null,
      REFNUM: null,
      DTAVAIL: null,
      SRVRTID: null,
      PAYEEID: null,
      EXTDNAME: null,
      SIC: null,
      ORG: null
    }

    for (const target of TARGET_COLUMNS) {
      const descriptor = normalizeDescriptor(mapping[target.key])
      if (!descriptor || !descriptor.columns.length) continue

      const raw = joinColumns(row, descriptor.columns, descriptor.join ?? target.join ?? ' ')
      txn[target.key] = transformField(target.key, raw, { invert })
    }

    // Fall back to MEMO for NAME if NAME wasn't mapped
    if (!txn.NAME && txn.MEMO) txn.NAME = txn.MEMO

    return txn
  })
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function normalizeDescriptor(value) {
  if (value == null) return null
  if (typeof value === 'string') return { columns: [value] }
  if (Array.isArray(value)) return { columns: value }
  if (typeof value === 'object' && Array.isArray(value.columns)) {
    return { columns: value.columns, join: value.join }
  }
  return null
}

function joinColumns(row, columns, join) {
  return columns
    .map((col) => (row[col] == null ? '' : String(row[col]).trim()))
    .filter((v) => v.length > 0)
    .join(join)
}

function transformField(key, raw, { invert }) {
  if (key === 'DTPOSTED') return parseDateToOfx(raw)
  if (key === 'TRNAMT') return parseAmount(raw, invert)
  return raw
}

/**
 * Normalize any reasonable date / date+time string into OFX format:
 *   YYYYMMDDhhmmss.000[-5:EST]
 * Defaults to noon (120000) if no time component is supplied.
 */
function parseDateToOfx(value) {
  const d = value ? new Date(value) : new Date('2000-01-01T12:00:00')
  if (isNaN(d.getTime())) d.setTime(new Date('2000-01-01T12:00:00').getTime())

  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')

  const hadTime = /\d:\d/.test(value || '') || /\d{2}:\d{2}/.test(value || '')
  const hh = hadTime ? String(d.getHours()).padStart(2, '0') : '12'
  const mm = hadTime ? String(d.getMinutes()).padStart(2, '0') : '00'
  const ss = hadTime ? String(d.getSeconds()).padStart(2, '0') : '00'

  const offsetMinutes = d.getTimezoneOffset()
  const offsetHours = -(offsetMinutes / 60)
  const sign = offsetHours >= 0 ? '+' : ''
  const tzName = Intl.DateTimeFormat().resolvedOptions().timeZone

  return `${y}${m}${day}${hh}${mm}${ss}.000[${sign}${offsetHours}:${tzName}]`
}

function parseAmount(value, invert) {
  if (value == null || value === '') return 0
  const cleaned = String(value).replace(/[^0-9.-]+/g, '')
  let n = parseFloat(cleaned)
  if (isNaN(n)) n = 0
  if (invert) n = -n
  return n
}
