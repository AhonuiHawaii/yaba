import { ipcMain, dialog, app } from 'electron'
import db from './db.js'
import fs from 'fs'
import path from 'path'
import dpapi from 'node-dpapi-prebuilt'
import Database from 'better-sqlite3-multiple-ciphers'

export function setupBackupHandlers() {
  ipcMain.handle('backup:export', async (event, passphrase) => {
    let tempDbPath = null
    try {
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Export Backup',
        defaultPath: path.join(app.getPath('documents'), 'budget_backup.db'),
        filters: [{ name: 'SQLite Database', extensions: ['db'] }]
      })

      if (canceled || !filePath) return { success: false, canceled: true }

      const DB_DIR = path.join(app.getPath('userData'), 'data')
      const KEY_PATH = path.join(DB_DIR, 'budget.key')

      let rawKey = ''
      try {
        if (fs.existsSync(KEY_PATH)) {
          const protectedKey = fs.readFileSync(KEY_PATH)
          rawKey = dpapi.unprotectData(protectedKey, null, 'CurrentUser').toString('utf8')
        }
      } catch (err) {
        throw new Error('Failed to unprotect DPAPI key: ' + err.message)
      }

      const DB_PATH = path.join(DB_DIR, 'budget.db')
      tempDbPath = path.join(DB_DIR, `budget_temp_${Date.now()}.db`)

      db.pragma('wal_checkpoint(TRUNCATE)')
      fs.copyFileSync(DB_PATH, tempDbPath)

      const tempDb = new Database(tempDbPath)
      tempDb.pragma('cipher_compatibility = 4')
      if (rawKey) {
        tempDb.pragma(`key='${rawKey}'`)
      }
      // WAL mode doesn't support rekey — switch to rollback journal first
      tempDb.pragma('journal_mode = DELETE')
      tempDb.pragma(`rekey=''`)
      tempDb.close()

      fs.copyFileSync(tempDbPath, filePath)
      return { success: true }
    } catch (err) {
      console.error('Export Backup Error:', err)
      return { success: false, error: err.message }
    } finally {
      if (tempDbPath && fs.existsSync(tempDbPath)) {
        try { fs.unlinkSync(tempDbPath) } catch { /* ignore */ }
      }
    }
  })

  ipcMain.handle('backup:import', async (event, passphrase) => {
    let tempDbPath = null
    try {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Import Backup',
        properties: ['openFile'],
        filters: [{ name: 'SQLite Database', extensions: ['db'] }]
      })

      if (canceled || filePaths.length === 0) return { success: false, canceled: true }
      const sourcePath = filePaths[0]

      const DB_DIR = path.join(app.getPath('userData'), 'data')
      const KEY_PATH = path.join(DB_DIR, 'budget.key')
      tempDbPath = path.join(DB_DIR, `budget_import_${Date.now()}.db`)

      fs.copyFileSync(sourcePath, tempDbPath)

      let rawKey = ''
      try {
        if (fs.existsSync(KEY_PATH)) {
          const protectedKey = fs.readFileSync(KEY_PATH)
          rawKey = dpapi.unprotectData(protectedKey, null, 'CurrentUser').toString('utf8')
        }
      } catch (err) {
        throw new Error('Failed to unprotect DPAPI key on import: ' + err.message)
      }

      try {
        const tempDb = new Database(tempDbPath)
        tempDb.prepare('SELECT 1 FROM sqlite_schema').get()

        tempDb.pragma('journal_mode = DELETE')

        if (rawKey) {
          tempDb.pragma(`rekey='${rawKey}'`)
        }
        tempDb.close()
      } catch (err) {
        throw new Error('Not a valid SQLite database file: ' + err.message)
      }

      const DB_PATH = path.join(DB_DIR, 'budget.db')
      db.close()
      fs.copyFileSync(tempDbPath, DB_PATH)

      setTimeout(() => {
        app.relaunch()
        app.exit(0)
      }, 500)

      return { success: true }
    } catch (err) {
      console.error('Import Backup Error:', err)
      return { success: false, error: err.message }
    } finally {
      if (tempDbPath && fs.existsSync(tempDbPath)) {
        try { fs.unlinkSync(tempDbPath) } catch { /* ignore */ }
      }
    }
  })
}
