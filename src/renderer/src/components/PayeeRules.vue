<template>
  <v-container class="pa-6" style="max-width: 1100px">
    <div class="d-flex align-center justify-space-between mb-4">
      <div>
        <div class="text-h6 font-weight-bold">Payee Rules</div>
        <div class="text-body-2 text-medium-emphasis">
          Payee Rules for auto-categorizing transactions
        </div>
      </div>
      <div class="d-flex align-center gap-3">
        <v-btn-group variant="outlined" color="primary" rounded="lg" density="comfortable">
          <v-btn prepend-icon="mdi-play-outline" @click="applyRules(false)"
            >Apply to this month</v-btn
          >
          <v-btn prepend-icon="mdi-play-circle-outline" @click="applyRules(true)"
            >Apply to all</v-btn
          >
          <v-btn prepend-icon="mdi-import" :loading="importing" @click="importAll"
            >Import from rules</v-btn
          >
        </v-btn-group>
        <v-btn variant="flat" color="primary" prepend-icon="mdi-plus" @click="openAdd" class="ml-6"
          >New category</v-btn
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

    <!-- Empty State -->
    <v-card v-if="store.groups.length === 0" rounded="lg" elevation="0" border>
      <v-card-text class="pa-12 text-center">
        <v-icon size="60" class="mb-4 text-disabled">mdi-tag-multiple-outline</v-icon>
        <div class="text-h6 font-weight-medium mb-2">No payee rules yet</div>
        <div class="text-body-2 text-medium-emphasis">
          Add a category with keywords to auto-categorize transactions on import.
        </div>
      </v-card-text>
    </v-card>

    <!-- Table -->
    <v-card v-else rounded="lg" elevation="0" border class="mb-4">
      <v-data-table
        :headers="headers"
        :items="store.groups"
        density="comfortable"
        :items-per-page="-1"
        hide-default-footer
        hover
      >
        <template #item.label="{ item }">
          <span class="text-body-2 font-weight-medium">{{ item.label }}</span>
        </template>

        <template #item.type="{ item }">
          <v-chip size="x-small" variant="tonal" rounded="pill">{{
            sectionLabel(item.type)
          }}</v-chip>
        </template>

        <template #item.rules="{ item }">
          <div class="d-flex flex-wrap ga-1">
            <v-chip
              v-for="r in item.rules"
              :key="r"
              size="x-small"
              variant="tonal"
              rounded="sm"
              class="font-weight-bold text-uppercase"
              >{{ r }}</v-chip
            >
            <span v-if="!item.rules.length" class="text-body-2 text-medium-emphasis">—</span>
          </div>
        </template>

        <template #item.categoryId="{ item }">
          <v-chip
            v-if="categoryName(item.categoryId)"
            size="x-small"
            variant="tonal"
            color="primary"
            rounded="pill"
          >
            {{ categoryName(item.categoryId) }}
          </v-chip>
          <span v-else class="text-body-2 text-medium-emphasis">—</span>
        </template>

        <template #item.amount="{ item }">
          <span class="text-body-2">${{ item.amount }}/mo</span>
        </template>

        <template #item.actions="{ item }">
          <div class="d-flex align-center justify-end ga-1">
            <v-btn
              icon="mdi-pencil-outline"
              variant="text"
              size="small"
              density="compact"
              @click="openEdit(item)"
            />
            <v-btn
              icon="mdi-delete-outline"
              variant="text"
              size="small"
              color="error"
              density="compact"
              @click="store.deleteGroup(item.id)"
            />
          </div>
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
      When a rule matches a new import, the category is applied automatically.
    </v-alert>

    <!-- Add / Edit Dialog -->
    <v-dialog v-model="addDialog" max-width="980">
      <v-card rounded="sm" class="dialog-card">
        <v-card-title class="pa-5 pb-3 text-body-1 font-weight-bold">{{
          editingId ? 'Edit category' : 'New category'
        }}</v-card-title>
        <v-divider />
        <div class="d-flex dialog-body">
          <!-- Left: form -->
          <div style="flex: 1; min-width: 0">
            <v-card-text class="pa-5">
              <div class="form-row mb-3">
                <label>Category</label>
                <v-autocomplete
                  v-model="form.categoryId"
                  :items="categoryItems"
                  item-title="name"
                  item-value="id"
                  placeholder="Pick existing or leave blank"
                  variant="outlined"
                  density="compact"
                  rounded="sm"
                  hide-details
                  clearable
                  color="primary"
                  @update:model-value="onCategoryPicked"
                />
              </div>
              <div class="form-row mb-3">
                <label>Name</label>
                <v-text-field
                  v-model="form.label"
                  variant="outlined"
                  density="compact"
                  rounded="sm"
                  autofocus
                  hide-details
                  color="primary"
                />
              </div>
              <div class="form-row mb-3">
                <label>Section</label>
                <v-select
                  v-model="form.type"
                  :items="typeItems"
                  variant="outlined"
                  density="compact"
                  rounded="sm"
                  hide-details
                  color="primary"
                />
              </div>
              <div class="form-row mb-3">
                <label>Monthly amount</label>
                <v-text-field
                  v-model="form.amount"
                  type="number"
                  prefix="$"
                  variant="outlined"
                  density="compact"
                  rounded="sm"
                  hide-details
                  color="primary"
                />
              </div>
              <div class="form-row">
                <label>Keywords</label>
                <v-text-field
                  v-model="form.rulesRaw"
                  placeholder="e.g. NETFLIX, SPOTIFY"
                  variant="outlined"
                  density="compact"
                  rounded="sm"
                  hide-details
                  color="primary"
                />
              </div>
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
              {{ liveMatch ? 'No transactions match.' : 'Type keywords to\npreview results.' }}
            </div>
          </div>
        </div>

        <v-divider />
        <v-card-actions class="pa-5 py-4">
          <v-spacer />
          <v-btn variant="text" rounded="sm" @click="addDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            rounded="sm"
            :disabled="!form.label.trim()"
            @click="save"
            >{{ editingId ? 'Save' : 'Create' }}</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useUserBudgetsRulesStore } from '../stores/userBudgetsRules'
