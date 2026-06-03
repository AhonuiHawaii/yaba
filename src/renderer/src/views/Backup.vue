<template>
  <v-container fluid class="pa-6">
    <v-alert
      v-if="error"
      type="error"
      variant="flat"
      closable
      rounded="lg"
      class="mb-4"
      @click:close="error = ''"
    >
      {{ error }}
    </v-alert>

    <v-alert
      v-if="success"
      type="success"
      variant="flat"
      closable
      rounded="lg"
      class="mb-4"
      @click:close="success = ''"
    >
      {{ success }}
    </v-alert>

    <!-- Header -->
    <div class="mb-6">
      <div class="text-h5 font-weight-bold">Backup & Restore</div>
      <div class="text-body-2 text-medium-emphasis mt-1">
        Your data lives in a single local file — keep copies somewhere safe
      </div>
    </div>

    <!-- Stats -->
    <v-row class="mb-2">
      <v-col cols="12" md="4">
        <v-card elevation="1" rounded="lg" class="pa-5 h-100">
          <div class="text-caption text-uppercase font-weight-bold text-medium-emphasis mb-2">
            Database Size
          </div>
          <div class="text-h4 font-weight-bold">{{ formattedDbSize }}</div>
          <div class="text-body-2 text-medium-emphasis mt-1">
            {{ totalTransactions.toLocaleString() }} transactions
          </div>
          <code v-if="dbPath" class="d-inline-block text-truncate text-caption mt-2" :title="dbPath">
            {{ dbPath }}
          </code>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card elevation="1" rounded="lg" class="pa-5 h-100">
          <div class="text-caption text-uppercase font-weight-bold text-medium-emphasis mb-2">
            Accounts
          </div>
          <div class="text-h4 font-weight-bold">{{ totalAccounts }}</div>
          <div class="text-body-2 text-medium-emphasis mt-1">
            {{ linkedAccountsCount }} linked via OFX/QFX
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card elevation="1" rounded="lg" class="pa-5 h-100">
          <div class="text-caption text-uppercase font-weight-bold text-medium-emphasis mb-2">
            Encryption
          </div>
          <div class="text-h4 font-weight-bold text-success">On</div>
          <div class="text-body-2 text-medium-emphasis mt-1">AES-256</div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Actions -->
    <v-row>
      <!-- Export -->
      <v-col cols="12" md="6">
        <v-card elevation="1" rounded="lg" class="pa-6 d-flex flex-column h-100">
          <div class="d-flex align-center ga-3 mb-3">
            <v-avatar color="primary" variant="tonal" size="34" rounded="lg">
              <v-icon size="18">mdi-export</v-icon>
            </v-avatar>
            <div class="text-subtitle-1 font-weight-bold">Export a backup</div>
          </div>

          <div class="text-body-2 text-medium-emphasis mb-5">
            Save a snapshot of your transactions, accounts and budgets to a single encrypted
            `.ledgerbak` file.
          </div>

          <div class="text-caption text-uppercase font-weight-bold text-medium-emphasis mb-2">
            Included in backup
          </div>
          <div class="d-flex flex-wrap ga-2 mb-5">
            <v-chip size="small" variant="tonal" color="primary" prepend-icon="mdi-swap-vertical">
              Transactions
            </v-chip>
            <v-chip size="small" variant="tonal" color="primary" prepend-icon="mdi-bank-outline">
              Accounts
            </v-chip>
            <v-chip size="small" variant="tonal" color="primary" prepend-icon="mdi-sitemap-outline">
              Budgets & rules
            </v-chip>
          </div>

          <div class="d-flex align-center justify-space-between mb-3">
            <span class="text-body-2">Encrypt with password</span>
            <v-switch
              v-model="encryptWithPassword"
              color="primary"
              hide-details
              density="compact"
            />
          </div>

          <v-expand-transition>
            <div v-if="encryptWithPassword" class="mb-3">
              <v-text-field
                v-model="passphrase"
                type="password"
                label="Encryption passphrase"
                placeholder="Enter passphrase (minimum 8 characters)"
                variant="outlined"
                density="compact"
                rounded="sm"
                hint="Must be at least 8 characters. Do not lose this passphrase."
                persistent-hint
              />
            </div>
          </v-expand-transition>

          <v-spacer />

          <div class="d-flex ga-3 mt-4">
            <v-btn
              color="primary"
              variant="flat"
              rounded="sm"
              prepend-icon="mdi-download"
              :loading="isExporting"
              :disabled="!isValid"
              @click="handleExport"
            >
              Export now
            </v-btn>
            <v-btn
              variant="outlined"
              rounded="sm"
              prepend-icon="mdi-folder-open-outline"
              :disabled="isExporting || !isValid"
              @click="handleExport"
            >
              Choose folder
            </v-btn>
          </div>
        </v-card>
      </v-col>

      <!-- Restore -->
      <v-col cols="12" md="6">
        <v-card elevation="1" rounded="lg" class="pa-6 d-flex flex-column h-100">
          <div class="d-flex align-center ga-3 mb-3">
            <v-avatar color="primary" variant="tonal" size="34" rounded="lg">
              <v-icon size="18">mdi-import</v-icon>
            </v-avatar>
            <div class="text-subtitle-1 font-weight-bold">Restore from a backup</div>
          </div>

          <div class="text-body-2 text-medium-emphasis mb-5">
            Replace the current data with a saved backup file. This cannot be undone.
          </div>

          <v-sheet
            color="primary-container"
            rounded="lg"
            border="solid 1px"
            class="d-flex flex-column align-center justify-center pa-8 mb-5"
            @click="handleImport"
          >
            <v-icon size="28" color="primary">mdi-upload</v-icon>
            <span class="text-body-2 text-medium-emphasis mt-2">or click to browse</span>
          </v-sheet>

          <v-spacer />

          <div class="d-flex align-center justify-space-between">
            <span class="text-body-2">Merge instead of replace (keep newer records)</span>
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
      </v-col>
    </v-row>

    <!-- Confirm Dialog -->
    <v-dialog v-model="showConfirmDialog" max-width="400" persistent>
      <v-card rounded="lg" class="pa-5">
        <v-card-title class="text-h6 font-weight-bold pb-2 px-0">Confirm Restore</v-card-title>
        <v-card-text class="text-body-2 text-medium-emphasis pb-4 px-0">
          Restoring a backup will overwrite your current database. Are you sure you want to proceed?
        </v-card-text>
        <v-card-actions class="px-0 pb-0">
          <v-spacer />
          <v-btn variant="text" rounded="sm" @click="showConfirmDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            rounded="sm"
            :loading="isImporting"
            @click="confirmImport"
          >
            Yes, overwrite
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
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
  return accountsStore.accounts.filter((a) => a.ORG || a.INTU_BID).length
})

const calculatedDataSize = computed(() => {
  // Sum of raw transaction lengths
  const txSize = transactionsStore.transactions.reduce(
    (acc, t) => acc + (t.rawTransaction ? t.rawTransaction.length : 0),
    0
  )
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
