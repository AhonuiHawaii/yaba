<template>
  <v-container fluid class="pa-6">
    <!-- Header -->
    <div class="d-flex flex-wrap align-start justify-space-between gap-4 mb-6">
      <div>
        <div class="text-h5 font-weight-bold">Monthly budget</div>
        <div class="text-body-2 text-medium-emphasis mt-1">
          Budgeted vs actual · {{ periodLabel }}
        </div>
      </div>
      <div class="d-flex align-center gap-3 flex-wrap">
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
          divided
        >
          <v-btn value="month" size="small">Month</v-btn>
          <v-btn value="quarter" size="small">Quarter</v-btn>
          <v-btn value="semi" size="small">Semi</v-btn>
          <v-btn value="annual" size="small">Annual</v-btn>
        </v-btn-toggle>
        <v-btn
          variant="outlined"
          size="small"
          density="comfortable"
          prepend-icon="mdi-content-copy"
          :loading="copying"
          @click="copyLastPeriod"
        >
          Copy last month
        </v-btn>
        <v-btn
          color="primary"
          size="small"
          density="comfortable"
          prepend-icon="mdi-plus"
          @click="openAddCategoryDialog"
        >
          Add category
        </v-btn>
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

    <!-- Budget table -->
    <v-card rounded="lg" elevation="0" border>
      <v-table density="comfortable">
        <thead>
          <tr>
            <th class="text-start text-caption text-medium-emphasis" style="padding-left: 20px">
              Category
            </th>
            <th class="text-start text-caption text-medium-emphasis" style="width: 170px">
              Budgeted
            </th>
            <th class="text-start text-caption text-medium-emphasis" style="width: 130px">
              Actual
            </th>
            <th class="text-start text-caption text-medium-emphasis" style="width: 120px">
              Remaining
            </th>
            <th class="text-start text-caption text-medium-emphasis" style="width: 220px">
              Progress
            </th>
            <th style="width: 44px"></th>
          </tr>
        </thead>
        <tbody>
          <template v-for="section in budgetSections" :key="section.type">
            <!-- Section header row -->
            <tr>
              <td
                colspan="6"
                class="py-2"
                style="padding-left: 20px; border-bottom: none; background: transparent"
              >
                <span
                  class="text-caption font-weight-bold text-uppercase text-primary"
                  style="letter-spacing: 0.1em"
                >
                  {{ section.label }}
                </span>
              </td>
            </tr>

            <!-- Empty state -->
            <tr v-if="section.rows.length === 0 && addingType !== section.type">
              <td colspan="6" class="text-center text-caption text-medium-emphasis py-3">
                No {{ section.label.toLowerCase() }} categories yet.
              </td>
            </tr>

            <!-- Category rows -->
            <tr v-for="row in section.rows" :key="row.id">
              <td class="text-body-2 font-weight-medium" style="padding-left: 20px">
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
                  style="max-width: 130px"
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
              <td style="padding-right: 20px">
                <v-progress-linear
                  :model-value="row.progress"
                  :color="row.over ? 'error' : 'primary'"
                  height="6"
                  rounded
                  bg-color="rgba(0,0,0,0.07)"
                />
              </td>
              <td class="pr-2">
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

            <!-- Inline add row -->
            <tr v-if="addingType === section.type">
              <td colspan="6" class="py-1" style="padding-left: 16px">
                <v-text-field
                  v-model="newCategoryName"
                  placeholder="Category name"
                  variant="outlined"
                  density="compact"
                  hide-details
                  autofocus
                  style="max-width: 280px"
                  @keyup.enter="saveNewCategory(section.type)"
                  @keyup.esc="cancelNewCategory"
                  @blur="saveNewCategory(section.type)"
                />
              </td>
            </tr>

            <!-- Section divider -->
            <tr>
              <td colspan="6" class="pa-0"><v-divider /></td>
            </tr>
          </template>
        </tbody>
      </v-table>
    </v-card>

    <!-- Add category dialog -->
    <v-dialog v-model="addCategoryDialog" max-width="360">
      <v-card rounded="lg">
        <v-card-title class="pa-5 pb-3 text-body-1 font-weight-bold">Add category</v-card-title>
        <v-card-text class="pa-5 pt-0 d-flex flex-column gap-3">
          <v-select
            v-model="addCategoryType"
            :items="SECTION_TYPES"
            item-title="label"
            item-value="type"
            label="Section"
            variant="outlined"
            density="compact"
            hide-details
          />
          <v-text-field
            v-model="newCategoryName"
            label="Name"
            variant="outlined"
            density="compact"
            hide-details
            autofocus
            @keyup.enter="saveNewCategoryFromDialog"
          />
        </v-card-text>
        <v-card-actions class="px-5 pb-5 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="addCategoryDialog = false">Cancel</v-btn>
          <v-btn color="primary" variant="flat" @click="saveNewCategoryFromDialog">Add</v-btn>
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
const {
  period,
  periodStart,
  periodLength,
  periodMonths,
  periodLabel,
  isNextPeriodFuture,
  prevPeriod,
  nextPeriod,
  offsetMonth
} = usePeriodFilter('month')

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
const SECTION_TYPES = [
  { type: 'income', label: 'Income' },
  { type: 'bills', label: 'Bills' },
  { type: 'variable', label: 'Variable Expenses' },
  { type: 'savings', label: 'Savings' }
]

