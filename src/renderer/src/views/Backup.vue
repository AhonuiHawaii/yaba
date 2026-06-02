<template>
  <div class="backup-page-wrapper">
    <v-alert
      v-if="error"
      type="error"
      variant="flat"
      closable
      class="mb-4 rounded-lg"
      @click:close="error = ''"
    >
      {{ error }}
    </v-alert>

    <v-alert
      v-if="success"
      type="success"
      variant="flat"
      closable
      class="mb-4 rounded-lg"
      @click:close="success = ''"
    >
      {{ success }}
    </v-alert>

    <!-- Header Section -->
    <div class="backup-header-section">
      <h1 class="backup-title">Backup & Restore</h1>
      <p class="backup-subtitle">
        Your data lives in a single local file — keep copies somewhere safe
      </p>
    </div>

    <!-- 3 Metrics Cards -->
    <div class="stats-row">
      <v-card class="stat-card" elevation="1">
        <div class="stat-label">Database Size</div>
        <div class="stat-value">{{ formattedDbSize }}</div>
        <div class="stat-subtext">
          <div>{{ totalTransactions.toLocaleString() }} transactions</div>
          <div v-if="dbPath" class="db-path-short" :title="formattedDbPath">
            {{ shortenedPath }}
          </div>
        </div>
      </v-card>

      <v-card class="stat-card" elevation="1">
        <div class="stat-label">Accounts</div>
        <div class="stat-value">{{ totalAccounts }}</div>
        <div class="stat-subtext">{{ linkedAccountsCount }} linked via OFX/QFX</div>
      </v-card>

      <v-card class="stat-card" elevation="1">
        <div class="stat-label">Encryption</div>
        <div class="stat-value encryption-active">On</div>
        <div class="stat-subtext">AES-256</div>
      </v-card>
    </div>

    <!-- 2 Action Cards -->
    <div class="actions-row">
      <!-- Export Card -->
      <v-card class="action-card" elevation="1">
        <div class="card-title-row">
          <v-avatar color="primary" variant="tonal" size="34" rounded="lg">
            <v-icon size="18">mdi-export</v-icon>
          </v-avatar>
          <h2 class="card-header-title">Export a backup</h2>
        </div>
        
        <p class="card-description-text">
          Save a snapshot of your transactions, accounts and budgets to a single encrypted `.ledgerbak` file.
        </p>

        <div class="included-header">Included in backup</div>
        <div class="tags-container">
          <span class="content-tag">
            <v-icon size="14" class="mr-1" color="primary">mdi-swap-vertical</v-icon>
            Transactions
          </span>
          <span class="content-tag">
            <v-icon size="14" class="mr-1" color="primary">mdi-bank-outline</v-icon>
            Accounts
          </span>
          <span class="content-tag">
            <v-icon size="14" class="mr-1" color="primary">mdi-sitemap-outline</v-icon>
            Budgets & rules
          </span>
        </div>

        <div class="toggle-control-row">
          <span class="toggle-label">Encrypt with password</span>
          <v-switch
            v-model="encryptWithPassword"
            color="primary"
            hide-details
            inset
            density="compact"
          />
        </div>

        <!-- Password input (smooth transition) -->
        <v-expand-transition>
          <div v-if="encryptWithPassword" class="passphrase-input-container">
            <label class="passphrase-label">Encryption Passphrase</label>
            <input
              v-model="passphrase"
              type="password"
              placeholder="Enter passphrase (minimum 8 characters)"
              class="passphrase-input-field"
            />
            <span class="passphrase-hint">Must be at least 8 characters. Do not lose this passphrase.</span>
          </div>
        </v-expand-transition>

        <div class="action-buttons-row">
          <button
            class="btn-export-primary"
            :disabled="isExporting || !isValid"
            @click="handleExport"
          >
            <v-icon size="16" class="mr-1">mdi-download</v-icon>
            Export now
          </button>
          <button
            class="btn-export-secondary"
            :disabled="isExporting || !isValid"
            @click="handleExport"
          >
            <v-icon size="16" class="mr-1">mdi-folder-open-outline</v-icon>
            Choose folder
          </button>
        </div>
      </v-card>

      <!-- Restore Card -->
      <v-card class="action-card" elevation="1">
        <div class="card-title-row">
          <v-avatar color="primary" variant="tonal" size="34" rounded="lg">
            <v-icon size="18">mdi-import</v-icon>
          </v-avatar>
          <h2 class="card-header-title">Restore from a backup</h2>
        </div>

        <p class="card-description-text">
          Replace the current data with a saved backup file. This cannot be undone.
        </p>

        <div class="drag-drop-area" @click="handleImport">
          <v-icon size="28" color="primary">mdi-upload</v-icon>
          <span class="drag-drop-label">or click to browse</span>
        </div>

        <div class="toggle-control-row mt-auto">
          <span class="toggle-label">Merge instead of replace (keep newer records)</span>
          <v-switch
            v-model="mergeInsteadOfReplace"
            color="primary"
            hide-details
            inset
            density="compact"
            :disabled="true"
          />
        </div>
      </v-card>
    </div>

    <!-- Confirm Dialog -->
    <v-dialog v-model="showConfirmDialog" max-width="400" persistent>
      <v-card rounded="xl" class="pa-5">
        <v-card-title class="text-h6 font-weight-bold pb-2 px-0">Confirm Restore</v-card-title>
        <v-card-text class="text-body-1 text-medium-emphasis pb-4 px-0">
          Restoring a backup will overwrite your current database. Are you sure you want to proceed?
        </v-card-text>
        <v-card-actions class="px-0 pb-0">
          <v-spacer />
          <v-btn variant="text" rounded="lg" class="text-capitalize" @click="showConfirmDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            rounded="lg"
            class="text-capitalize text-white"
            :loading="isImporting"
            @click="confirmImport"
          >
            Yes, Overwrite
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserBudgetsStore } from '../stores/userBudgets'
import { useUserCategoriesStore } from '../stores/userCategories'
import { useUserAccountsStore } from '../stores/userAccounts'
import { useUserTransactionsStore } from '../stores/userTransactions'

