<template>
  <v-container fluid class="pa-6">
    <!-- Header -->
    <div class="d-flex flex-wrap align-start justify-space-between ga-4 mb-6">
      <div>
        <div class="text-h5 font-weight-bold">Monthly budget</div>
        <div class="text-body-2 text-medium-emphasis mt-1">
          Budgeted vs actual · {{ periodLabel }}
        </div>
      </div>
      <div class="d-flex align-center ga-3 flex-wrap">
        <div class="d-flex align-center">
          <v-btn
            icon="mdi-chevron-left"
            variant="text"
            density="compact"
            size="small"
            @click="prevPeriod"
          />
          <span class="text-body-2 font-weight-medium mx-2 text-no-wrap">{{ periodLabel }}</span>
          <v-btn
            icon="mdi-chevron-right"
            variant="text"
            density="compact"
            size="small"
            :disabled="isNextPeriodFuture"
            @click="nextPeriod"
          />
        </div>
        <v-btn-toggle
          v-model="period"
          mandatory
          density="compact"
          rounded="lg"
          variant="outlined"
          color="primary"
          divided
        >
          <v-btn value="month" size="small">Month</v-btn>
          <v-btn value="quarter" size="small">Quarter</v-btn>
          <v-btn value="semi" size="small">Semi</v-btn>
          <v-btn value="annual" size="small">Annual</v-btn>
        </v-btn-toggle>
        <v-btn
          color="primary"
          prepend-icon="mdi-content-copy"
          :loading="copying"
          @click="copyLastPeriod"
        >
          Copy last month
        </v-btn>
        <v-btn color="primary" prepend-icon="mdi-plus" @click="openAddTypeDialog"> Add type </v-btn>
      </div>
    </div>

    <v-alert
      v-if="loadError || budgetsStore.error || categoriesStore.error"
      type="error"
      variant="tonal"
      class="mb-5"
    >
      {{ loadError || budgetsStore.error || categoriesStore.error }}
    </v-alert>

    <!-- Summary cards -->
    <v-row class="mb-6">
      <v-col cols="12" md="4">
        <v-card rounded="lg" elevation="0" border>
          <v-card-text class="pa-5">
            <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis mb-2">
              Budgeted
            </div>
            <div class="text-h5 font-weight-bold">{{ formatCurrency(totalBudgeted) }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card rounded="lg" elevation="0" border>
          <v-card-text class="pa-5">
            <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis mb-2">
              Actual
            </div>
            <div class="text-h5 font-weight-bold">{{ formatCurrency(totalActual) }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card rounded="lg" elevation="0" border>
          <v-card-text class="pa-5">
            <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis mb-2">
              Remaining
            </div>
            <div
              class="text-h5 font-weight-bold"
              :class="totalRemaining >= 0 ? 'text-success' : 'text-error'"
            >
              {{ formatCurrency(totalRemaining) }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Budget sections -->
    <div class="d-flex flex-column ga-4">
      <div v-for="section in budgetSections" :key="section.type">
        <div class="d-flex align-center justify-space-between mb-2">
          <div class="text-caption font-weight-bold text-uppercase text-primary">
            {{ section.label }}
          </div>
          <v-btn
            size="x-small"
            variant="text"
            prepend-icon="mdi-plus"
            color="primary"
            @click="openAddCategoryDialog(section.type)"
          >
            Add category
          </v-btn>
        </div>
        <v-card rounded="lg" elevation="0" border>
          <v-table density="comfortable">
            <thead>
              <tr>
                <th class="text-start text-caption text-medium-emphasis pl-5" width="200">
                  Category
                </th>
                <th class="text-start text-caption text-medium-emphasis" width="170">Budgeted</th>
                <th class="text-start text-caption text-medium-emphasis" width="130">Actual</th>
                <th class="text-start text-caption text-medium-emphasis" width="120">Remaining</th>
                <th class="text-start text-caption text-medium-emphasis" width="220">Progress</th>
                <th width="88"></th>
              </tr>
            </thead>
            <tbody>
              <!-- Empty state -->
              <tr v-if="section.rows.length === 0 && addingType !== section.type">
                <td colspan="6" class="text-center text-caption text-medium-emphasis py-3">
                  No {{ section.label.toLowerCase() }} categories yet.
                </td>
              </tr>

              <!-- Category rows -->
              <tr v-for="row in section.rows" :key="row.id">
                <td
                  class="text-body-2 font-weight-medium pl-5 text-truncate"
                  style="max-width: 200px"
                >
                  {{ row.name }}
                </td>
                <td>
                  <v-text-field
                    :model-value="row.periodBudget > 0 ? row.periodBudget : ''"
                    type="number"
                    :prefix="userSettings.currencySymbol"
                    variant="outlined"
                    density="compact"
                    hide-details
                    @update:model-value="(v) => updateBudget(row.id, v)"
                  />
                </td>
                <td class="text-body-2">{{ formatCurrency(row.actual) }}</td>
                <td
                  class="text-body-2 font-weight-medium"
                  :class="row.remaining >= 0 ? 'text-success' : 'text-error'"
                >
                  {{ (row.remaining >= 0 ? '+' : '') + formatCurrency(row.remaining) }}
                </td>
                <td class="pr-5">
                  <v-progress-linear
                    :model-value="row.progress"
                    :color="row.over ? 'error' : 'primary'"
                    height="6"
                    rounded
                    bg-color="surface-variant"
                  />
                </td>
                <td class="pr-2">
                  <v-btn
                    icon="mdi-pencil-outline"
                    variant="text"
                    size="small"
                    density="compact"
                    :opacity="0.4"
                    @click="openEditCategory(row)"
                  />
                  <v-btn
                    icon="mdi-delete-outline"
                    variant="text"
                    size="small"
                    color="error"
                    density="compact"
                    :opacity="0.4"
                    @click="categoriesStore.deleteCategory(row.id)"
                  />
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </div>
    </div>

    <!-- Add type dialog -->
    <v-dialog v-model="addTypeDialog" max-width="360">
      <v-card rounded="lg">
        <v-card-title class="pa-5 pb-3 text-body-1 font-weight-bold">Add type</v-card-title>
        <v-card-text class="pa-5 pt-0">
          <v-text-field
            v-model="newTypeName"
            label="Name"
            variant="outlined"
            density="compact"
            hide-details
            autofocus
            @keyup.enter="saveNewType"
          />
        </v-card-text>
        <v-card-actions class="px-5 pb-5 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="addTypeDialog = false">Cancel</v-btn>
          <v-btn color="primary" variant="flat" :disabled="!newTypeName.trim()" @click="saveNewType"
            >Add</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Category dialog (add & edit) -->
    <v-dialog v-model="categoryDialog" max-width="360">
      <v-card rounded="lg">
        <v-card-title class="pa-5 pb-3 text-body-1">
          {{ categoryDialogTitle }}
        </v-card-title>
        <v-card-text class="pa-5 pt-0">
          <v-text-field
            v-model="categoryDialogName"
            label="Name"
            variant="outlined"
            density="compact"
            hide-details
            autofocus
            @keyup.enter="saveCategoryDialog"
          />
        </v-card-text>
        <v-card-actions class="px-5 pb-5 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="categoryDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :disabled="!categoryDialogName.trim()"
            @click="saveCategoryDialog"
            >{{ categoryDialogMode === 'edit' ? 'Save' : 'Add' }}</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :timeout="3000" location="bottom">
      {{ snackbarText }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { usePeriodFilter } from '../stores/usePeriodFilter'
import { useUserBudgetsStore } from '../stores/userBudgets'
import { useUserCategoriesStore } from '../stores/userCategories'
import { useUserSettingsStore } from '../stores/userSettings'

const budgetsStore = useUserBudgetsStore()
const categoriesStore = useUserCategoriesStore()
const userSettings = useUserSettingsStore()
const { formatCurrency } = userSettings
const ipc = window.electron?.ipcRenderer

// ── Period filter ─────────────────────────────────────────────────────────────
const _pf = usePeriodFilter()
const { period, periodStart, periodLength, periodMonths, periodLabel, isNextPeriodFuture } =
  storeToRefs(_pf)
const { prevPeriod, nextPeriod, offsetMonth } = _pf

// ── Transaction loading ───────────────────────────────────────────────────────
const transactions = ref([])
const loadError = ref(null)
const periodKey = computed(() => periodMonths.value.join(','))

async function loadPeriod() {
  loadError.value = null
  try {
    if (!ipc) throw new Error('Electron IPC is not available.')
    const results = await Promise.all(
      periodMonths.value.map((m) => ipc.invoke('transactions:fetch', { DTPOSTED: m }))
    )
    for (const r of results) {
      if (!r.success) throw new Error(r.error)
    }
    transactions.value = results.flatMap((r) => r.data ?? [])
  } catch (err) {
    loadError.value = err?.message ?? String(err)
  }
}

// ── Actuals ───────────────────────────────────────────────────────────────────
const incomeIds = computed(
  () => new Set(categoriesStore.categories.filter((c) => c.type === 'income').map((c) => c.id))
)

const actualsByCategory = computed(() => {
  const map = new Map()
  for (const t of transactions.value) {
    const trnAmt = Number(t.TRNAMT)
    const entries = [
      { id: t.category, amt: trnAmt },
      { id: t.splitCategory1, amt: Number(t.splitAmount1) || 0 },
      { id: t.splitCategory2, amt: Number(t.splitAmount2) || 0 }
    ]
    for (const { id, amt } of entries) {
      if (!id) continue
      if (incomeIds.value.has(id)) {
        if (amt > 0) map.set(id, (map.get(id) || 0) + amt)
      } else {
        if (amt < 0) map.set(id, (map.get(id) || 0) + Math.abs(amt))
      }
    }
  }
  return map
})

// ── Budget rows & sections ────────────────────────────────────────────────────
const TYPE_LABELS = {
  income: 'Income',
  bills: 'Bills',
  variable: 'Variable Expenses',
  savings: 'Savings'
}

const budgetRows = computed(() =>
  categoriesStore.categories.map((cat) => {
    const periodBudget = periodMonths.value.reduce(
      (sum, m) => sum + (budgetsStore.getBudget(cat.id, m)?.amount || 0),
      0
    )
    const actual = actualsByCategory.value.get(cat.id) || 0
    const remaining = periodBudget - actual
    const progress =
      periodBudget > 0 ? Math.min((actual / periodBudget) * 100, 100) : actual > 0 ? 100 : 0
    return {
      ...cat,
      periodBudget,
      actual,
      remaining,
      progress,
      over: actual > periodBudget && periodBudget > 0
    }
  })
)

const budgetSections = computed(() =>
  budgetsStore.types.map((type) => ({
    type,
    label: TYPE_LABELS[type] ?? type,
    rows: budgetRows.value
      .filter((r) => r.type === type)
      .sort((a, b) => a.name.localeCompare(b.name))
  }))
)

// ── Totals ────────────────────────────────────────────────────────────────────
const totalBudgeted = computed(() => budgetRows.value.reduce((sum, r) => sum + r.periodBudget, 0))
const totalActual = computed(() => budgetRows.value.reduce((sum, r) => sum + r.actual, 0))
const totalRemaining = computed(() => totalBudgeted.value - totalActual.value)

// ── Budget update ─────────────────────────────────────────────────────────────
async function updateBudget(categoryId, value) {
  const perMonth = (Number(value) || 0) / periodLength.value
  await Promise.all(
    periodMonths.value.map((m) => budgetsStore.upsertBudget(categoryId, perMonth, m))
  )
}

// ── Copy last period ──────────────────────────────────────────────────────────
const copying = ref(false)
const snackbar = ref(false)
const snackbarText = ref('')

async function copyLastPeriod() {
  copying.value = true
  try {
    if (!ipc) throw new Error('Electron IPC is not available.')
    const prevStart = offsetMonth(periodStart.value, -periodLength.value)
    const prevMonths = Array.from({ length: periodLength.value }, (_, i) =>
      offsetMonth(prevStart, i)
    )
    const results = await Promise.all(
      prevMonths.map((m) => ipc.invoke('transactions:fetch', { DTPOSTED: m }))
    )
    const prevTxs = results.filter((r) => r?.success).flatMap((r) => r.data ?? [])

    const prevActuals = new Map()
    for (const t of prevTxs) {
      const trnAmt = Number(t.TRNAMT)
      const entries = [
        { id: t.category, amt: trnAmt },
        { id: t.splitCategory1, amt: Number(t.splitAmount1) || 0 },
        { id: t.splitCategory2, amt: Number(t.splitAmount2) || 0 }
      ]
      for (const { id, amt } of entries) {
        if (!id) continue
        if (incomeIds.value.has(id)) {
          if (amt > 0) prevActuals.set(id, (prevActuals.get(id) || 0) + amt)
        } else {
          if (amt < 0) prevActuals.set(id, (prevActuals.get(id) || 0) + Math.abs(amt))
        }
      }
    }

    await Promise.all(
      [...prevActuals.entries()].flatMap(([id, total]) =>
        periodMonths.value.map((m) => budgetsStore.upsertBudget(id, total / periodLength.value, m))
      )
    )
    snackbarText.value = 'Budget copied from previous period'
    snackbar.value = true
  } catch (err) {
    snackbarText.value = err?.message ?? 'Failed to copy budget'
    snackbar.value = true
  } finally {
    copying.value = false
  }
}

// ── Add type ──────────────────────────────────────────────────────────────────
const addTypeDialog = ref(false)
const newTypeName = ref('')

function openAddTypeDialog() {
  newTypeName.value = ''
  addTypeDialog.value = true
}

async function saveNewType() {
  const name = newTypeName.value.trim()
  addTypeDialog.value = false
  newTypeName.value = ''
  if (!name) return
  await budgetsStore.addType(name)
}

// ── Category dialog (add & edit) ──────────────────────────────────────────────
const categoryDialog = ref(false)
const categoryDialogMode = ref('add')
const categoryDialogName = ref('')
const categoryDialogType = ref(null)
const categoryDialogId = ref(null)
const categoryDialogTitle = computed(() =>
  categoryDialogMode.value === 'edit'
    ? `Edit category for ${TYPE_LABELS[categoryDialogType.value] ?? categoryDialogType.value}`
    : `Add category for ${TYPE_LABELS[categoryDialogType.value] ?? categoryDialogType.value}`
)

function openAddCategoryDialog(type) {
  categoryDialogMode.value = 'add'
  categoryDialogType.value = type
  categoryDialogName.value = ''
  categoryDialog.value = true
}

function openEditCategory(row) {
  categoryDialogMode.value = 'edit'
  categoryDialogId.value = row.id
  categoryDialogName.value = row.name
  categoryDialog.value = true
}

async function saveCategoryDialog() {
  const name = categoryDialogName.value.trim()
  categoryDialog.value = false
  categoryDialogName.value = ''
  if (!name) return
  if (categoryDialogMode.value === 'edit') {
    await categoriesStore.updateCategory(categoryDialogId.value, { name })
  } else {
    await categoriesStore.addCategory({ type: categoryDialogType.value, name })
  }
}

// ── Init & watchers ───────────────────────────────────────────────────────────
onMounted(async () => {
  await Promise.all([categoriesStore.fetchCategories(), budgetsStore.fetchBudgets()])
  await loadPeriod()
})

watch(periodKey, loadPeriod)
</script>
