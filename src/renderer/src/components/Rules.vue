<template>
  <v-container class="pa-6" style="max-width: 1100px">
    <div class="d-flex align-center justify-space-between mb-4">
      <div>
        <div class="text-h6 font-weight-bold">Rules</div>
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
        {{ applyResult.applied }} transaction{{ applyResult.applied === 1 ? '' : 's' }} updated.
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

        <template #item.name="{ item }">
          <span class="text-body-2 font-weight-medium">{{ item.name }}</span>
        </template>

        <template #item.conditions="{ item }">
          <div class="d-flex flex-column gap-1 my-1">
            <div
              v-for="(cond, i) in item.conditions"
              :key="i"
              class="d-flex align-center gap-1 text-body-2"
            >
              <span v-if="i > 0" class="text-caption font-weight-bold text-medium-emphasis"
                >AND</span
              >
              <span class="text-medium-emphasis">{{ fieldLabel(cond.field) }}</span>
              <span class="text-medium-emphasis">{{ operatorLabel(cond.operator) }}</span>
              <v-chip
                size="x-small"
                variant="tonal"
                rounded="lg"
                class="font-weight-bold text-uppercase"
              >
                {{ cond.value }}
              </v-chip>
            </div>
          </div>
        </template>

        <template #item.actions_summary="{ item }">
          <div class="d-flex flex-wrap gap-1 my-1">
            <v-chip
              v-for="(action, i) in item.actions"
              :key="i"
              size="x-small"
              variant="tonal"
              color="primary"
              rounded="pill"
            >
              {{ actionLabel(action) }}
            </v-chip>
            <span v-if="!item.actions?.length" class="text-body-2 text-disabled">—</span>
          </div>
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
      <v-card rounded="lg" class="dialog-card bg-background">
        <v-card-title class="pa-6 pb-4 bg-surface">
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
          <div style="flex: 1; min-width: 0; overflow-y: auto">
            <v-card-text class="pa-6">
              <!-- Rule Name -->
              <div class="text-subtitle-2 font-weight-bold mb-2">Rule Name</div>
              <v-text-field
                v-model="form.name"
                placeholder="e.g. Amazon Purchases"
                variant="solo"
                inset
                density="comfortable"
                rounded="lg"
                hide-details
                color="primary"
                class="mb-6"
              />

              <!-- Conditions -->
              <div
                class="text-subtitle-2 font-weight-bold mb-2 d-flex align-center justify-space-between"
              >
                <span>When transactions match all of...</span>
                <v-btn
                  variant="text"
                  color="primary"
                  size="small"
                  prepend-icon="mdi-plus"
                  @click="addCondition"
                >
                  Add Condition
                </v-btn>
              </div>

              <v-card variant="outlined" class="pa-4 mb-6" rounded="lg" border>
                <div
                  v-for="(cond, idx) in form.conditions"
                  :key="idx"
                  class="d-flex align-start gap-2 mb-3"
                >
                  <v-select
                    v-model="cond.field"
                    :items="fieldOptions"
                    item-title="label"
                    item-value="value"
                    variant="solo"
                    inset
                    density="comfortable"
                    rounded="lg"
                    hide-details
                    style="max-width: 150px"
                  />
                  <v-select
                    v-model="cond.operator"
                    :items="operatorOptions"
                    item-title="label"
                    item-value="value"
                    variant="solo"
                    inset
                    density="comfortable"
                    rounded="lg"
                    hide-details
                    style="max-width: 150px"
                  />
                  <v-text-field
                    v-model="cond.value"
                    placeholder="Match value"
                    variant="solo"
                    inset
                    density="comfortable"
                    rounded="lg"
                    hide-details
                    class="flex-grow-1"
                  />
                  <v-btn
                    v-if="form.conditions.length > 1"
                    icon="mdi-close"
                    variant="text"
                    size="small"
                    color="error"
                    class="mt-1"
                    @click="removeCondition(idx)"
                  />
                </div>
              </v-card>

              <!-- Actions -->
              <div class="text-subtitle-2 font-weight-bold mb-2">Then do the following...</div>

              <v-card variant="outlined" class="pa-4" rounded="lg" border>
                <v-row dense>
                  <v-col cols="12">
                    <v-select
                      v-model="form.type"
                      :items="typeOptions"
                      item-title="label"
                      item-value="value"
                      label="Assign transaction type"
                      variant="solo"
                      inset
                      density="comfortable"
                      rounded="lg"
                      hide-details
                      clearable
                      color="primary"
                    />
                  </v-col>
                  <v-col cols="12" class="mt-2">
                    <v-select
                      v-model="form.category"
                      :items="categoryItems"
                      item-title="title"
                      item-value="value"
                      label="Assign category"
                      variant="solo"
                      inset
                      density="comfortable"
                      rounded="lg"
                      hide-details
                      clearable
                      color="primary"
                    />
                  </v-col>
                  <v-col cols="12" class="mt-2">
                    <v-text-field
                      v-model="form.rename"
                      label="Rename payee to"
                      variant="solo"
                      inset
                      density="comfortable"
                      rounded="lg"
                      clearable
                      hide-details
                      color="primary"
                    />
                  </v-col>

                  <v-col cols="12" class="mt-4">
                    <div class="text-caption font-weight-medium text-medium-emphasis mb-1">
                      Tags
                    </div>
                    <div class="d-flex gap-4">
                      <v-checkbox
                        v-model="form.subscription"
                        label="Subscription"
                        density="compact"
                        hide-details
                        color="primary"
                      />
                      <v-checkbox
                        v-model="form.bill"
                        label="Bill"
                        density="compact"
                        hide-details
                        color="primary"
                      />
                    </div>
                  </v-col>
                </v-row>
              </v-card>
            </v-card-text>
          </div>

          <!-- Divider -->
          <v-divider vertical />

          <!-- Right: live match -->
          <div class="live-match-panel bg-surface pa-4 d-flex flex-column">
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
              class="d-flex flex-column ga-1 live-match-list flex-grow-1 pr-2"
            >
              <div
                v-for="tx in liveMatch.samples"
                :key="tx.FITID"
                class="d-flex align-center justify-space-between text-caption live-match-row px-2 py-1 rounded"
              >
                <span class="text-truncate mr-2">{{ tx.NAME || tx.MEMO || '—' }}</span>
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
        <v-card-actions class="pa-6 py-4 bg-surface">
          <v-spacer />
          <v-btn variant="text" @click="closeRuleDialog">Cancel</v-btn>
          <v-btn
            variant="flat"
            rounded="lg"
            color="primary"
            :loading="store.loading"
            :disabled="!isValidForm"
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
          Delete the rule <strong>"{{ deleteTarget?.name }}"</strong>? This cannot be undone.
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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useUserRulesStore } from '../stores/userRules'
import { useUserCategoriesStore } from '../stores/userCategories'
import { useUserTransactionsStore } from '../stores/userTransactions'
import { useUserBudgetsStore } from '../stores/userBudgets'

