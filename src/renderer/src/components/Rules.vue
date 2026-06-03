<template>
  <v-container class="pa-6" style="max-width: 1100px">
    <div class="d-flex align-center justify-space-between mb-4">
      <div>
        <div class="text-h6 font-weight-bold">Category Rules</div>
        <div class="text-body-2 text-medium-emphasis">
          Applied top-to-bottom as transactions are imported
        </div>
      </div>
      <div class="d-flex align-center gap-2">
        <v-btn
          variant="tonal"
          color="primary"
          rounded="lg"
          prepend-icon="mdi-play-outline"
          @click="applyRules(false)"
          >Apply to this month</v-btn
        >
        <v-btn
          variant="tonal"
          color="primary"
          rounded="lg"
          prepend-icon="mdi-play-circle-outline"
          @click="applyRules(true)"
          >Apply to all</v-btn
        >
        <v-btn
          variant="flat"
          color="primary"
          rounded="lg"
          prepend-icon="mdi-plus"
          @click="openAddDialog"
          >Add rule</v-btn
        >
      </div>
    </div>

    <!-- Apply result banner -->
    <v-slide-y-transition>
      <v-alert
        v-if="applyResult !== null"
        :type="applyResult.applied > 0 ? 'success' : 'info'"
        variant="flat"
        closable
        class="mb-4"
        @click:close="applyResult = null"
      >
        {{ applyResult.applied }} transaction{{ applyResult.applied === 1 ? '' : 's' }} categorized.
      </v-alert>
    </v-slide-y-transition>

    <!-- Error Banner -->
    <v-alert
      v-if="store.error"
      type="error"
      variant="flat"
      closable
      class="mb-4"
      @click:close="store.clearError()"
    >
      {{ store.error }}
    </v-alert>

    <!-- Empty State -->
    <v-card v-if="!store.loading && store.rules.length === 0" rounded="lg" elevation="0" border>
      <v-card-text class="pa-12 text-center">
        <v-icon size="60" class="mb-4 text-disabled">mdi-tag-multiple-outline</v-icon>
        <div class="text-h6 font-weight-medium mb-2">No rules yet</div>
        <div class="text-body-2 text-medium-emphasis">
          Add a rule to automatically categorize transactions when importing.
        </div>
      </v-card-text>
    </v-card>

    <!-- Rules Table -->
    <v-card v-else rounded="lg" elevation="0" border class="mb-4">
      <v-data-table
        :headers="headers"
        :items="sortedRules"
        :loading="store.loading"
        density="comfortable"
        :items-per-page="-1"
        hide-default-footer
        hover
      >
        <template #item.move="{ item, index }">
          <div class="d-flex align-center ga-0">
            <v-btn
              icon="mdi-chevron-up"
              variant="text"
              size="small"
              density="compact"
              :disabled="index === 0"
              @click="store.moveRule(item.id, -1)"
            />
            <v-btn
              icon="mdi-chevron-down"
              variant="text"
              size="small"
              density="compact"
              :disabled="index === sortedRules.length - 1"
              @click="store.moveRule(item.id, 1)"
            />
          </div>
        </template>

        <template #item.index="{ index }">
          <span class="text-body-2 text-medium-emphasis">{{ index + 1 }}</span>
        </template>

        <template #item.field="{ item }">
          <span class="text-body-2">{{ fieldLabel(item.field) }}</span>
        </template>

        <template #item.condition="{ item }">
          <span class="text-body-2 text-medium-emphasis">{{ item.operator }}</span>
          <v-chip
            size="x-small"
            variant="tonal"
            rounded="sm"
            class="ml-2 font-weight-bold text-uppercase"
            >{{ item.value }}</v-chip
          >
        </template>

        <template #item.category="{ item }">
          <v-chip size="x-small" variant="tonal" color="primary" rounded="pill">{{
            item.category
          }}</v-chip>
        </template>

        <template #item.matches="{ item }">
          <span class="text-body-2">{{ item.matchCount ?? '—' }}</span>
        </template>

        <template #item.actions="{ item }">
          <div class="d-flex align-center justify-end gap-1">
            <v-btn
              icon="mdi-pencil-outline"
              variant="text"
              size="small"
              density="compact"
              @click="openEditDialog(item)"
            />
            <v-btn
              icon="mdi-delete-outline"
              variant="text"
              size="small"
              color="error"
              density="compact"
              @click="confirmDelete(item)"
            />
          </div>
        </template>

        <template #loading>
          <v-skeleton-loader type="table-row@5" />
        </template>
      </v-data-table>
    </v-card>

    <!-- Info banner -->
    <v-alert
      variant="tonal"
      color="primary"
      density="compact"
      rounded="lg"
      prepend-icon="mdi-information-outline"
    >
      Rules run in order — the first match wins, so put more specific rules near the top.
    </v-alert>

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
                <v-col cols="8" class="mt-3">
                  <v-select
                    v-model="form.type"
                    :items="typeOptions"
                    item-title="label"
                    item-value="value"
                    label="Assign transaction type (optional)"
                    variant="solo"
                    inset
                    density="comfortable"
                    rounded="sm"
                    hide-details
                    clearable
                    color="primary"
                  />
                </v-col>
                <v-col cols="4" class="mt-3">
                  <v-text-field
                    v-model.number="form.priority"
                    label="Priority"
                    type="number"
                    variant="solo"
                    inset
                    density="comfortable"
                    rounded="sm"
                    hide-details
                    color="primary"
                  />
                </v-col>
                <v-col cols="12" class="mt-3">
                  <v-combobox
                    v-model="form.category"
                    :items="allCategoryNames"
                    label="Assign category"
                    variant="solo"
                    inset
                    density="comfortable"
                    rounded="sm"
                    hide-details
                    clearable
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
            :loading="store.loading"
            :disabled="!form.field || !form.operator || !form.value || !form.category"
            @click="saveRule"
          >
            {{ editTarget ? 'Save' : 'Add' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation -->
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card rounded="lg">
        <v-card-title class="text-h6 pa-6 pb-4">Delete Rule</v-card-title>
        <v-card-text class="pa-6 pt-0 text-body-2 text-medium-emphasis">
          Delete the rule matching
          <strong
            >{{ deleteTarget?.field }} {{ deleteTarget?.operator }} "{{
              deleteTarget?.value
            }}"</strong
          >? This cannot be undone.
        </v-card-text>
        <v-card-actions class="pa-6 pt-0 gap-2">
          <v-spacer />
          <v-btn variant="text" @click="deleteDialog = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" :loading="store.loading" @click="doDelete"
            >Delete</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useUserRulesStore } from '../stores/userRules'
