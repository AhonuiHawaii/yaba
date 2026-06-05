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

          <div v-for="header in csvHeaders" :key="header" class="d-flex align-center mb-3">
            <div class="text-subtitle-1 font-weight-bold" style="width: 40%">
              {{ header }}
            </div>
            <v-icon color="medium-emphasis" class="mx-4">mdi-arrow-right</v-icon>
            <v-select
              v-model="headerMapping[header]"
              :items="targetOptions"
              label="Map to Database Field"
              variant="solo-filled"
              rounded="lg"
              density="compact"
              hide-details
              color="primary"
              style="width: 50%"
            />
          </div>

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
            Select the account to import these transactions into
          </div>
          <v-divider class="mb-4" />

          <v-row class="mb-4 align-center">
            <v-col cols="12" sm="5">
              <div class="text-body-2 font-weight-bold">
                {{ selectedFiles[0]?.name }}
              </div>
              <div class="text-caption text-medium-emphasis">
                CSV File • {{ rowCount }} rows detected
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
              <div v-if="!targetAcctId" class="text-caption text-success mt-1 d-flex align-center">
                <v-icon size="14" start>mdi-plus-circle-outline</v-icon>
                Will create new account
              </div>
            </v-col>
          </v-row>
        </v-card-text>
      </template>

      <!-- STEP 4: FINALIZE -->
      <template #item.4>
        <v-card-text class="pa-6">
          <div class="text-center mb-8">
            <div class="text-h5 font-weight-bold">Ready to Import</div>
            <div class="text-body-2 text-medium-emphasis">
              Review your final account balance before saving.
            </div>
          </div>

          <v-row justify="center">
            <v-col cols="12" md="8">
              <v-card variant="flat" class="rounded-xl pa-5 mb-4 border bg-surface">
                <div class="d-flex align-center justify-space-between mb-4">
                  <div class="text-h6 font-weight-bold">{{ accountLabel(targetAcctId) }}</div>
                  <v-chip color="primary" variant="flat">Importing {{ rowCount }} rows</v-chip>
                </div>

                <div class="bg-surface-variant rounded-lg pa-4">
                  <div class="d-flex justify-space-between align-center mb-4">
                    <span class="text-body-2 text-medium-emphasis">Current App Balance:</span>
                    <span class="font-weight-bold text-h6">{{
                      formatCurrency(currentDbBalance)
                    }}</span>
                  </div>

                  <v-alert type="info" variant="flat" class="rounded-lg mb-0">
                    <div class="mb-2">CSV files do not provide a verified ledger balance.</div>
                    <div class="d-flex align-center gap-2 mt-2">
                      <v-text-field
                        v-model="targetBalance"
                        label="Set Target Ledger Balance (Optional)"
                        density="compact"
                        variant="solo-filled"
                        rounded="lg"
                        hide-details
                        prefix="$"
                        type="number"
                      />
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
            :disabled="!isMappingValid"
            @click="step = 3"
          >
            Match Account <v-icon end>mdi-arrow-right</v-icon>
          </v-btn>

          <v-btn
            v-else-if="step === 3"
            color="primary"
            variant="flat"
            size="large"
            rounded="lg"
            @click="step = 4"
          >
            Review & Finalize <v-icon end>mdi-arrow-right</v-icon>
          </v-btn>

          <v-btn
            v-else-if="step === 4"
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
import { useUserAccountsStore } from '../stores/userAccounts'
import { useUserSettingsStore } from '../stores/userSettings'

const ipc = window.electron.ipcRenderer
const accountsStore = useUserAccountsStore()
const settingsStore = useUserSettingsStore()
const { formatCurrency } = settingsStore
const emit = defineEmits(['navigate'])

const STEPS = [
  { title: 'Upload', value: 1 },
  { title: 'Map Cols', value: 2 },
  { title: 'Account', value: 3 },
  { title: 'Finalize', value: 4 }
]
const step = ref(1)

const isDragging = ref(false)
const selectedFiles = ref([])
const parseError = ref(null)
const parsing = ref(false)
const importing = ref(false)
const fileInput = ref(null)

const TARGET_COLUMNS = [
  { key: 'DTPOSTED', label: 'Posted Date (+ Time)', required: true, multi: true },
  { key: 'TRNAMT', label: 'Amount', required: true, multi: false },
  { key: 'TRNTYPE', label: 'Transaction Type', required: true, multi: false },
  { key: 'MEMO', label: 'Memo/Description', required: true, multi: true },
  { key: 'CHECKNUM', label: 'Check Number', required: false, multi: false },
  { key: 'REFNUM', label: 'Reference #', required: false, multi: false },
  { key: 'DTUSER', label: 'User Date', required: false, multi: true },
  { key: 'EXTDNAME', label: 'Extended Name', required: false, multi: false }
]