const store = useUserRulesStore()
const categoriesStore = useUserCategoriesStore()
const transactionsStore = useUserTransactionsStore()
const budgetsStore = useUserBudgetsStore()

function currentMonthValue() {
  const now = new Date()
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
}

const currentMonth = currentMonthValue()

onMounted(() => {
  store.fetchRules()
})

const categoryItems = computed(() => {
  const cats = form.value.type
    ? categoriesStore.categories.filter((c) => c.type === form.value.type)
    : categoriesStore.categories
  return cats.map((c) => ({ title: c.name, value: c.id }))
})

const sortedRules = computed(() =>
  [...store.rules].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
)

const fieldLabels = { NAME: 'Payee', MEMO: 'Memo', TRNAMT: 'Amount', TRNTYPE: 'Tran. type' }
function fieldLabel(f) {
  return fieldLabels[f] ?? f
}

const operatorLabels = {
  contains: 'contains',
  notContains: 'does not contain',
  equals: 'equals',
  startsWith: 'starts with',
  wildcard: 'wildcard (*)',
  wholeWord: 'whole words',
  gt: '> (greater than)',
  lt: '< (less than)'
}
function operatorLabel(o) {
  return operatorLabels[o] ?? o
}

function actionLabel(action) {
  if (action.type === 'category') {
    return `Cat: ${categoriesStore.categoryById[action.value]?.name ?? action.value}`
  }
  if (action.type === 'transactionType') return `Type: ${action.value}`
  if (action.type === 'rename') return `Rename: ${action.value}`
  if (action.type === 'subscription' && action.value === '1') return 'Subscription'
  if (action.type === 'bill' && action.value === '1') return 'Bill'
  return `${action.type}: ${action.value}`
}

