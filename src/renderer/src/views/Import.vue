<template>
  <v-container fluid class="pa-6" style="max-width: 900px; margin: 0 auto">
    <!-- Header -->
    <div class="mb-5">
      <div class="text-h5 font-weight-bold">Import bank data</div>
      <div class="text-body-2 text-medium-emphasis mt-1">
        OFX / QFX files — parsed on your machine, nothing leaves it
      </div>
    </div>

    <!-- Stepper -->
    <v-stepper v-model="step" :items="STEPS" rounded="xl" elevation="0" bg-color="transparent">
      <!-- STEP 1: UPLOAD -->
      <template #item.1>
        <v-card-text class="pa-8">
          <v-card
            variant="outlined"
            class="upload-zone d-flex flex-column align-center justify-center pa-10 rounded-xl bg-surface"
            :class="{ 'is-dragging': isDragging, 'has-files': selectedFiles.length }"
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="handleDrop"
            @click="$refs.fileInput.click()"
          >
            <input
              ref="fileInput"
              type="file"
              multiple
              accept=".ofx,.qfx"
              class="d-none"
              @change="handleFileSelect"
            />
            <v-icon size="64" :color="selectedFiles.length ? 'success' : 'primary'" class="mb-4">
              {{ selectedFiles.length ? 'mdi-file-check' : 'mdi-cloud-upload-outline' }}
            </v-icon>
            <div v-if="selectedFiles.length" class="text-h6 font-weight-bold text-success">
              {{ selectedFiles.length }} file(s) selected
            </div>
            <div v-else class="text-h6 font-weight-bold">Drag & Drop your bank files here</div>
            <div class="text-body-2 text-medium-emphasis mt-2">or click to browse (.ofx, .qfx)</div>

            <div v-if="selectedFiles.length" class="mt-4 w-100" style="max-width: 400px">
              <v-chip
                v-for="f in selectedFiles"
                :key="f.name"
                class="ma-1"
                size="small"
                closable
                @click:close="removeFile(f)"
              >
                {{ f.name }}
              </v-chip>
            </div>
          </v-card>
          <v-alert v-if="parseError" type="error" variant="tonal" class="mt-4 rounded-lg">
            {{ parseError }}
          </v-alert>
        </v-card-text>
      </template>

      <!-- STEP 2: MATCH ACCOUNTS -->
      <template #item.2>
        <v-card-text class="pa-6">
          <div class="text-subtitle-1 font-weight-medium mb-4">
            We found {{ mappings.length }} account(s) — map them to your database
          </div>
          <v-divider class="mb-4" />

          <v-row v-for="(m, i) in mappings" :key="i" class="mb-4 align-center">
            <v-col cols="12" sm="5">
              <div class="text-body-2 font-weight-bold">
                {{ m.parsedAccount.ORG || 'Unknown Bank' }}
              </div>
              <div class="text-caption text-medium-emphasis">
                {{ m.parsedAccount.ACCTID }} • {{ m.txCount }} transactions
              </div>
            </v-col>
            <v-col cols="12" sm="2" class="text-center">
              <v-icon color="medium-emphasis">mdi-arrow-right</v-icon>
            </v-col>
            <v-col cols="12" sm="5">
              <v-select
                v-model="m.targetAcctId"
                :items="accountOptions"
                label="Map to Account"
                variant="outlined"
                density="compact"
                hide-details
                color="primary"
              />
              <div v-if="!m.targetAcctId" class="text-caption text-success mt-1 d-flex align-center">
                <v-icon size="14" start>mdi-plus-circle-outline</v-icon>
                Will create new account and auto-calculate starting balance
              </div>
            </v-col>
          </v-row>
        </v-card-text>
      </template>

      <!-- STEP 3: DUPLICATES -->
      <template #item.3>
        <v-card-text class="pa-6">
          <div v-if="totalExactDuplicates > 0" class="mb-6">
            <v-alert type="success" variant="tonal" class="rounded-lg">
              Skipping <strong>{{ totalExactDuplicates }}</strong> exact duplicate transactions that were already imported.
            </v-alert>
          </div>

          <div v-if="allFuzzyDuplicates.length > 0">
            <div class="text-h6 font-weight-bold mb-2">Fuzzy Duplicates Found</div>
            <div class="text-body-2 text-medium-emphasis mb-6">
              These transactions have the exact same amount and are within 3 days of existing transactions. Bank IDs often change from Pending to Posted. Review them carefully.
            </div>

            <v-card
              v-for="(group, i) in allFuzzyDuplicates"
              :key="i"
              variant="outlined"
              class="mb-4 rounded-lg overflow-hidden border"
            >
              <v-row no-gutters class="bg-surface-variant">
                <v-col cols="6" class="pa-3 border-e">
                  <div class="text-caption text-uppercase font-weight-bold text-medium-emphasis mb-2">Existing Transaction</div>
                  <div class="font-weight-medium">{{ group.existing.NAME || group.existing.MEMO }}</div>
                  <div class="d-flex justify-space-between text-body-2 mt-1">
                    <span class="text-medium-emphasis">{{ formatDateShort(group.existing.DTPOSTED) }}</span>
                    <span class="font-weight-bold">{{ formatCurrency(group.existing.TRNAMT) }}</span>
                  </div>
                </v-col>
                <v-col cols="6" class="pa-3">
                  <div class="text-caption text-uppercase font-weight-bold text-medium-emphasis mb-2">New Import</div>
                  <div class="font-weight-medium">{{ group.imported.NAME || group.imported.MEMO }}</div>
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
            <div class="text-body-2 text-medium-emphasis">Your database is sparkling clean.</div>
          </div>
        </v-card-text>
      </template>

      <!-- STEP 4: CLEANUP & RULES -->
      <template #item.4>
        <v-card-text class="pa-6 bg-transparent">
          <v-row>
            <!-- Rules Impact Summary -->
            <v-col cols="12" md="5">
              <div class="text-h6 font-weight-bold mb-4">Rules Engine Impact</div>

              <v-card variant="tonal" color="primary" class="rounded-xl pa-5 mb-6">
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

            <!-- Bulk Cleanup Wizard -->
            <v-col cols="12" md="7">
              <div class="text-h6 font-weight-bold mb-4">Bulk Clean Up</div>
              
              <div v-if="Object.keys(groupedUncategorized).length === 0" class="text-center pa-8 bg-surface rounded-xl border">
                <v-icon size="48" color="success" class="mb-4">mdi-party-popper</v-icon>
                <div class="text-h6 font-weight-bold">Everything is categorized!</div>
                <div class="text-body-2 text-medium-emphasis">No uncategorized transactions remaining.</div>
              </div>

              <div v-else>
                <v-card
                  v-for="(group, name) in groupedUncategorized"
                  :key="name"
                  variant="outlined"
                  class="rounded-lg mb-3 border bg-surface"
                >
                  <div class="pa-4">
                    <div class="d-flex align-center justify-space-between mb-2">
                      <div class="font-weight-bold">{{ name }}</div>
                      <v-chip size="small" color="surface-variant" variant="flat">
                        {{ group.count }} txns
                      </v-chip>
                    </div>
                    
                    <div class="d-flex align-center gap-3 mt-3">
                      <v-select
                        v-model="group.categoryId"
                        :items="categoryOptions"
                        item-title="title"
                        item-value="value"
                        label="Assign Category"
                        variant="outlined"
                        density="compact"
                        hide-details
                        class="rounded-lg flex-1"
                        color="primary"
                      />
                      <template v-if="group.categoryId">
                        <v-checkbox
                          v-model="group.retroactive"
                          label="Retroactive"
                          hide-details
                          density="compact"
                          color="primary"
                          class="text-caption"
                        />
                        <v-btn
                          color="primary"
                          variant="flat"
                          size="small"
                          :loading="group.loading"
                          @click="applyBulkRule(name, group)"
                        >
                          Apply
                        </v-btn>
                      </template>
                    </div>
                  </div>
                </v-card>
              </div>
            </v-col>
          </v-row>
        </v-card-text>
      </template>

      <!-- STEP 5: FINALIZE -->
      <template #item.5>
        <v-card-text class="pa-6">
          <div class="text-center mb-8">
            <div class="text-h5 font-weight-bold">Ready to Import</div>
            <div class="text-body-2 text-medium-emphasis">Review your final account balances before saving.</div>
          </div>

          <v-row justify="center">
            <v-col cols="12" md="8">
              <v-card v-for="(p, i) in previewResults" :key="i" variant="outlined" class="rounded-xl pa-5 mb-4 border bg-surface">
                <div class="d-flex align-center justify-space-between mb-4">
                  <div class="text-h6 font-weight-bold">{{ accountLabel(p.accountId) }}</div>
                  <v-chip color="primary" variant="flat">Importing {{ p.rulesApplied.length + p.uncategorized.length }} txns</v-chip>
                </div>
                
                <div v-if="p.ledgerBalance && p.ledgerBalance.BALAMT" class="bg-surface-variant rounded-lg pa-4">
                  <div class="d-flex justify-space-between align-center mb-2">
                    <span class="text-body-2 text-medium-emphasis">App Balance (After Import):</span>
                    <span class="font-weight-bold text-h6">{{ formatCurrency(p.dbBalance + sumImporting(p)) }}</span>
                  </div>
                  <div class="d-flex justify-space-between align-center mb-4">
                    <span class="text-body-2 text-medium-emphasis">
                      Bank Balance (As of {{ formatDateShort(p.ledgerBalance.DTASOF) }}):
                    </span>
                    <span class="font-weight-bold text-h6">{{ formatCurrency(p.ledgerBalance.BALAMT) }}</span>
                  </div>
                  
                  <v-alert v-if="Math.abs((p.dbBalance + sumImporting(p)) - Number(p.ledgerBalance.BALAMT)) < 0.01" type="success" variant="flat" class="font-weight-bold rounded-lg text-center">
                    <v-icon start>mdi-check-circle</v-icon> Reconciled Perfectly!
                  </v-alert>
                  <v-alert v-else type="warning" variant="tonal" class="rounded-lg">
                    Discrepancy of <strong>{{ formatCurrency(Math.abs((p.dbBalance + sumImporting(p)) - Number(p.ledgerBalance.BALAMT))) }}</strong>. You may be missing historical transactions.
                  </v-alert>
                </div>
                <div v-else class="text-center pa-6 bg-surface-variant rounded-lg">
                  <v-icon size="32" color="medium-emphasis" class="mb-2">mdi-bank-off</v-icon>
                  <div class="text-body-2 text-medium-emphasis">
                    Bank did not provide a ledger balance for this account, so we cannot verify reconciliation.
                  </div>
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
          
          <v-btn v-if="step === 1" color="primary" variant="flat" size="large" rounded="lg" :disabled="!selectedFiles.length" :loading="parsing" @click="doParse">
            Match Accounts <v-icon end>mdi-arrow-right</v-icon>
          </v-btn>

          <v-btn v-else-if="step === 2" color="primary" variant="flat" size="large" rounded="lg" :loading="fetchingPreview" @click="goToDuplicates">
            Check Duplicates <v-icon end>mdi-arrow-right</v-icon>
          </v-btn>

          <v-btn v-else-if="step === 3" color="primary" variant="flat" size="large" rounded="lg" :loading="fetchingPreview" @click="goToRules">
            Review Rules & Cleanup <v-icon end>mdi-arrow-right</v-icon>
          </v-btn>
          
          <v-btn v-else-if="step === 4" color="primary" variant="flat" size="large" rounded="lg" @click="step = 5">
            Next: Finalize <v-icon end>mdi-arrow-right</v-icon>
          </v-btn>
          
          <v-btn v-else-if="step === 5" color="success" variant="flat" size="large" rounded="lg" :loading="importing" @click="doImport">
            Complete Import <v-icon end>mdi-check</v-icon>
          </v-btn>
        </v-card-actions>
      </template>
    </v-stepper>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
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
  { title: 'Match', value: 2 },
  { title: 'Duplicates', value: 3 },
  { title: 'Cleanup', value: 4 },
  { title: 'Finalize', value: 5 }
]
const step = ref(1)

