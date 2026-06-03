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
    <v-stepper
      v-model="step"
      :items="STEPS"
      rounded="lg"
      elevation="1"
      bg-color="primary-container"
    >
      <template #item.1>
        <v-card-text class="pa-6">
          <v-file-input
            v-model="selectedFiles"
            accept=".ofx,.qfx"
            label="Choose OFX / QFX files"
            prepend-icon=""
            prepend-inner-icon="mdi-folder-open-outline"
            variant="outlined"
            density="comfortable"
            rounded="sm"
            hide-details="auto"
            multiple
            :error-messages="parseError ? [parseError] : []"
            @update:model-value="parseError = null"
          />
        </v-card-text>
      </template>

      <template #item.2>
        <v-card-text class="pa-6">
          <div class="text-subtitle-1 font-weight-medium mb-4">
            We found {{ mappings.length }} account{{ mappings.length !== 1 ? 's' : '' }} — match
            them
          </div>

          <div
            class="d-flex text-caption text-uppercase text-medium-emphasis font-weight-bold mb-2"
          >
            <div style="flex: 0 0 260px">In file</div>
            <div style="flex: 0 0 140px">Type</div>
            <div class="flex-1">Your account</div>
          </div>
          <v-divider />

          <div v-for="(m, i) in mappings" :key="i">
            <div class="d-flex align-center py-4">
              <div style="flex: 0 0 260px">
                <div class="text-body-2 font-weight-medium">
                  {{ m.parsedAccount.ORG || 'Unknown Bank' }} ••{{ m.parsedAccount.ACCTID }}
                </div>
                <div class="text-caption text-medium-emphasis">{{ m.txCount }} transactions</div>
              </div>
              <div style="flex: 0 0 140px">
                <v-chip
                  size="small"
                  variant="outlined"
                  :color="accountTypeColor(m.parsedAccount.ACCTTYPE)"
                >
                  {{ m.parsedAccount.ACCTTYPE }}
                </v-chip>
              </div>
              <div class="flex-1">
                <div v-if="m.autoMatched" class="d-flex align-center ga-2">
                  <v-chip size="small" color="success" variant="tonal" prepend-icon="mdi-check">
                    {{ accountLabel(m.targetAcctId) }}
                  </v-chip>
                  <span class="text-caption text-medium-emphasis">auto-matched by FITID</span>
                </div>
                <v-select
                  v-else
                  v-model="m.targetAcctId"
                  :items="accountOptions"
                  item-title="title"
                  item-value="value"
                  variant="outlined"
                  density="compact"
                  rounded="sm"
                  style="max-width: 280px"
                  color="primary"
                />
              </div>
            </div>
            <v-divider v-if="i < mappings.length - 1" />
          </div>
        </v-card-text>
      </template>

      <template #item.3>
        <v-card-text class="pa-6">
          <div class="text-subtitle-1 font-weight-medium mb-4">Review duplicates</div>
          <div v-for="(m, i) in mappings" :key="i">
            <div class="d-flex align-center justify-space-between py-3">
              <div class="text-body-2">
                <span class="font-weight-medium">
                  {{ m.parsedAccount.ORG || 'Unknown' }} ••{{ m.parsedAccount.ACCTID }}
                </span>
                <v-icon size="14" class="mx-1 text-medium-emphasis">mdi-arrow-right</v-icon>
                <span>{{ m.targetAcctId ? accountLabel(m.targetAcctId) : 'New account' }}</span>
              </div>
              <div class="d-flex align-center ga-4 text-body-2">
                <span class="text-success font-weight-medium">{{ m.newCount }} new</span>
                <span v-if="m.dupCount" class="text-medium-emphasis">
                  {{ m.dupCount }} duplicate{{ m.dupCount !== 1 ? 's' : '' }} (skipped)
                </span>
              </div>
            </div>
            <v-divider v-if="i < mappings.length - 1" />
          </div>
        </v-card-text>
      </template>

      <template #item.4>
        <v-card-text class="pa-6">
          <div class="text-subtitle-1 font-weight-medium mb-4">Ready to import</div>
          <div v-for="(m, i) in mappings" :key="i" class="d-flex align-center ga-2 mb-2">
            <v-icon size="16" color="primary">mdi-bank-outline</v-icon>
            <span class="text-body-2">
              {{ m.parsedAccount.ORG || 'Unknown' }} ••{{ m.parsedAccount.ACCTID }}:
              <strong>{{ m.newCount }} transaction{{ m.newCount !== 1 ? 's' : '' }}</strong>
              into
              <strong>{{ m.targetAcctId ? accountLabel(m.targetAcctId) : 'new account' }}</strong>
            </span>
          </div>
          <v-alert
            v-if="importError"
            type="error"
            density="compact"
            rounded="sm"
            class="mt-4 text-caption"
          >
            {{ importError }}
          </v-alert>
        </v-card-text>
      </template>

      <!-- Navigation -->
      <template #actions>
        <v-card-actions class="pa-4">
          <v-btn v-if="step > 1" variant="flat" color="primary" @click="step--">Back</v-btn>
          <v-spacer />

          <v-btn
            v-if="step === 1"
            variant="flat"
            rounded="sm"
            :loading="parsing"
            append-icon="mdi-arrow-right"
            @click="parseFiles"
            color="primary"
          >
            Next
          </v-btn>

          <v-btn
            v-else-if="step === 2"
            variant="flat"
            rounded="sm"
            :loading="checkingDups"
            append-icon="mdi-arrow-right"
            @click="goCheckDuplicates"
            color="primary"
          >
            Check duplicates
          </v-btn>

          <v-btn
            v-else-if="step === 3"
            variant="flat"
            rounded="sm"
            append-icon="mdi-arrow-right"
            @click="step = 4"
            color="primary"
          >
            Confirm
          </v-btn>

          <v-btn
            v-else-if="step === 4"
            variant="flat"
            rounded="sm"
            :loading="importing"
            append-icon="mdi-check"
            @click="doImport"
            color="primary"
          >
            Import
          </v-btn>
        </v-card-actions>
      </template>
    </v-stepper>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserAccountsStore, accountTypeColor } from '../stores/userAccounts'

