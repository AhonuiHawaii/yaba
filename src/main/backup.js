import { ipcMain, dialog, app } from 'electron'
import db from './db.js'
import fs from 'fs'
import path from 'path'
import dpapi from 'node-dpapi-prebuilt'
import Database from 'better-sqlite3-multiple-ciphers'

export function setupBackupHandlers() {
  ipcMain.handle('backup:export', async (event, passphrase) => {
    try {
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Export Backup',
        defaultPath: path.join(app.getPath('documents'), 'budget_backup.yaba'),
        filters: [{ name: 'YABA Backup', extensions: ['yaba'] }]
      })

      if (canceled || !filePath) return { success: false, canceled: true }

      const DB_DIR = path.join(app.getPath('userData'), 'data')
      const KEY_PATH = path.join(DB_DIR, 'budget.key')

      // Read and unprotect the current DPAPI key
      let rawKey = ''
      try {
        if (fs.existsSync(KEY_PATH)) {
          const protectedKey = fs.readFileSync(KEY_PATH)
          rawKey = dpapi.unprotectData(protectedKey, null, 'CurrentUser').toString('utf8')
        }
      } catch (err) {
        throw new Error('Failed to unprotect DPAPI key: ' + err.message)
      }

      // Perform a safe backup of the active SQLite database
      const tempDbPath = path.join(DB_DIR, `budget_temp_${Date.now()}.db`)
      const DB_PATH = path.join(DB_DIR, 'budget.db')

      // Force all WAL data into the main database file safely
      db.pragma('wal_checkpoint(TRUNCATE)')
      fs.copyFileSync(DB_PATH, tempDbPath)

      // Open the temp DB with the current DPAPI key, and rekey it with the user's passphrase
      const tempDb = new Database(tempDbPath)
      if (rawKey) {
        tempDb.pragma(`key='${rawKey}'`)
      }
      tempDb.pragma(`rekey='${passphrase}'`)
      tempDb.close()

      // Copy the rekeyed temp DB to the final destination
      fs.copyFileSync(tempDbPath, filePath)

      // Clean up temporary DB copy
      if (fs.existsSync(tempDbPath)) {
        fs.unlinkSync(tempDbPath)
      }

      return { success: true }
    } catch (err) {
      console.error('Export Backup Error:', err)
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('backup:import', async (event, passphrase) => {
    try {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Import Backup',
        properties: ['openFile'],
        filters: [{ name: 'YABA Backup', extensions: ['yaba'] }]
      })

      if (canceled || filePaths.length === 0) return { success: false, canceled: true }
      const sourcePath = filePaths[0]

      const DB_DIR = path.join(app.getPath('userData'), 'data')
      const tempDbPath = path.join(DB_DIR, `budget_import_${Date.now()}.db`)
      const KEY_PATH = path.join(DB_DIR, 'budget.key')

      // Copy the backup file to a temp location
      fs.copyFileSync(sourcePath, tempDbPath)

      // Get the local DPAPI key
      let rawKey = ''
      try {
        if (fs.existsSync(KEY_PATH)) {
          const protectedKey = fs.readFileSync(KEY_PATH)
          rawKey = dpapi.unprotectData(protectedKey, null, 'CurrentUser').toString('utf8')
        }
      } catch (err) {
        throw new Error('Failed to unprotect DPAPI key on import: ' + err.message)
      }

      // Open the backup file using the user's passphrase
      try {
        const tempDb = new Database(tempDbPath)
        tempDb.pragma(`key='${passphrase}'`)

        // Run a simple query to verify the passphrase is correct.
        // If incorrect, this will throw an error (e.g., file is not a database).
        tempDb.prepare('SELECT 1 FROM sqlite_schema').get()

        // If correct, rekey it to the local DPAPI key
        if (rawKey) {
          tempDb.pragma(`rekey='${rawKey}'`)
        } else {
          tempDb.pragma(`rekey=''`) // Decrypt if there is no local DPAPI key
        }
        tempDb.close()
      } catch (err) {
        throw new Error('Incorrect passphrase or corrupted file: ' + err.message)
      }

      // Overwrite current DB
      db.close() // Close the current db connection so we can overwrite

      const DB_PATH = path.join(DB_DIR, 'budget.db')
      fs.copyFileSync(tempDbPath, DB_PATH)
      fs.unlinkSync(tempDbPath)

      // Relaunch
      setTimeout(() => {
        app.relaunch()
        app.exit(0)
      }, 500)

      return { success: true }
    } catch (err) {
      console.error('Import Backup Error:', err)
      const DB_DIR = path.join(app.getPath('userData'), 'data')
      try {
        fs.readdirSync(DB_DIR)
          .filter((f) => f.startsWith('budget_import_') && f.endsWith('.db'))
          .forEach((f) => fs.unlinkSync(path.join(DB_DIR, f)))
      } catch {
        /* ignore */
      }
      return { success: false, error: err.message }
    }
  })
}
