<template>
  <v-card rounded="lg" elevation="0" border>
    <v-stepper v-model="step" :items="STEPS" rounded="xl" elevation="0">
      <!-- STEP 1: UPLOAD -->
      <template #item.1>
        <v-card-text class="pa-8">
          <v-card
            :variant="isDragging ? 'tonal' : 'outlined'"
            :color="selectedFiles.length ? 'success' : 'primary'"
            class="d-flex flex-column align-center justify-center pa-10 rounded bg-surface cursor-pointer"
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="handleDrop"
            @click="$refs.fileInput.click()"
          >
            <input
              ref="fileInput"
              type="file"
              accept=".csv"
              class="d-none"
              @change="handleFileSelect"
            />
            <v-icon size="64" class="mb-4">
              {{ selectedFiles.length ? 'mdi-file-check' : 'mdi-file-delimited-outline' }}
            </v-icon>
            <div v-if="selectedFiles.length" class="text-h6 font-weight-bold">
              {{ selectedFiles[0].name }} selected
            </div>
            <div v-else class="text-h6 font-weight-bold text-on-surface">
              Drag & Drop your CSV file here
            </div>
            <div class="text-body-2 text-medium-emphasis text-on-surface mt-2">
              or click to browse (.csv)
            </div>
          </v-card>
          <v-alert v-if="parseError" type="error" variant="flat" class="mt-4 rounded-lg">
            {{ parseError }}
          </v-alert>
        </v-card-text>
      </template>

      <!-- STEP 2: MAP COLUMNS -->
      <template #item.2>
        <v-card-text class="pa-6">
          <div class="text-subtitle-1 font-weight-medium mb-4">
            Map your CSV columns to the database fields
          </div>
          <v-divider class="mb-6" />

          <v-row>
            <v-col cols="12" sm="6">
              <v-select
                v-model="csvMapping.date"
                :items="csvHeaders"
                label="Date Column *"
                variant="solo-filled"
                rounded="lg"
                density="comfortable"
                color="primary"
                required
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model="csvMapping.payee"
                :items="csvHeaders"
                label="Payee / Description *"
                variant="solo-filled"
                rounded="lg"
                density="comfortable"
                color="primary"
                required
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model="csvMapping.amount"
                :items="csvHeaders"
                label="Amount Column *"
                variant="solo-filled"
                rounded="lg"
                density="comfortable"
                color="primary"
                required
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model="csvMapping.memo"
                :items="[{title: '-- None --', value: null}, ...csvHeaders]"
                label="Memo (Optional)"
                variant="solo-filled"
                rounded="lg"
                density="comfortable"
                color="primary"
              />
            </v-col>
          </v-row>
          
          <v-checkbox
            v-model="invertAmount"
            label="Invert Amounts (Check this if expenses show up as positive numbers)"
            color="primary"
            hide-details
            class="mt-2"
          />
        </v-card-text>
      </template>

      <!-- STEP 3: MATCH ACCOUNTS -->
      <template #item.3>
        <v-card-text class="pa-6">
          <div class="text-subtitle-1 font-weight-medium mb-4">
            Select the account to import these {{ parsedTransactions.length }} transactions into
          </div>
          <v-divider class="mb-4" />

          <v-row class="mb-4 align-center">
            <v-col cols="12" sm="5">
              <div class="text-body-2 font-weight-bold">
                {{ selectedFiles[0]?.name }}
              </div>
              <div class="text-caption text-medium-emphasis">
                CSV File • {{ parsedTransactions.length }} transactions
              </div>
            </v-col>
            <v-col cols="12" sm="2" class="text-center">
              <v-icon color="medium-emphasis">mdi-arrow-right</v-icon>
            </v-col>
            <v-col cols="12" sm="5">
              <v-select
                v-model="targetAcctId"
                :items="accountOptions"
                label="Map to Account"
                variant="solo-filled"
                rounded="lg"
                density="compact"
                hide-details
                color="primary"
              />
              <div
                v-if="!targetAcctId"
                class="text-caption text-success mt-1 d-flex align-center"
              >
                <v-icon size="14" start>mdi-plus-circle-outline</v-icon>
                Will create new account and auto-calculate starting balance
              </div>
            </v-col>
          </v-row>
        </v-card-text>
      </template>

      <!-- STEP 4: DUPLICATES -->
      <template #item.4>
        <v-card-text class="pa-6">
          <div v-if="totalExactDuplicates > 0" class="mb-6">
            <v-alert type="success" variant="flat" class="rounded-lg">
              Skipping <strong>{{ totalExactDuplicates }}</strong> exact duplicate transactions
              that were already imported.
            </v-alert>
          </div>

          <div v-if="allFuzzyDuplicates.length > 0">
            <div class="text-h6 font-weight-bold mb-2">Fuzzy Duplicates Found</div>
            <div class="text-body-2 text-medium-emphasis mb-6">
              These transactions have the exact same amount and are within 3 days of existing
              transactions. Review them carefully.
            </div>

            <v-card
              v-for="(group, i) in allFuzzyDuplicates"
              :key="i"
              variant="flat"
              class="mb-4 rounded-lg overflow-hidden border"
            >
              <v-row no-gutters class="bg-surface-variant">
                <v-col cols="6" class="pa-3 border-e">
                  <div class="text-caption text-uppercase font-weight-bold text-medium-emphasis mb-2">
                    Existing Transaction
                  </div>
                  <div class="font-weight-medium">
                    {{ group.existing.NAME || group.existing.MEMO }}
                  </div>
                  <div class="d-flex justify-space-between text-body-2 mt-1">
                    <span class="text-medium-emphasis">{{ formatDateShort(group.existing.DTPOSTED) }}</span>
                    <span class="font-weight-bold">{{ formatCurrency(group.existing.TRNAMT) }}</span>
                  </div>
                </v-col>
                <v-col cols="6" class="pa-3">
                  <div class="text-caption text-uppercase font-weight-bold text-medium-emphasis mb-2">
                    New Import (CSV)
                  </div>
                  <div class="font-weight-medium">
                    {{ group.imported.NAME || group.imported.MEMO }}
                  </div>
                  <div class="d-flex justify-space-between text-body-2 mt-1">
                    <span class="text-medium-emphasis">{{ formatDateShort(group.imported.DTPOSTED) }}</span>
                    <span class="font-weight-bold">{{ formatCurrency(group.imported.TRNAMT) }}</span>
                  </div>
                </v-col>
              </v-row>
              <v-divider />
              <div class="pa-3 bg-surface d-flex justify-end ga-3">
                <v-btn
                  color="primary"
                  size="small"
                  :variant="fuzzyResolutions[group.imported.FITID] === 'import' ? 'flat' : 'outlined'"
                  @click="fuzzyResolutions[group.imported.FITID] = 'import'"
                >
                  Import as New
                </v-btn>
                <v-btn
                  color="error"
                  size="small"
                  :variant="fuzzyResolutions[group.imported.FITID] === 'skip' ? 'flat' : 'outlined'"
                  @click="fuzzyResolutions[group.imported.FITID] = 'skip'"
                >
                  Merge (Skip)
                </v-btn>
              </div>
            </v-card>
          </div>
          <div v-else class="text-center pa-10">
            <v-icon size="48" color="success" class="mb-4">mdi-check-all</v-icon>
            <div class="text-h6 font-weight-bold">No fuzzy duplicates found!</div>
            <div class="text-body-2 text-medium-emphasis">Your database is clean.</div>
          </div>
        </v-card-text>
      </template>

      <!-- STEP 5: CLEANUP & RULES -->
      <template #item.5>
        <v-card-text class="pa-6 bg-transparent">
          <v-row>
            <v-col cols="12" md="5">
              <div class="text-h6 font-weight-bold mb-4">Rules Engine Impact</div>
              <v-card variant="flat" color="primary" class="rounded-xl pa-5 mb-6">
                <div class="d-flex align-center justify-space-between mb-4">
                  <div class="text-h4 font-weight-bold">{{ totalRulesApplied }}</div>
                  <v-avatar color="primary" size="48" variant="flat">
                    <v-icon>mdi-auto-fix</v-icon>
                  </v-avatar>
                </div>
                <div class="text-body-1 font-weight-medium">Transactions Auto-Categorized</div>
                <v-divider class="my-4" />
                <div class="d-flex flex-wrap gap-2">
                  <v-chip v-if="totalBills > 0" color="warning" size="small" variant="flat">
                    <v-icon start>mdi-receipt-text</v-icon> {{ totalBills }} Bills
                  </v-chip>
                  <v-chip v-if="totalSubs > 0" color="info" size="small" variant="flat">
                    <v-icon start>mdi-calendar-sync</v-icon> {{ totalSubs }} Subs
                  </v-chip>
                  <v-chip v-if="totalDebt > 0" color="error" size="small" variant="flat">
                    <v-icon start>mdi-credit-card-fast</v-icon> {{ totalDebt }} Debt
                  </v-chip>
                </div>
              </v-card>
            </v-col>

            <v-col cols="12" md="7">
              <div class="text-h6 font-weight-bold mb-4">Bulk Clean Up</div>
              <div v-if="Object.keys(groupedUncategorized).length === 0" class="text-center pa-8 bg-surface rounded-xl border">
                <v-icon size="48" color="success" class="mb-4">mdi-party-popper</v-icon>
                <div class="text-h6 font-weight-bold">Everything is categorized!</div>
                <div class="text-body-2 text-medium-emphasis">No uncategorized transactions remaining.</div>
              </div>
              <div v-else>
                <div v-if="!showBulkCleanupList" class="text-center pa-8 bg-surface rounded-xl border">
                  <v-icon size="48" color="primary" class="mb-4">mdi-broom</v-icon>
                  <div class="text-h6 font-weight-bold">{{ Object.keys(groupedUncategorized).length }} groups need categories</div>
                  <div class="text-body-2 text-medium-emphasis mb-4">Adding categories is optional, but helps keep your budget organized.</div>
                  <v-btn color="primary" variant="flat" @click="showBulkCleanupList = true">Review Uncategorized</v-btn>
                </div>
                <template v-else>
                  <v-card v-for="(group, name) in groupedUncategorized" :key="name" variant="flat" class="rounded-lg mb-3 border bg-surface">
                    <div class="pa-4">
                      <div class="d-flex align-center justify-space-between mb-2">
                        <div class="font-weight-bold">{{ name }}</div>
                        <v-chip size="small" color="surface-variant" variant="flat">{{ group.count }} txns</v-chip>
                      </div>
                      <div v-if="!group.showCategory" class="mt-3">
                        <v-btn variant="text" size="small" color="primary" @click="group.showCategory = true">+ Assign Category</v-btn>
                      </div>
                      <div v-else class="d-flex align-center gap-3 mt-3">
                        <v-select
                          v-model="group.categoryId"
                          :items="categoryOptions"
                          item-title="title"
                          item-value="value"
                          label="Assign Category"
                          variant="solo-filled"
                          rounded="lg"
                          density="compact"
                          hide-details
                          class="flex-1"
                          color="primary"
                        />
                        <template v-if="group.categoryId">
                          <v-checkbox v-model="group.retroactive" label="Retroactive" hide-details density="compact" color="primary" class="text-caption" />
                          <v-btn color="primary" variant="flat" size="small" :loading="group.loading" @click="applyBulkRule(name, group)">Apply</v-btn>
                        </template>
                      </div>
                    </div>
                  </v-card>
                </template>
              </div>
            </v-col>
          </v-row>
        </v-card-text>
      </template>

      <!-- STEP 6: FINALIZE -->
      <template #item.6>
        <v-card-text class="pa-6">
          <div class="text-center mb-8">
            <div class="text-h5 font-weight-bold">Ready to Import</div>
            <div class="text-body-2 text-medium-emphasis">Review your final account balance before saving.</div>
          </div>

          <v-row justify="center">
            <v-col cols="12" md="8">
              <v-card v-for="(p, i) in previewResults" :key="i" variant="flat" class="rounded-xl pa-5 mb-4 border bg-surface">
                <div class="d-flex align-center justify-space-between mb-4">
                  <div class="text-h6 font-weight-bold">{{ accountLabel(p.accountId) }}</div>
                  <v-chip color="primary" variant="flat">Importing {{ p.rulesApplied.length + p.uncategorized.length }} txns</v-chip>
                </div>

                <div class="bg-surface-variant rounded-lg pa-4">
                  <div class="d-flex justify-space-between align-center mb-4">
                    <span class="text-body-2 text-medium-emphasis">App Balance (After Import):</span>
                    <span class="font-weight-bold text-h6">{{ formatCurrency(p.dbBalance + sumImporting(p)) }}</span>
                  </div>

                  <v-alert type="info" variant="flat" class="rounded-lg mb-0">
                    <div class="mb-2">CSV files do not provide a verified ledger balance.</div>
                    <div v-if="!p.adjustBalance" class="d-flex align-center gap-2 mt-2">
                      <v-text-field
                        v-model="p.targetBalance"
                        label="Manually Fix Starting Balance"
                        density="compact"
                        variant="solo-filled"
                        rounded="lg"
                        hide-details
                        prefix="$"
                        type="number"
                      />
                      <v-btn color="primary" variant="flat" :disabled="!p.targetBalance" @click="p.adjustBalance = true">Adjust</v-btn>
                    </div>
                    <div v-else class="text-success font-weight-bold d-flex align-center">
                      <v-icon start>mdi-check</v-icon> Starting balance will be adjusted to ${{ p.targetBalance }}.
                      <v-btn variant="text" size="small" class="ml-2" @click="p.adjustBalance = false">Undo</v-btn>
                    </div>
                  </v-alert>
                </div>
              </v-card>
            </v-col>
          </v-row>
        </v-card-text>
      </template>

      <!-- NAVIGATION -->
      <template #actions>
        <v-card-actions class="pa-6 pt-0">
          <v-btn v-if="step > 1" variant="text" size="large" @click="step--">Back</v-btn>
          <v-spacer />

          <v-btn
            v-if="step === 1"
            color="primary"
            variant="flat"
            size="large"
            rounded="lg"
            :disabled="!selectedFiles.length"
            :loading="parsing"
            @click="doParseHeaders"
          >
            Map Columns <v-icon end>mdi-arrow-right</v-icon>
          </v-btn>
          
          <v-btn
            v-else-if="step === 2"
            color="primary"
            variant="flat"
            size="large"
            rounded="lg"
            :disabled="!csvMapping.date || !csvMapping.amount || !csvMapping.payee"
            @click="processMappedTransactions"
          >
            Match Account <v-icon end>mdi-arrow-right</v-icon>
          </v-btn>

          <v-btn
            v-else-if="step === 3"
            color="primary"
            variant="flat"
            size="large"
            rounded="lg"
            :loading="fetchingPreview"
            @click="goToDuplicates"
          >
            Check Duplicates <v-icon end>mdi-arrow-right</v-icon>
          </v-btn>

          <v-btn
            v-else-if="step === 4"
            color="primary"
            variant="flat"
            size="large"
            rounded="lg"
            :loading="fetchingPreview"
            @click="goToRules"
          >
            Review Rules & Cleanup <v-icon end>mdi-arrow-right</v-icon>
          </v-btn>

          <v-btn
            v-else-if="step === 5"
            color="primary"
            variant="flat"
            size="large"
            rounded="lg"
            @click="step = 6"
          >
            Next: Finalize <v-icon end>mdi-arrow-right</v-icon>
          </v-btn>

          <v-btn
            v-else-if="step === 6"
            color="success"
            variant="flat"
            size="large"
            rounded="lg"
            :loading="importing"
            @click="doImport"
          >
            Complete Import <v-icon end>mdi-check</v-icon>
          </v-btn>
        </v-card-actions>
      </template>
    </v-stepper>
  </v-card>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import Papa from 'papaparse'