const budgetsStore = useUserBudgetsStore()
const categoriesStore = useUserCategoriesStore()
const accountsStore = useUserAccountsStore()
const transactionsStore = useUserTransactionsStore()

const passphrase = ref('')
const isExporting = ref(false)
const isImporting = ref(false)
const encryptWithPassword = ref(true)
const mergeInsteadOfReplace = ref(false)
const showConfirmDialog = ref(false)
const error = ref('')
const success = ref('')

const totalTransactions = computed(() => {
  return transactionsStore.accountSummary.reduce((sum, item) => sum + item.count, 0)
})

const totalAccounts = computed(() => {
  return accountsStore.accounts.length
})

const linkedAccountsCount = computed(() => {
  return accountsStore.accounts.filter(a => a.ORG || a.INTU_BID).length
})

const calculatedDataSize = computed(() => {
  // Sum of raw transaction lengths
  const txSize = transactionsStore.transactions.reduce((acc, t) => acc + (t.rawTransaction ? t.rawTransaction.length : 0), 0)
  const acctSize = JSON.stringify(accountsStore.accounts).length
  const totalBytes = txSize + acctSize
  return totalBytes
})

const formattedDbSize = computed(() => {
  const bytes = calculatedDataSize.value
  if (bytes === 0) {
    if (totalAccounts.value > 0 || totalTransactions.value > 0) {
      // Estimated base size of an empty SQLite DB file + schema
      return '128.0 KB'
    }
    return '0.0 KB'
  }
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
})

const dbPath = computed(() => {
  const isWindows = window.api?.platform === 'win32'
  const isMac = window.api?.platform === 'darwin'
  const productName = window.api?.productName || 'YetAnotherBudgetApp'
  
  if (isWindows) {
    return `%AppData%\\${productName}\\data`
  } else if (isMac) {
    return `~/Library/Application Support/${productName}/data`
  } else {
    return `~/.config/${productName}/data`
  }
})

const shortenedPath = computed(() => {
  return dbPath.value
})

const formattedDbPath = computed(() => {
  return dbPath.value
})

const isValid = computed(() => {
  if (!encryptWithPassword.value) return true
  return passphrase.value.length >= 8
})

async function loadStats() {
  await accountsStore.fetchAccounts()
  await transactionsStore.fetchAccountSummary()
  // Fetch all transactions to calculate the exact raw transaction data size
  await transactionsStore.fetchTransactions({ DTPOSTED: '' })
}

async function handleExport() {
  error.value = ''
  success.value = ''
  isExporting.value = true
  try {
    const res = await window.electron.ipcRenderer.invoke('backup:export', passphrase.value)
    if (res.canceled) {
      // User canceled, do nothing
    } else if (res.success) {
      success.value = 'Backup exported successfully.'
      passphrase.value = ''
      await loadStats()
    } else {
      error.value = res.error || 'Failed to export backup.'
    }
  } catch (err) {
    error.value = err.message || 'An unexpected error occurred.'
  } finally {
    isExporting.value = false
  }
}

function handleImport() {
  showConfirmDialog.value = true
}