import { useUserCategoriesStore } from '../stores/userCategories'
import { useUserRulesStore } from '../stores/userRules'
import { useUserTransactionsStore } from '../stores/userTransactions'
import { usePeriodFilter } from '../stores/usePeriodFilter'

const store = useUserBudgetsRulesStore()
const categoriesStore = useUserCategoriesStore()
const rulesStore = useUserRulesStore()
const transactionsStore = useUserTransactionsStore()
const _pf = usePeriodFilter()

const currentMonth = _pf.currentMonthValue()

const categoryItems = computed(() => categoriesStore.categories)

const categoryById = computed(() =>
  Object.fromEntries(categoriesStore.categories.map((c) => [c.id, c.name]))
)

function categoryName(id) {
  return id ? (categoryById.value[id] ?? null) : null
}

function onCategoryPicked(id) {
  if (!id) return
  const cat = categoriesStore.categories.find((c) => c.id === id)
  if (!cat) return
  form.value.label = cat.name
  form.value.type = cat.type
}

const SECTION_LABELS = { variable: 'Spending', bills: 'Bills', income: 'Income' }
function sectionLabel(type) {
  return SECTION_LABELS[type] ?? type
}

const headers = [
  { title: 'Name', key: 'label', sortable: false },
  { title: 'Category', key: 'categoryId', width: '160px', sortable: false },
  { title: 'Section', key: 'type', width: '130px', sortable: false },
  { title: 'Keywords', key: 'rules', sortable: false },
  { title: 'Amount', key: 'amount', width: '120px', sortable: false },
  { title: '', key: 'actions', width: '90px', sortable: false, align: 'end' }
]

const typeItems = [
  { title: 'Variable Expenses', value: 'variable' },
  { title: 'Bills', value: 'bills' },
  { title: 'Income', value: 'income' }
]

const addDialog = ref(false)
const editingId = ref(null)
const form = ref({ label: '', type: 'variable', amount: 0, rulesRaw: '', categoryId: null })

// ── Apply rules ───────────────────────────────────────────────────────────────
const applyResult = ref(null)

async function applyRules(applyAll = false) {
  applyResult.value = null
  const catNames = categoryById.value
  const result = applyAll
    ? await rulesStore.applyToAll(catNames)
    : await rulesStore.applyToMonth(currentMonth, catNames)
  if (result?.success) {
    applyResult.value = result.data
    if (!applyAll) await transactionsStore.fetchTransactionsByMonth(currentMonth)
  }
}

// ── Import from Rules ─────────────────────────────────────────────────────────
const importing = ref(false)
const COMPATIBLE_OPERATORS = new Set(['contains', 'startsWith', 'equals', 'wholeWord'])

function isAlreadyImported(rule) {
  return store.groups.some((g) =>
    g.rules.some((kw) => kw.toLowerCase() === (rule.value || '').toLowerCase())
  )
}

async function importAll() {
  importing.value = true
  try {
    await rulesStore.fetchRules()
    const toImport = (rulesStore.rules || []).filter(
      (r) => COMPATIBLE_OPERATORS.has(r.operator) && r.value && !isAlreadyImported(r)
    )
    for (const r of toImport) {
      const cat = categoriesStore.categories.find(
        (c) => c.id === r.category || c.name === r.category
      )
      await store.addGroup({
        label: r.value,
        type: cat?.type ?? 'variable',
        rules: [r.value],
        amount: 0,
        categoryId: cat?.id ?? null
      })
    }
  } finally {
    importing.value = false
  }
}

function openAdd() {
  editingId.value = null
  form.value = { label: '', type: 'variable', amount: 0, rulesRaw: '', categoryId: null }
  liveMatch.value = null
  addDialog.value = true
}

function openEdit(g) {
  editingId.value = g.id
  form.value = {
    label: g.label,
    type: g.type,
    amount: g.amount,
    rulesRaw: g.rules.join(', '),
    categoryId: g.categoryId ?? null
  }
  liveMatch.value = null
  addDialog.value = true
}

async function save() {
  const label = form.value.label.trim()
  if (!label) return
  const rules = form.value.rulesRaw
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean)
  const payload = {
    type: form.value.type,
    label,
    rules,
    amount: Number(form.value.amount) || 0,
    categoryId: form.value.categoryId || null
  }
  if (editingId.value) {
    await store.updateGroup(editingId.value, payload)
  } else {
    await store.addGroup(payload)
  }
  addDialog.value = false
}

// Live matching
const liveMatch = ref(null)
let liveMatchTimer = null

watch(
  () => form.value.rulesRaw,
  (raw) => {
    clearTimeout(liveMatchTimer)
    const keywords = raw
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean)
    if (!keywords.length) {
      liveMatch.value = null
      return
    }
    liveMatchTimer = setTimeout(async () => {
      liveMatch.value = await rulesStore.previewKeywords(keywords)
    }, 350)
  }
)



onMounted(() => store.fetchGroups())
</script>

<style scoped>
.form-row {
  display: grid;
  grid-template-columns: 120px 1fr;
  align-items: center;
  gap: 12px;
}

.form-row label {
  font-size: 0.875rem;
  text-align: right;
  white-space: nowrap;
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
  width: 560px;
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