import { useUserCategoriesStore } from '../stores/userCategories'
import { useUserTransactionsStore } from '../stores/userTransactions'

const store = useUserRulesStore()
const categoriesStore = useUserCategoriesStore()
const transactionsStore = useUserTransactionsStore()

function currentMonthValue() {
  const now = new Date()
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
}

const currentMonth = currentMonthValue()

onMounted(() => {
  store.fetchRules()
})

const allCategoryNames = computed(() => {
  const cats = form.value.type
    ? categoriesStore.categories.filter((c) => c.type === form.value.type)
    : categoriesStore.categories
  return cats.map((c) => c.name)
})

const sortedRules = computed(() =>
  [...store.rules].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
)

const fieldLabels = { NAME: 'Payee', MEMO: 'Memo', TRNAMT: 'Amount', TRNTYPE: 'Tran. type' }
function fieldLabel(f) {
  return fieldLabels[f] ?? f
}

const headers = [
  { title: '', key: 'move', width: '72px', sortable: false },
  { title: '#', key: 'index', width: '60px', sortable: false },
  { title: 'When', key: 'field', width: '130px', sortable: false },
  { title: 'Condition', key: 'condition', sortable: false },
  { title: 'Set category', key: 'category', width: '170px', sortable: false },
  { title: 'Matches', key: 'matches', width: '110px', sortable: false, align: 'end' },
  { title: '', key: 'actions', width: '90px', sortable: false, align: 'end' }
]

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

