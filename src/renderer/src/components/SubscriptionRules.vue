<template>
  <v-container fluid class="pa-4">
    <!-- Header -->
    <div class="d-flex align-center mb-5">
      <div>
        <div class="text-body-1 font-weight-bold">Subscription detection rules</div>
        <div class="text-caption text-medium-emphasis">
          Payees matching these are tracked as subscriptions
        </div>
      </div>
      <v-spacer />
      <v-btn
        size="small"
        variant="flat"
        color="primary"
        rounded="sm"
        prepend-icon="mdi-plus"
        @click="openAdd"
      >
        Add rule
      </v-btn>
    </div>

    <!-- Table Card -->
    <v-card rounded="sm" elevation="1">
      <div v-if="!rules.length" class="d-flex flex-column align-center pa-12 text-medium-emphasis">
        <v-icon size="48" class="mb-3" style="opacity: 0.3" icon="mdi-tune-variant" />
        <div class="text-body-2">No rules yet.</div>
        <div class="text-caption mt-1">Rules force-track subscriptions by payee keyword.</div>
      </div>

      <template v-else>
        <div
          class="rule-row rule-row--header text-caption text-uppercase font-weight-bold text-medium-emphasis mb-1"
        >
          <span>When payee contains</span>
          <span>Cycle</span>
          <span>Expected</span>
          <span>Source</span>
          <span></span>
        </div>
        <v-divider class="mb-1" />

        <template v-for="(rule, i) in rules" :key="rule.id">
          <div class="rule-row py-3">
            <div>
              <v-chip
                size="small"
                variant="tonal"
                rounded="sm"
                class="font-weight-bold text-uppercase"
              >
                {{ rule.name }}
              </v-chip>
            </div>
            <div>
              <span class="text-body-2 text-medium-emphasis">Monthly</span>
            </div>
            <div>
              <span class="text-body-2 text-medium-emphasis">
                {{ matchedSub(rule) ? formatCurrency(matchedSub(rule).typicalAmount) : '—' }}
              </span>
            </div>
            <div>
              <v-chip size="x-small" variant="flat" color="primary" rounded="sm">Manual</v-chip>
            </div>
            <div class="text-right">
              <v-btn
                icon="mdi-delete-outline"
                variant="text"
                size="small"
                density="compact"
                color="error"
                @click="confirmDelete(rule)"
              />
            </div>
          </div>
          <v-divider v-if="i < rules.length - 1" />
        </template>
      </template>
    </v-card>

    <!-- Add / Edit Rule Dialog -->
    <v-dialog v-model="ruleDialog" max-width="1100" persistent>
      <v-card rounded="lg" class="dialog-card">
        <v-card-title class="pa-6 pb-4">
          <div class="d-flex align-center justify-space-between">
            <div class="d-flex align-center gap-3">
              <v-icon color="primary" size="20">mdi-tag-multiple-outline</v-icon>
              <span class="text-h6 font-weight-bold">{{
                editTarget ? 'Edit Rule' : 'Add Rule'
              }}</span>
            </div>
            <v-btn icon="mdi-close" variant="text" density="compact" @click="closeRuleDialog" />
          </div>
        </v-card-title>
        <v-divider />
        <div class="d-flex dialog-body">
          <!-- Left: form -->
          <div style="flex: 1; min-width: 0">
            <v-card-text class="pa-6">
              <v-row>
                <v-col cols="6">
                  <v-select
                    v-model="form.field"
                    :items="fieldOptions"
                    item-title="label"
                    item-value="value"
                    label="Field"
                    variant="solo"
                    inset
                    density="comfortable"
                    rounded="sm"
                    hide-details
                    color="primary"
                  />
                </v-col>
                <v-col cols="6">
                  <v-select
                    v-model="form.operator"
                    :items="operatorOptions"
                    item-title="label"
                    item-value="value"
                    label="Operator"
                    variant="solo"
                    inset
                    density="comfortable"
                    rounded="sm"
                    hide-details
                    color="primary"
                  />
                </v-col>
                <v-col cols="12" class="mt-3">
                  <v-text-field
                    v-model="form.value"
                    label="Match value"
                    variant="solo"
                    inset
                    density="comfortable"
                    rounded="sm"
                    persistent-hint
                    :hint="operatorHint"
                    autofocus
                    color="primary"
                  />
                </v-col>
              </v-row>
            </v-card-text>
          </div>

          <!-- Divider -->
          <v-divider vertical />

          <!-- Right: live match -->
          <div class="live-match-panel pa-4 d-flex flex-column">
            <div class="d-flex align-center ga-2 mb-3">
              <v-icon size="14" color="primary">mdi-lightning-bolt</v-icon>
              <span class="text-caption font-weight-medium text-medium-emphasis text-uppercase"
                >Live match</span
              >
              <v-chip
                v-if="liveMatch"
                size="x-small"
                :color="liveMatch.count > 0 ? 'primary' : 'default'"
                variant="tonal"
                rounded="pill"
              >
                {{ liveMatch.count }} transaction{{ liveMatch.count === 1 ? '' : 's' }}
              </v-chip>
            </div>
            <div
              v-if="liveMatch && liveMatch.samples.length"
              class="d-flex flex-column ga-1 live-match-list flex-grow-1"
            >
              <div
                v-for="tx in liveMatch.samples"
                :key="tx.FITID"
                class="d-flex align-center justify-space-between text-caption live-match-row px-2 py-1 rounded"
              >
                <span class="text-truncate mr-2">{{ matchedFieldText(tx) }}</span>
                <span class="text-medium-emphasis text-no-wrap">{{
                  tx.TRNAMT != null
                    ? (tx.TRNAMT < 0 ? '-' : '+') + '$' + Math.abs(tx.TRNAMT).toFixed(2)
                    : '—'
                }}</span>
              </div>
            </div>
            <div
              v-else
              class="text-caption text-medium-emphasis flex-grow-1 d-flex align-center justify-center text-center"
              style="opacity: 0.5"
            >
              {{ liveMatch ? 'No transactions match.' : 'Type a match value\nto preview results.' }}
            </div>
          </div>
        </div>

        <v-divider />
        <v-card-actions class="pa-6 py-4">
          <v-spacer />
          <v-btn variant="text" @click="closeRuleDialog">Cancel</v-btn>
          <v-btn
            variant="flat"
            rounded="sm"
            :loading="saving"
            :disabled="!form.field || !form.operator || !form.value"
            @click="saveRule"
          >
            {{ editTarget ? 'Save' : 'Add' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete confirm dialog -->
    <v-dialog v-model="deleteDialog" max-width="360">
      <v-card rounded="sm">
        <v-card-text class="pa-5">
          <div class="text-body-1 font-weight-bold mb-2">Remove rule?</div>
          <div class="text-body-2 text-medium-emphasis">
            Transactions matching <strong>{{ pendingDelete?.name }}</strong> will no longer be
            force-tracked as subscriptions.
          </div>
        </v-card-text>
        <v-card-actions class="pa-5 pt-0">
          <v-spacer />
          <v-btn variant="text" rounded="sm" @click="deleteDialog = false">Cancel</v-btn>
          <v-btn
            color="error"
            variant="flat"
            rounded="sm"
            :loading="deleting"
            @click="executeDelete"
            >Remove</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { useUserSettingsStore } from '../stores/userSettings'
import { useUserRulesStore } from '../stores/userRules'

const props = defineProps({
  rules: { type: Array, default: () => [] },
  subscriptions: { type: Array, default: () => [] }
})
const emit = defineEmits(['updated'])

const { formatCurrency } = useUserSettingsStore()
const rulesStore = useUserRulesStore()

const ruleDialog = ref(false)
const editTarget = ref(null)
const deleteDialog = ref(false)
const saving = ref(false)
const deleting = ref(false)
const pendingDelete = ref(null)

const blankForm = () => ({ field: 'NAME', operator: 'contains', value: '' })
const form = ref(blankForm())

const liveMatch = ref(null)
let liveMatchTimer = null

onUnmounted(() => clearTimeout(liveMatchTimer))

watch(
  () => [form.value.field, form.value.operator, form.value.value],
  ([field, operator, value]) => {
    clearTimeout(liveMatchTimer)
    if (!value) {
      liveMatch.value = null
      return
    }
    liveMatchTimer = setTimeout(async () => {
      liveMatch.value = await rulesStore.previewRule({ field, operator, value })
    }, 350)
  }
)

const fieldOptions = [
  { label: 'Name (payee)', value: 'NAME' },
  { label: 'Memo', value: 'MEMO' },
  { label: 'Amount', value: 'TRNAMT' },
  { label: 'Tran. type', value: 'TRNTYPE' }
]

const operatorOptions = [
  { label: 'contains', value: 'contains' },
  { label: 'equals', value: 'equals' },
  { label: 'starts with', value: 'startsWith' },
  { label: 'wildcard (*)', value: 'wildcard' },
  { label: 'whole words', value: 'wholeWord' },
  { label: '> (greater than)', value: 'gt' },
  { label: '< (less than)', value: 'lt' }
]

const operatorHint = computed(
  () =>
    ({
      contains:
        'Substring match. Bank separators (*, #, etc.) are ignored. "Uber Eats" matches "UBER *EATS"',
      equals: 'Full-field match. Bank separators (*, #, etc.) are ignored.',
      startsWith: 'Prefix match. Bank separators (*, #, etc.) are ignored.',
      wildcard: 'Anchored wildcard — must match the whole field. e.g. WAL*MART*',
      wholeWord:
        'Whole-word match. Use * inside a word — e.g. gas* matches "gasoline" but not "natural gases"',
      gt: 'Numeric — e.g. 50 matches amounts greater than 50',
      lt: 'Numeric — e.g. 50 matches amounts less than 50'
    })[form.value.operator] ?? ''
)

function matchedFieldText(tx) {
  const v = tx[form.value.field]
  if (v != null && String(v).trim() !== '') return String(v)
  return tx.NAME || tx.MEMO || '—'
}

function matchesRule(name, rule) {
  const haystack = (name || '').toLowerCase()
  const needle = (rule.name || '').toLowerCase()
  switch (rule.operator) {
    case 'equals':
      return haystack === needle
    case 'startsWith':
      return haystack.startsWith(needle)
    case 'wholeWord':
      return new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(haystack)
    default:
      return haystack.includes(needle)
  }
}

function matchedSub(rule) {
  return props.subscriptions.find((s) => matchesRule(s.name, rule)) || null
}

function openAdd() {
  editTarget.value = null
  form.value = blankForm()
  liveMatch.value = null
  ruleDialog.value = true
}

function closeRuleDialog() {
  ruleDialog.value = false
  editTarget.value = null
  liveMatch.value = null
}

async function saveRule() {
  if (!form.value.value.trim()) return
  saving.value = true
  await window.electron.ipcRenderer.invoke('customRecurring:create', {
    name: form.value.value.trim(),
    operator: form.value.operator
  })
  saving.value = false
  closeRuleDialog()
  emit('updated')
}

function confirmDelete(rule) {
  pendingDelete.value = rule
  deleteDialog.value = true
}

async function executeDelete() {
  if (!pendingDelete.value) return
  deleting.value = true
  await window.electron.ipcRenderer.invoke('customRecurring:delete', pendingDelete.value.id)
  deleting.value = false
  deleteDialog.value = false
  pendingDelete.value = null
  emit('updated')
}
</script>

<style scoped>
.rule-row {
  display: grid;
  grid-template-columns: 1fr 90px 110px 100px 48px;
  align-items: center;
  column-gap: 12px;
  padding-left: 4px;
  padding-right: 4px;
}

.rule-row--header {
  padding-top: 4px;
  padding-bottom: 4px;
}

.dialog-card {
  height: 90vh;
  display: flex;
  flex-direction: column;
}

.dialog-body {
  flex: 1;
  overflow: hidden;
}

.live-match-panel {
  width: 580px;
  flex-shrink: 0;
  overflow: hidden;
  align-self: stretch;
}

.live-match-list {
  overflow-y: auto;
  flex: 1;
}

.live-match-row {
  background: rgba(var(--v-theme-surface-variant), 0.4);
}
</style>