import { useUserAccountsStore } from '../stores/userAccounts'
import { useUserSettingsStore } from '../stores/userSettings'
import { useUserRulesStore } from '../stores/userRules'
import { useUserCategoriesStore } from '../stores/userCategories'

const ipc = window.electron.ipcRenderer
const accountsStore = useUserAccountsStore()
const settingsStore = useUserSettingsStore()
const rulesStore = useUserRulesStore()
const categoriesStore = useUserCategoriesStore()
const { formatCurrency } = settingsStore
const emit = defineEmits(['navigate'])

const STEPS = [
  { title: 'Upload', value: 1 },
  { title: 'Map Cols', value: 2 },
  { title: 'Account', value: 3 },
  { title: 'Duplicates', value: 4 },
  { title: 'Cleanup', value: 5 },
  { title: 'Finalize', value: 6 }
]
const step = ref(1)

const isDragging = ref(false)
const selectedFiles = ref([])
const parseError = ref(null)
const parsing = ref(false)
const fetchingPreview = ref(false)
const importing = ref(false)
const showBulkCleanupList = ref(false)
const fileInput = ref(null)

// CSV specifics
const csvHeaders = ref([])
const rawCsvData = ref([])
const parsedTransactions = ref([])
const csvMapping = ref({ date: null, payee: null, amount: null, memo: null })
const invertAmount = ref(false)