const typeOptions = [
  { label: 'Income', value: 'income' },
  { label: 'Expense', value: 'expense' },
  { label: 'Bills', value: 'bills' },
  { label: 'Variable', value: 'variable' },
  { label: 'Savings', value: 'savings' }
]

const operatorHint = computed(
  () =>
    ({
      contains:
        'Substring match. Bank separators (*, #, etc.) are ignored. "Uber Eats" matches "UBER *EATS"',
      equals:
        'Full-field match. Bank separators (*, #, etc.) are ignored.',
      startsWith:
        'Prefix match. Bank separators (*, #, etc.) are ignored.',
      wildcard: 'Anchored wildcard — must match the whole field. e.g. WAL*MART*',
      wholeWord:
        'Whole-word match. Use * inside a word — e.g. gas* matches "gasoline" but not "natural gases"',
      gt: 'Numeric — e.g. 50 matches amounts greater than 50',
      lt: 'Numeric — e.g. 50 matches amounts less than 50'
    })[form.value.operator] ?? ''
)

const ruleDialog = ref(false)
const editTarget = ref(null)

const blankForm = () => ({
  field: 'NAME',
  operator: 'contains',
  value: '',
  category: '',
  type: null,
  priority: 0
})
const form = ref(blankForm())

function openAddDialog() {
  editTarget.value = null
  form.value = blankForm()
  ruleDialog.value = true
}

function openEditDialog(item) {
  editTarget.value = item
  form.value = {
    field: item.field,
    operator: item.operator,
    value: item.value,
    category: item.category,
    type: item.type ?? null,
    priority: item.priority ?? 0
  }
  ruleDialog.value = true
}

function closeRuleDialog() {
  ruleDialog.value = false
  editTarget.value = null
  liveMatch.value = null
}

async function saveRule() {
  const payload = {
    field: form.value.field,
    operator: form.value.operator,
    value: form.value.value,
    category: form.value.category,
    type: form.value.type || null,
    priority: form.value.priority ?? 0
  }
  if (editTarget.value) {
    await store.editRule(editTarget.value.id, payload)
  } else {
    await store.createRule(payload)
  }
  if (!store.error) closeRuleDialog()
}

const deleteDialog = ref(false)
const deleteTarget = ref(null)

function confirmDelete(item) {
  deleteTarget.value = item
  deleteDialog.value = true
}

async function doDelete() {
  if (!deleteTarget.value) return
  await store.removeRule(deleteTarget.value.id)
  deleteDialog.value = false
  deleteTarget.value = null
}

// Live matching
const liveMatch = ref(null)
let liveMatchTimer = null

watch(
  () => [form.value.field, form.value.operator, form.value.value],
  ([field, operator, value]) => {
    clearTimeout(liveMatchTimer)
    if (!value) {
      liveMatch.value = null
      return
    }
    liveMatchTimer = setTimeout(async () => {
      liveMatch.value = await store.previewRule({ field, operator, value })
    }, 350)
  }
)

function matchedFieldText(tx) {
  const v = tx[form.value.field]
  if (v != null && String(v).trim() !== '') return String(v)
  return tx.NAME || tx.MEMO || '—'
}



const applyResult = ref(null)

async function applyRules(applyAll = false) {
  applyResult.value = null
  const result = applyAll ? await store.applyToAll() : await store.applyToMonth(currentMonth)
  if (result?.success) {
    applyResult.value = result.data
    if (!applyAll) await transactionsStore.fetchTransactionsByMonth(currentMonth)
  }
}
</script>

<style scoped>
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