const isDragging = ref(false)
const selectedFiles = ref([])
const parseError = ref(null)
const parsing = ref(false)
const fetchingPreview = ref(false)
const importing = ref(false)

const fileInput = ref(null)

// Pipeline state
const rawOfxData = ref({}) // mapping of filename -> raw text
const mappings = ref([]) // array of { filename, parsedAccount, txCount, targetAcctId }
const previewResults = ref([]) // from preview API

const fuzzyResolutions = ref({}) // FITID -> 'import' | 'skip'
const groupedUncategorized = ref({}) // { cleanName: { count, sampleAmt, categoryId, retroactive, loading } }

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
  const dropped = Array.from(e.dataTransfer.files).filter((f) => {
    const ext = f.name.split('.').pop().toLowerCase()
    return ext === 'ofx' || ext === 'qfx'
  })
  if (dropped.length) {
    selectedFiles.value = [...selectedFiles.value, ...dropped]
    parseError.value = null
  }
}

function handleFileSelect(e) {
  const files = Array.from(e.target.files)
  if (files.length) {
    selectedFiles.value = [...selectedFiles.value, ...files]
    parseError.value = null
  }
}

function removeFile(file) {
  selectedFiles.value = selectedFiles.value.filter((f) => f !== file)
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = (e) => reject(e)
    reader.readAsText(file)
  })
}