const targetAcctId = ref(null)
const previewResults = ref([])
const fuzzyResolutions = ref({})
const groupedUncategorized = ref({})

onMounted(async () => {
  await accountsStore.fetchAccounts()
  await rulesStore.fetchRules()
  await categoriesStore.fetchCategories()
})

const accountOptions = computed(() => [
  { title: '-- Create New Account --', value: null },
  ...accountsStore.accounts.map((a) => ({
    title: `${a.displayName || a.ACCTTYPE} (${a.ORG || 'Unknown'})`,
    value: a.ACCTID
  }))
])

function handleDrop(e) {
  isDragging.value = false
  const dropped = Array.from(e.dataTransfer.files).filter(f => f.name.toLowerCase().endsWith('.csv'))
  if (dropped.length) {
    selectedFiles.value = [dropped[0]] // Only handle 1 CSV at a time for simplicity
    parseError.value = null
  }
}

function handleFileSelect(e) {
  const files = Array.from(e.target.files)
  if (files.length) {
    selectedFiles.value = [files[0]]
    parseError.value = null
  }
}

function doParseHeaders() {
  if (!selectedFiles.value.length) return
  parsing.value = true
  parseError.value = null
  
  const file = selectedFiles.value[0]
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      parsing.value = false
      if (results.errors && results.errors.length > 0 && results.errors[0].type !== 'Delimiter') {
         parseError.value = 'Failed to parse CSV. Make sure it is a valid CSV file.'
         return
      }
      csvHeaders.value = results.meta.fields || []
      rawCsvData.value = results.data
      
      // Auto-guess columns
      csvMapping.value.date = csvHeaders.value.find(h => /date/i.test(h)) || null
      csvMapping.value.payee = csvHeaders.value.find(h => /description|payee|name|title/i.test(h)) || null
      csvMapping.value.amount = csvHeaders.value.find(h => /amount|value/i.test(h)) || null
      csvMapping.value.memo = csvHeaders.value.find(h => /memo|notes/i.test(h)) || null

      step.value = 2
    },
    error: (err) => {
      parsing.value = false
      parseError.value = err.message
    }
  })
}