const budgetRows = computed(() =>
  categoriesStore.categories.map((cat) => {
    const monthlyBudget = budgetsStore.getBudget(cat.id)?.amount || 0
    const periodBudget = monthlyBudget * periodLength.value
    const actual = actualsByCategory.value.get(cat.id) || 0
    const remaining = periodBudget - actual
    const progress =
      periodBudget > 0 ? Math.min((actual / periodBudget) * 100, 100) : actual > 0 ? 100 : 0
    return {
      ...cat,
      monthlyBudget,
      periodBudget,
      actual,
      remaining,
      progress,
      over: actual > periodBudget && periodBudget > 0
    }
  })
)

const budgetSections = computed(() =>
  SECTION_TYPES.map((s) => ({
    ...s,
    rows: budgetRows.value
      .filter((r) => r.type === s.type)
      .sort((a, b) => a.name.localeCompare(b.name))
  }))
)

// ── Totals ────────────────────────────────────────────────────────────────────
const totalBudgeted = computed(() => budgetRows.value.reduce((sum, r) => sum + r.periodBudget, 0))
const totalActual = computed(() => budgetRows.value.reduce((sum, r) => sum + r.actual, 0))
const totalRemaining = computed(() => totalBudgeted.value - totalActual.value)

// ── Budget update ─────────────────────────────────────────────────────────────
async function updateBudget(categoryId, value) {
  const monthlyAmount = (Number(value) || 0) / periodLength.value
  await budgetsStore.upsertBudget(categoryId, monthlyAmount)
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
      [...prevActuals.entries()].map(([id, total]) =>
        budgetsStore.upsertBudget(id, total / periodLength.value)
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

// ── Add category ──────────────────────────────────────────────────────────────
const addingType = ref(null)
const newCategoryName = ref('')
const addCategoryDialog = ref(false)
const addCategoryType = ref('variable')

function openAddCategoryDialog() {
  newCategoryName.value = ''
  addCategoryType.value = 'variable'
  addCategoryDialog.value = true
}

async function saveNewCategoryFromDialog() {
  const name = newCategoryName.value.trim()
  addCategoryDialog.value = false
  newCategoryName.value = ''
  if (!name) return
  await categoriesStore.addCategory({ type: addCategoryType.value, name })
}

async function saveNewCategory(type) {
  const name = newCategoryName.value.trim()
  addingType.value = null
  newCategoryName.value = ''
  if (!name) return
  await categoriesStore.addCategory({ type, name })
}

function cancelNewCategory() {
  addingType.value = null
  newCategoryName.value = ''
}

// ── Init & watchers ───────────────────────────────────────────────────────────
onMounted(async () => {
  await Promise.all([categoriesStore.fetchCategories(), budgetsStore.fetchBudgets()])
  await loadPeriod()
})

watch(periodKey, loadPeriod)
</script>