// CSV specifics
const csvText = ref('')
const csvHeaders = ref([])
const sampleRows = ref([])
const rowCount = ref(0)
const headerMapping = ref({})
const invertAmount = ref(false)

const targetAcctId = ref(null)
const targetBalance = ref(null)

onMounted(async () => {
  await accountsStore.fetchAccounts()
})

const targetOptions = computed(() => {
  const mappedTargets = Object.values(headerMapping.value).filter((v) => v)

  return [
    { title: '-- Ignore --', value: null },
    ...TARGET_COLUMNS.map((t) => {
      // If a target is NOT multi, disable it if it's already selected by a column
      const isMapped = mappedTargets.includes(t.key)
      const disabled = !t.multi && isMapped

      return {
        title: t.label + (t.required ? ' *' : ''),
        value: t.key,
        props: { disabled }
      }
    })
  ]
})

const accountOptions = computed(() => [
  { title: '-- Create New Account --', value: null },
  ...accountsStore.accounts.map((a) => ({
    title: `${a.displayName || a.ACCTTYPE} (${a.ORG || 'Unknown'})`,
    value: a.ACCTID
  }))
])

const currentDbBalance = computed(() => {
  if (!targetAcctId.value) return 0
  const acc = accountsStore.accounts.find((a) => a.ACCTID === targetAcctId.value)
  return acc ? acc.BALAMT : 0
})

const isMappingValid = computed(() => {
  const mappedTargets = Object.values(headerMapping.value)
  return TARGET_COLUMNS.filter((t) => t.required).every((t) => mappedTargets.includes(t.key))
})

function handleDrop(e) {
  isDragging.value = false
  const dropped = Array.from(e.dataTransfer.files).filter((f) =>
    f.name.toLowerCase().endsWith('.csv')
  )
  if (dropped.length) {
    selectedFiles.value = [dropped[0]]
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
  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      csvText.value = e.target.result
      const res = await ipc.invoke('csv:extractHeaders', csvText.value)
      if (res.success) {
        csvHeaders.value = res.data.headers
        sampleRows.value = res.data.sampleRows
        rowCount.value = res.data.rowCount

        csvHeaders.value.forEach((h) => {
          headerMapping.value[h] = null
        })

        // Auto-guess columns
        const dateMatches = csvHeaders.value.filter((h) => /date|time/i.test(h))
        const memoMatch = csvHeaders.value.find((h) =>
          /description|payee|name|title|memo|notes/i.test(h)
        )
        const amountMatch = csvHeaders.value.find((h) => /amount|value/i.test(h))

        dateMatches.forEach((dm) => {
          headerMapping.value[dm] = 'DTPOSTED'
        })
        if (memoMatch) headerMapping.value[memoMatch] = 'MEMO'
        if (amountMatch) headerMapping.value[amountMatch] = 'TRNAMT'

        step.value = 2
      } else {
        throw new Error(res.error)
      }
    } catch (err) {
      parseError.value = err.message
    } finally {
      parsing.value = false
    }
  }
  reader.onerror = () => {
    parseError.value = 'Failed to read file'
    parsing.value = false
  }
  reader.readAsText(file)
}

function getBatchPayload() {
  // Clean up the mapping
  const mapping = {}

  for (const [csvHeader, targetKey] of Object.entries(headerMapping.value)) {
    if (targetKey) {
      if (!mapping[targetKey]) mapping[targetKey] = { columns: [] }
      mapping[targetKey].columns.push(csvHeader)
    }
  }

  // To prevent SQLite Missing Named Parameter errors for mapped fields:
  TARGET_COLUMNS.forEach((t) => {
    if (!mapping[t.key]) {
      mapping[t.key] = { columns: ['__EMPTY__'] }
    }
  })

  // NAME is required by backend but missing in our TARGET_COLUMNS
  if (!mapping['NAME']) {
    mapping['NAME'] = { columns: ['__EMPTY__'] }
  }

  return [
    {
      csvText: csvText.value,
      mapping: mapping,
      options: { invertAmount: invertAmount.value },
      targetAcctId: targetAcctId.value,
      accountStub: { ACCTTYPE: 'Checking', ORG: 'CSV Import' },
      targetBalance: targetBalance.value ? Number(targetBalance.value) : null
    }
  ]
}

function accountLabel(id) {
  const a = accountsStore.accounts.find((x) => x.ACCTID === id)
  if (!a) return 'New Account'
  return `${a.displayName || a.ACCTTYPE} (${a.ORG || 'Unknown'})`
}

async function doImport() {
  importing.value = true
  parseError.value = null
  try {
    const payload = getBatchPayload()
    const res = await ipc.invoke('csv:importBatch', payload)
    if (res.success) {
      await accountsStore.fetchAccounts()
      emit('navigate', 'Transactions')
    } else {
      throw new Error(res.error)
    }
  } catch (err) {
    console.error(err)
    parseError.value = err.message
  } finally {
    importing.value = false
  }
}
</script>
