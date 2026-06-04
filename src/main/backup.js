import { ipcMain, dialog, app } from 'electron'
import db from './db.js'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
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

      // Open the temp DB with the current DPAPI key, and decrypt it
      const tempDb = new Database(tempDbPath)
      if (rawKey) {
        tempDb.pragma(`key='${rawKey}'`)
        tempDb.pragma(`rekey=''`) // Decrypts the SQLite file
      }
      tempDb.close()

      // Now tempDbPath is a plaintext SQLite database.
      // Encrypt it using AES-256-GCM and the user's passphrase.
      const salt = crypto.randomBytes(16)
      const iv = crypto.randomBytes(12)
      const key = crypto.scryptSync(passphrase, salt, 32)
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)

      const out = fs.createWriteStream(filePath)

      await new Promise((resolve, reject) => {
        out.on('error', reject)

        // Write salt and IV first
        out.write(salt)
        out.write(iv)

        cipher.on('data', (chunk) => out.write(chunk))
        cipher.on('end', () => {
          // GCM auth tag must be appended at the end
          out.write(cipher.getAuthTag())
          out.end()
          resolve()
        })
        cipher.on('error', reject)

        // Pipe the decrypted database into the cipher
        const rs = fs.createReadStream(tempDbPath)
        rs.on('data', (chunk) => cipher.write(chunk))
        rs.on('end', () => cipher.end())
        rs.on('error', reject)
      })

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

      const stat = fs.statSync(sourcePath)
      if (stat.size < 44) throw new Error('Invalid backup file (too small)')

      // 1. Read header (16 bytes salt, 12 bytes IV) and footer (16 bytes AuthTag)
      const fd = fs.openSync(sourcePath, 'r')
      const salt = Buffer.alloc(16)
      fs.readSync(fd, salt, 0, 16, 0)

      const iv = Buffer.alloc(12)
      fs.readSync(fd, iv, 0, 12, 16)

      const authTag = Buffer.alloc(16)
      fs.readSync(fd, authTag, 0, 16, stat.size - 16)
      fs.closeSync(fd)

      // 2. Setup decryption
      const derivedKey = crypto.scryptSync(passphrase, salt, 32)
      const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey, iv)
      decipher.setAuthTag(authTag)

      const DB_DIR = path.join(app.getPath('userData'), 'data')
      const tempDbPath = path.join(DB_DIR, `budget_import_${Date.now()}.db`)
      const KEY_PATH = path.join(DB_DIR, 'budget.key')

      const dbOut = fs.createWriteStream(tempDbPath)

      await new Promise((resolve, reject) => {
        // Read only the ciphertext portion (skip 28 byte header and 16 byte footer)
        const rs = fs.createReadStream(sourcePath, { start: 28, end: stat.size - 16 - 1 })

        dbOut.on('error', reject)

        decipher.on('data', (chunk) => {
          dbOut.write(chunk)
        })

        decipher.on('end', () => {
          dbOut.end(() => resolve())
        })

        decipher.on('error', () => {
          reject(new Error('Incorrect passphrase or corrupted file'))
        })

        rs.on('error', reject)
        rs.pipe(decipher)
      })

      // 3. The tempDbPath is now a plaintext SQLite DB.
      // We must encrypt it using the local DPAPI key.
      let rawKey = ''
      try {
        if (fs.existsSync(KEY_PATH)) {
          const protectedKey = fs.readFileSync(KEY_PATH)
          rawKey = dpapi.unprotectData(protectedKey, null, 'CurrentUser').toString('utf8')
        }
      } catch (err) {
        throw new Error('Failed to unprotect DPAPI key on import: ' + err.message)
      }

      const tempDb = new Database(tempDbPath)
      // It's plaintext, so we don't need 'key=' to open it. Just rekey to encrypt it.
      if (rawKey) {
        tempDb.pragma(`rekey='${rawKey}'`)
      }
      tempDb.close()

      // 4. Overwrite current DB
      db.close() // Close the current db connection so we can overwrite

      const DB_PATH = path.join(DB_DIR, 'budget.db')

      fs.copyFileSync(tempDbPath, DB_PATH)
      fs.unlinkSync(tempDbPath)

      // 5. Relaunch
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