function processMappedTransactions() {
  const txns = []
  rawCsvData.value.forEach((row, i) => {
    const dStr = row[csvMapping.value.date] || ''
    const pStr = row[csvMapping.value.payee] || ''
    const aStr = row[csvMapping.value.amount] || '0'
    const mStr = csvMapping.value.memo ? (row[csvMapping.value.memo] || '') : ''

    // Parse date to YYYYMMDD
    let dtposted = ''
    try {
      const d = new Date(dStr)
      if (!isNaN(d.getTime())) {
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        dtposted = `${y}${m}${day}120000.000[-5:EST]`
      }
    } catch(e) {}
    
    // Fallback if parsing fails
    if (!dtposted) dtposted = '20000101120000.000[-5:EST]'

    let amt = parseFloat(aStr.replace(/[^0-9.-]+/g, ''))
    if (isNaN(amt)) amt = 0
    if (invertAmount.value) amt = -amt

    const fitid = `CSV-${dtposted}-${amt}-${pStr}-${i}`
    
    txns.push({
      FITID: fitid,
      DTPOSTED: dtposted,
      TRNAMT: amt,
      NAME: pStr,
      MEMO: mStr,
      TRNTYPE: amt >= 0 ? 'CREDIT' : 'DEBIT'
    })
  })

  parsedTransactions.value = txns
  step.value = 3
}