const headers = [
  { title: '', key: 'move', width: '72px', sortable: false },
  { title: 'Name', key: 'name', width: '180px', sortable: false },
  { title: 'Conditions', key: 'conditions', sortable: false },
  { title: 'Actions', key: 'actions_summary', sortable: false },
  { title: 'Matches', key: 'matches', width: '100px', sortable: false, align: 'end' },
  { title: '', key: 'actions', width: '90px', sortable: false, align: 'end' }
]

const fieldOptions = Object.entries(fieldLabels).map(([val, lbl]) => ({ label: lbl, value: val }))
const operatorOptions = Object.entries(operatorLabels).map(([val, lbl]) => ({
  label: lbl,
  value: val
}))

const typeOptions = computed(() => {
  const types = budgetsStore.types.map((t) => ({ label: t, value: t }))
  if (!budgetsStore.types.includes('debt')) types.push({ label: 'Debt', value: 'debt' })
  return types
})

const ruleDialog = ref(false)
const editTarget = ref(null)

const blankForm = () => ({
  name: '',
  priority: 0,
  conditions: [{ field: 'NAME', operator: 'contains', value: '' }],
  // UI bindings for actions:
  category: null,
  type: null,
  rename: '',
  subscription: false,
  bill: false
})
const form = ref(blankForm())

const isValidForm = computed(() => {
  return (
    form.value.conditions.every((c) => c.field && c.operator && c.value) &&
    form.value.conditions.length > 0
  )
})

function addCondition() {
  form.value.conditions.push({ field: 'NAME', operator: 'contains', value: '' })
}

function removeCondition(idx) {
  form.value.conditions.splice(idx, 1)
}

function openAddDialog() {
  editTarget.value = null
  form.value = blankForm()
  ruleDialog.value = true
}

function openEditDialog(item) {
  editTarget.value = item
  form.value = {
    name: item.name,
    priority: item.priority ?? 0,
    conditions: JSON.parse(JSON.stringify(item.conditions)),
    category: item.actions.find((a) => a.type === 'category')?.value || null,
    type: item.actions.find((a) => a.type === 'transactionType')?.value || null,
    rename: item.actions.find((a) => a.type === 'rename')?.value || '',
    subscription: item.actions.find((a) => a.type === 'subscription')?.value === '1',
    bill: item.actions.find((a) => a.type === 'bill')?.value === '1'
  }
  ruleDialog.value = true
}

function closeRuleDialog() {
  ruleDialog.value = false
  editTarget.value = null
  liveMatch.value = null
}

async function saveRule() {
  const actions = []
  if (form.value.category) actions.push({ type: 'category', value: form.value.category })
  if (form.value.type) actions.push({ type: 'transactionType', value: form.value.type })
  if (form.value.rename) actions.push({ type: 'rename', value: form.value.rename })
  if (form.value.subscription) actions.push({ type: 'subscription', value: '1' })
  if (form.value.bill) actions.push({ type: 'bill', value: '1' })

  // Auto-name if empty
  let ruleName = form.value.name.trim()
  if (!ruleName) {
    ruleName = form.value.conditions[0]?.value || 'Untitled Rule'
  }

  const payload = {
    name: ruleName,
    priority: form.value.priority,
    conditions: form.value.conditions.filter((c) => c.field && c.operator && c.value),
    actions
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
  if (!store.error) {
    deleteDialog.value = false
    deleteTarget.value = null
  }
}

watch(
  () => form.value.type,
  () => {
    form.value.category = null
  }
)

// Live matching
const liveMatch = ref(null)
let liveMatchTimer = null

onUnmounted(() => clearTimeout(liveMatchTimer))

watch(
  () => form.value.conditions,
  (newConditions) => {
    clearTimeout(liveMatchTimer)
    const validConds = newConditions.filter((c) => c.field && c.operator && c.value)
    if (!validConds.length) {
      liveMatch.value = null
      return
    }
    liveMatchTimer = setTimeout(async () => {
      liveMatch.value = await store.previewRule({
        conditions: JSON.parse(JSON.stringify(validConds))
      })
    }, 350)
  },
  { deep: true }
)

const applyResult = ref(null)

async function applyRules(applyAll = false) {
  applyResult.value = null
  const result = applyAll ? await store.applyToAll() : await store.applyToMonth(currentMonth)
  if (result?.success) {
    applyResult.value = result.data
    await transactionsStore.fetchTransactionsByMonth(currentMonth)
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
  width: 480px;
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