const ipc = window.electron.ipcRenderer
const store = useUserAccountsStore()
const emit = defineEmits(['navigate'])

const STEPS = [
  { title: 'Upload', value: 1 },
  { title: 'Match accounts', value: 2 },
  { title: 'Review duplicates', value: 3 },
  { title: 'Confirm', value: 4 }
]
const step = ref(1)

const selectedFiles = ref([])
const parsing = ref(false)
const parseError = ref(null)

// Each entry: { parsedAccount, ofxText, txCount, fitids, targetAcctId, autoMatched, newCount, dupCount }
const mappings = ref([])

const checkingDups = ref(false)
const importing = ref(false)
const importError = ref(null)

onMounted(() => store.fetchAccounts())

const accountOptions = computed(() => [
  { title: 'Create new account', value: null },
  ...store.accounts.map((a) => ({
    title: a.displayName || a.ACCTTYPE || `••${a.ACCTID}`,
    value: a.ACCTID
  }))
])

function accountLabel(acctId) {
  if (!acctId) return 'New account'
  const a = store.accounts.find((acc) => acc.ACCTID === acctId)
  return a ? a.displayName || a.ACCTTYPE || `••${a.ACCTID}` : acctId
}

async function parseFiles() {
  if (!selectedFiles.value || !selectedFiles.value.length) {
    parseError.value = 'Please choose at least one file.'
    return
  }

  parsing.value = true
  parseError.value = null
  try {
    await store.fetchAccounts()
    const results = []
    for (const file of selectedFiles.value) {
      const text = await file.text()
      const r = await ipc.invoke('ofx:parseFile', text)
      if (!r.success) throw new Error(r.error || `Failed to parse ${file.name}`)
      if (!r.data.account) throw new Error(`No account data found in ${file.name}`)
      results.push({ ofxText: text, ...r.data })
    }

    mappings.value = results.map((r) => {
      const match = store.accounts.find((a) => a.ACCTID === r.account.ACCTID)
      return {
        parsedAccount: r.account,
        ofxText: r.ofxText,
        txCount: r.txCount,
        fitids: r.fitids,
        targetAcctId: match ? match.ACCTID : null,
        autoMatched: !!match,
        newCount: r.txCount,
        dupCount: 0
      }
    })

    step.value = 2
  } catch (e) {
    parseError.value = e.message
  } finally {
    parsing.value = false
  }
}

async function goCheckDuplicates() {
  checkingDups.value = true
  try {
    const allFitids = mappings.value.flatMap((m) => m.fitids)
    const r = await ipc.invoke('ofx:checkDuplicates', allFitids)
    if (!r.success) throw new Error(r.error)
    const dupSet = new Set(r.data.duplicates)
    for (const m of mappings.value) {
      m.dupCount = m.fitids.filter((f) => dupSet.has(f)).length
      m.newCount = m.txCount - m.dupCount
    }
    step.value = 3
  } catch (e) {
    parseError.value = e.message
  } finally {
    checkingDups.value = false
  }
}

async function doImport() {
  importing.value = true
  importError.value = null
  try {
    const items = mappings.value.map((m) => ({
      ofxText: m.ofxText,
      targetAcctId: m.targetAcctId
    }))
    const r = await ipc.invoke('ofx:importBatch', items)
    if (!r.success) throw new Error(r.error)
    await store.fetchAccounts()
    emit('navigate', 'Accounts')
  } catch (e) {
    importError.value = e.message
  } finally {
    importing.value = false
  }
}
</script>