async function doParse() {
  parsing.value = true
  parseError.value = null
  try {
    const newMappings = []
    for (const f of selectedFiles.value) {
      const text = await readFileAsText(f)
      rawOfxData.value[f.name] = text

      const res = await ipc.invoke('ofx:parseFile', text)
      if (!res.success) throw new Error(res.error || 'Failed to parse OFX file.')

      const acctData = res.data.account
      
      let matchedTarget = null
      if (acctData && acctData.ACCTID) {
        const last4 = acctData.ACCTID.replace(/[^a-zA-Z0-9]/g, '')
        matchedTarget = accountsStore.accounts.find(
          (a) => a.ACCTID && a.ACCTID.endsWith(last4)
        )?.ACCTID || null
      }

      newMappings.push({
        filename: f.name,
        parsedAccount: acctData || { ORG: 'Unknown', ACCTID: 'Unknown' },
        txCount: res.data.txCount || 0,
        targetAcctId: matchedTarget
      })
    }
    mappings.value = newMappings
    step.value = 2
  } catch (err) {
    parseError.value = 'Failed to read files. Ensure they are valid OFX/QFX.'
    console.error(err)
  } finally {
    parsing.value = false
  }
}

async function goToDuplicates() {
  fetchingPreview.value = true
  try {
    const batchData = mappings.value.map(m => ({
      ofxText: rawOfxData.value[m.filename],
      targetAcctId: m.targetAcctId
    }))
    
    // We pass any current fuzzy skip choices to the preview API
    const skips = Object.keys(fuzzyResolutions.value).filter(id => fuzzyResolutions.value[id] === 'skip')
    
    const res = await ipc.invoke('ofx:previewImportBatch', batchData, skips)
    if (res.success) {
      previewResults.value = res.data
      
      // Initialize fuzzy resolutions state
      for (const pr of previewResults.value) {
        for (const fd of pr.fuzzyDuplicates) {
          if (!fuzzyResolutions.value[fd.imported.FITID]) {
            fuzzyResolutions.value[fd.imported.FITID] = 'import' // Default to import, user can switch to skip
          }
        }
      }
      
      step.value = 3
    } else {
      throw new Error(res.error)
    }
  } catch (err) {
    parseError.value = err.message
    step.value = 1
  } finally {
    fetchingPreview.value = false
  }
}