async function confirmImport() {
  error.value = ''
  success.value = ''
  isImporting.value = true
  try {
    const res = await window.electron.ipcRenderer.invoke('backup:import', passphrase.value)
    if (res.canceled) {
      showConfirmDialog.value = false
    } else if (res.success) {
      success.value =
        'Backup restored successfully. Please restart the application to load your restored data.'
      passphrase.value = ''
      showConfirmDialog.value = false
    } else {
      error.value = res.error || 'Failed to restore backup.'
    }
  } catch (err) {
    error.value = err.message || 'An unexpected error occurred.'
  } finally {
    isImporting.value = false
  }
}

onMounted(() => {
  categoriesStore.fetchCategories()
  budgetsStore.fetchBudgets()
  loadStats()
})
</script>

<style scoped>
.backup-page-wrapper {
  padding: 24px;
  background-color: var(--color-background);
  min-height: 100vh;
  font-family: var(--font-family);
  color: var(--color-text-primary);
}

.backup-header-section {
  margin-bottom: 24px;
}

.backup-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: 4px;
}

.backup-subtitle {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.db-path-text {
  font-family: monospace;
  background-color: var(--color-surface-light);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  font-size: 12px;
}

/* Stats Row */
.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

@media (max-width: 900px) {
  .stats-row {
    grid-template-columns: 1fr;
  }
}

.stat-card {
  background-color: var(--color-surface);
  border-radius: var(--radius-xl) !important;
  padding: 20px 24px;
  border: 1px solid var(--color-border);
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md) !important;
}

.stat-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
}

.stat-value {
  font-size: 32px;
  font-weight: 800;
  color: var(--color-text-primary);
  line-height: 1.1;
}

.stat-value.encryption-active {
  color: var(--color-success);
}

.stat-subtext {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-top: 4px;
}

/* Actions Row */
.actions-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

@media (max-width: 960px) {
  .actions-row {
    grid-template-columns: 1fr;
  }
}

.action-card {
  background-color: var(--color-surface);
  border-radius: var(--radius-xl) !important;
  padding: 24px;
  border: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  min-height: 380px;
}

.card-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}


.card-header-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.card-description-text {
  font-size: 13.5px;
  color: var(--color-text-secondary);
  line-height: 1.5;
  margin-bottom: 20px;
}

.included-header {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
}

.content-tag {
  display: inline-flex;
  align-items: center;
  background-color: color-mix(in srgb, var(--color-primary) 10%, var(--color-surface));
  color: var(--color-primary);
  padding: 4px 12px;
  border-radius: var(--radius-lg);
  font-size: 12px;
  font-weight: 600;
}

.toggle-control-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.toggle-label {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.passphrase-input-container {
  display: flex;
  flex-direction: column;
  margin-bottom: 16px;
}

.passphrase-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
}

.passphrase-input-field {
  width: 100%;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background-color: var(--color-background);
  color: var(--color-text-primary);
  font-size: 13.5px;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  outline: none;
}

.passphrase-input-field:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 15%, transparent);
}

.passphrase-hint {
  font-size: 11px;
  color: var(--color-text-secondary);
  margin-top: 4px;
}

.action-buttons-row {
  display: flex;
  gap: 12px;
  margin-top: auto;
}

.btn-export-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-primary);
  color: var(--color-on-primary);
  padding: 10px 16px;
  border-radius: var(--radius-md);
  font-size: 13.5px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: background-color var(--transition-fast), transform 100ms;
}

.btn-export-primary:hover:not(:disabled) {
  background-color: var(--color-primary-darken);
}

.btn-export-primary:active:not(:disabled) {
  transform: scale(0.98);
}

.btn-export-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-export-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-surface);
  color: var(--color-text-primary);
  padding: 10px 16px;
  border-radius: var(--radius-md);
  font-size: 13.5px;
  font-weight: 600;
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: background-color var(--transition-fast), border-color var(--transition-fast);
}

.btn-export-secondary:hover:not(:disabled) {
  background-color: var(--color-background);
  border-color: var(--color-border-strong);
}

.btn-export-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Drag Drop Zone */
.drag-drop-area {
  border: 1.5px dashed var(--color-border-strong);
  border-radius: var(--radius-lg);
  padding: 32px 16px;
  text-align: center;
  cursor: pointer;
  transition: border-color var(--transition-fast), background-color var(--transition-fast);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 20px;
}

.drag-drop-area:hover {
  border-color: var(--color-primary);
  background-color: color-mix(in srgb, var(--color-primary) 5%, var(--color-surface));
}

.drag-drop-label {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.mt-auto {
  margin-top: auto;
}

.db-path-short {
  font-family: monospace;
  font-size: 11px;
  color: var(--color-text-secondary);
  opacity: 0.85;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 4px;
  max-width: 100%;
}
</style>