async function goToDuplicates() {
  fetchingPreview.value = true
  try {
    const skips = Object.keys(fuzzyResolutions.value).filter(id => fuzzyResolutions.value[id] === 'skip')

    const batchData = [{
      ofxText: '', // not an OFX
      parsedTransactions: parsedTransactions.value,
      parsedAccountData: {
         ACCTID: targetAcctId.value || `csv-${Date.now()}`,
         ACCTTYPE: 'Checking',
         ORG: 'CSV Import'
      },
      targetAcctId: targetAcctId.value
    }]

    const res = await ipc.invoke('ofx:previewImportBatch', batchData, skips)
    if (res.success) {
      previewResults.value = res.data
      for (const pr of previewResults.value) {
        pr.adjustBalance = false
        pr.targetBalance = pr.ledgerBalance?.BALAMT || ''
        if (!pr.dbBalance && pr.targetBalance) {
          pr.adjustBalance = true
        }
        for (const fd of pr.fuzzyDuplicates) {
          if (!fuzzyResolutions.value[fd.imported.FITID]) {
            fuzzyResolutions.value[fd.imported.FITID] = 'import'
          }
        }
      }
      step.value = 4
    } else {
      throw new Error(res.error)
    }
  } catch (err) {
    parseError.value = err.message
    step.value = 3
  } finally {
    fetchingPreview.value = false
  }
}