const allFuzzyDuplicates = computed(() => {
  return previewResults.value.flatMap(p => p.fuzzyDuplicates)
})

const totalExactDuplicates = computed(() => {
  return previewResults.value.reduce((s, p) => s + p.exactDuplicates.length, 0)
})

async function goToRules() {
  // We need to re-fetch preview because fuzzy resolutions might have changed
  await goToDuplicates() 
  buildGroupedUncategorized()
  step.value = 4
}

const totalRulesApplied = computed(() => {
  return previewResults.value.reduce((s, p) => s + p.rulesApplied.length, 0)
})

const totalBills = computed(() => {
  return previewResults.value.reduce((s, p) => {
    return s + p.rulesApplied.filter(t => t.patch && t.patch.bill).length
  }, 0)
})

const totalSubs = computed(() => {
  return previewResults.value.reduce((s, p) => {
    return s + p.rulesApplied.filter(t => t.patch && t.patch.subscription).length
  }, 0)
})

const totalDebt = computed(() => {
  return previewResults.value.reduce((s, p) => {
    return s + p.rulesApplied.filter(t => t.patch && t.patch.linkAccount).length
  }, 0)
})

function buildGroupedUncategorized() {
  const groups = {}
  for (const pr of previewResults.value) {
    for (const u of pr.uncategorized) {
      const n = u.cleanName || u.NAME
      if (!groups[n]) groups[n] = { count: 0, sampleAmt: u.TRNAMT, categoryId: null, retroactive: false, loading: false }
      groups[n].count++
    }
  }
  groupedUncategorized.value = groups
}

// We need a flattened category list for the dropdown
const categoryOptions = computed(() => {
  return categoriesStore.categories.map(cat => ({
    title: cat.name,
    value: cat.id
  }))
})

async function applyBulkRule(name, groupState) {
  groupState.loading = true
  try {
    const rule = {
      name: `Auto: ${name}`,
      criteria: [
        { field: 'NAME', operator: 'contains', value: name }
      ],
      actions: [
        { type: 'category', value: groupState.categoryId }
      ]
    }
    
    // Create rule in DB
    const res = await ipc.invoke('rules:create', rule, groupState.retroactive)
    if (!res.success) throw new Error(res.error)
    
    // Refresh memory pipeline
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
  return new Date(
    dt.substring(0, 4),
    parseInt(dt.substring(4, 6)) - 1,
    dt.substring(6, 8)
  ).toLocaleDateString()
}

async function doImport() {
  importing.value = true
  try {
    const batchData = mappings.value.map(m => ({
      ofxText: rawOfxData.value[m.filename],
      targetAcctId: m.targetAcctId
    }))
    
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

<style scoped>
.upload-zone {
  border: 2px dashed rgb(var(--v-theme-primary)) !important;
  transition: all 0.2s ease;
  cursor: pointer;
}
.upload-zone:hover, .upload-zone.is-dragging {
  background-color: rgba(var(--v-theme-primary), 0.08);
}
.upload-zone.has-files {
  border-style: solid;
}
</style>