const allFuzzyDuplicates = computed(() => previewResults.value.flatMap((p) => p.fuzzyDuplicates))
const totalExactDuplicates = computed(() => previewResults.value.reduce((s, p) => s + p.exactDuplicates.length, 0))

async function goToRules() {
  await goToDuplicates()
  buildGroupedUncategorized()
  step.value = 5
}

const totalRulesApplied = computed(() => previewResults.value.reduce((s, p) => s + p.rulesApplied.length, 0))
const totalBills = computed(() => previewResults.value.reduce((s, p) => s + p.rulesApplied.filter(t => t.patch?.bill).length, 0))
const totalSubs = computed(() => previewResults.value.reduce((s, p) => s + p.rulesApplied.filter(t => t.patch?.subscription).length, 0))
const totalDebt = computed(() => previewResults.value.reduce((s, p) => s + p.rulesApplied.filter(t => t.patch?.linkAccount).length, 0))

function buildGroupedUncategorized() {
  const groups = {}
  for (const pr of previewResults.value) {
    for (const u of pr.uncategorized) {
      const n = u.cleanName || u.NAME
      if (!groups[n]) {
        groups[n] = { count: 0, sampleAmt: u.TRNAMT, categoryId: null, retroactive: false, loading: false, showCategory: false }
      }
      groups[n].count++
    }
  }
  groupedUncategorized.value = groups
}

const categoryOptions = computed(() => categoriesStore.categories.map(cat => ({ title: cat.name, value: cat.id })))

async function applyBulkRule(name, groupState) {
  groupState.loading = true
  try {
    const rule = {
      name: `Auto: ${name}`,
      criteria: [{ field: 'NAME', operator: 'contains', value: name }],
      actions: [{ type: 'category', value: groupState.categoryId }]
    }
    const res = await ipc.invoke('rules:create', rule, groupState.retroactive)
    if (!res.success) throw new Error(res.error)
    await rulesStore.fetchRules()
    await goToDuplicates()
    buildGroupedUncategorized()
  } catch (err) {
    console.error(err)
  } finally {
    groupState.loading = false
  }
}

function sumImporting(p) {
  const sumRules = p.rulesApplied.reduce((s, t) => s + Number(t.transaction.TRNAMT), 0)
  const sumUncat = p.uncategorized.reduce((s, t) => s + Number(t.TRNAMT), 0)
  return sumRules + sumUncat
}

function accountLabel(id) {
  const a = accountsStore.accounts.find((x) => x.ACCTID === id)
  if (!a) return 'New Account'
  return `${a.displayName || a.ACCTTYPE} (${a.ORG || 'Unknown'})`
}

function formatDateShort(dt) {
  if (!dt || dt.length < 8) return ''
  return new Date(dt.substring(0, 4), parseInt(dt.substring(4, 6)) - 1, dt.substring(6, 8)).toLocaleDateString()
}

async function doImport() {
  importing.value = true
  try {
    const p = previewResults.value[0]
    const batchData = [{
      ofxText: '',
      parsedTransactions: parsedTransactions.value,
      parsedAccountData: { ACCTID: p.accountId || targetAcctId.value || `csv-${Date.now()}`, ACCTTYPE: 'Checking', ORG: 'CSV Import' },
      targetAcctId: targetAcctId.value,
      targetBalance: p?.adjustBalance ? p.targetBalance : null
    }]

    const skips = Object.keys(fuzzyResolutions.value).filter(id => fuzzyResolutions.value[id] === 'skip')

    const res = await ipc.invoke('ofx:importBatch', batchData, skips)
    if (res.success) {
      await accountsStore.fetchAccounts()
      emit('navigate', 'Transactions')
    } else {
      throw new Error(res.error)
    }
  } catch (err) {
    console.error(err)
    alert(err.message)
  } finally {
    importing.value = false
  }
}
</script>
