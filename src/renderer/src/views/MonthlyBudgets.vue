<template>
  <v-container fluid class="pa-6">
    <!-- Header -->
    <v-row align="start" justify="space-between" class="mb-6 mx-0 ga-4">
      <v-col cols="auto" class="pa-0">
        <p class="text-h5 font-weight-bold mb-1">Monthly budget</p>
        <p class="text-body-2 text-medium-emphasis mb-0">Budgeted vs actual · {{ periodLabel }}</p>
      </v-col>
      <v-col cols="auto" class="pa-0 d-flex align-center ga-3 flex-wrap">
        <FilterComponent />
        <v-btn
          color="primary"
          variant="flat"
          prepend-icon="mdi-content-copy"
          :loading="copying"
          @click="copyLastPeriod"
        >
          Copy last month
        </v-btn>
        <v-btn color="primary" prepend-icon="mdi-plus" @click="openAddTypeDialog"> Add type </v-btn>
      </v-col>
    </v-row>

    <v-alert
      v-if="loadError || budgetsStore.error || categoriesStore.error"
      type="error"
      variant="flat"
      class="mb-5"
    >
      {{ loadError || budgetsStore.error || categoriesStore.error }}
    </v-alert>

    <!-- Summary cards -->
    <v-row class="mb-6">
      <v-col cols="12" md="4">
        <v-card
          rounded="lg"
          elevation="0"
          variant="flat"
          border
          hover
          class="position-relative overflow-hidden"
        >
          <div class="sparkline-bg">
            <v-sparkline
              :fill="true"
              :gradient="gradient[1]"
              :line-width="1"
              :model-value="sparklineBudgeted"
              :color="sparklineLineColor"
              :padding="0"
              :smooth="16"
              auto-draw
            ></v-sparkline>
          </div>
          <v-card-text class="pa-5 stat-card-content">
            <v-row no-gutters align="center" justify="space-between" class="mb-4">
              <span class="text-caption font-weight-bold text-uppercase text-medium-emphasis"
                >Budgeted</span
              >
              <v-avatar color="primary" variant="flat" size="38" rounded="lg">
                <v-icon size="20">mdi-clipboard-text-outline</v-icon>
              </v-avatar>
            </v-row>
            <div class="text-h4 font-weight-black mb-1">{{ formatCurrency(totalBudgeted) }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card
          rounded="lg"
          elevation="0"
          variant="flat"
          border
          hover
          class="position-relative overflow-hidden"
        >
          <div class="sparkline-bg">
            <v-sparkline
              :fill="true"
              :gradient="gradient[0]"
              :line-width="1"
              :model-value="sparklineActual"
              :color="sparklineLineColor"
              :padding="0"
              :smooth="16"
              auto-draw
            ></v-sparkline>
          </div>
          <v-card-text class="pa-5 stat-card-content">
            <v-row no-gutters align="center" justify="space-between" class="mb-4">
              <span class="text-caption font-weight-bold text-uppercase text-medium-emphasis"
                >Actual</span
              >
              <v-avatar color="secondary" variant="flat" size="38" rounded="lg">
                <v-icon size="20">mdi-currency-usd</v-icon>
              </v-avatar>
            </v-row>
            <div class="text-h4 font-weight-black mb-1">{{ formatCurrency(totalActual) }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card
          rounded="lg"
          elevation="0"
          variant="flat"
          border
          hover
          class="position-relative overflow-hidden"
        >
          <div class="sparkline-bg">
            <v-sparkline
              :fill="true"
              :gradient="gradient[2]"
              :line-width="1"
              :model-value="sparklineRemaining"
              :color="sparklineLineColor"
              :padding="0"
              :smooth="16"
              auto-draw
            ></v-sparkline>
          </div>
          <v-card-text class="pa-5 stat-card-content">
            <v-row no-gutters align="center" justify="space-between" class="mb-4">
              <span class="text-caption font-weight-bold text-uppercase text-medium-emphasis"
                >Remaining</span
              >
              <v-avatar
                :color="totalRemaining >= 0 ? 'success' : 'error'"
                variant="flat"
                size="38"
                rounded="lg"
              >
                <v-icon size="20">mdi-scale-balance</v-icon>
              </v-avatar>
            </v-row>
            <div
              class="text-h4 font-weight-black mb-1"
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
              <tr v-if="section.rows.length === 0">
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
                    variant="solo-filled"
                    rounded="lg"
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
    <v-dialog v-model="addTypeDialog" max-width="400">
      <v-card rounded="lg">
        <v-card-title class="pa-6 pb-4">
          <div class="d-flex align-center justify-space-between">
            <div class="d-flex align-center ga-3">
              <v-icon color="primary" size="20">mdi-shape-plus-outline</v-icon>
              <span class="text-h6 font-weight-bold">Add type</span>
            </div>
            <v-btn
              icon="mdi-close"
              variant="text"
              density="compact"
              @click="addTypeDialog = false"
            />
          </div>
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-6">
          <v-text-field
            v-model="newTypeName"
            label="Name"
            variant="solo-filled"
            density="comfortable"
            rounded="lg"
            color="primary"
            hide-details
            autofocus
            @keyup.enter="saveNewType"
          />
        </v-card-text>
        <v-card-actions class="pa-6 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="addTypeDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            rounded="lg"
            :disabled="!newTypeName?.trim()"
            @click="saveNewType"
            >Add</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Category dialog (add & edit) -->
    <v-dialog v-model="categoryDialog" max-width="400">
      <v-card rounded="lg">
        <v-card-title class="pa-6 pb-4">
          <div class="d-flex align-center justify-space-between">
            <div class="d-flex align-center ga-3">
              <v-icon color="primary" size="20">mdi-tag-outline</v-icon>
              <span class="text-h6 font-weight-bold">{{ categoryDialogTitle }}</span>
            </div>
            <v-btn
              icon="mdi-close"
              variant="text"
              density="compact"
              @click="categoryDialog = false"
            />
          </div>
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-6">
          <v-text-field
            v-model="categoryDialogName"
            label="Name"
            variant="solo-filled"
            density="comfortable"
            rounded="lg"
            color="primary"
            hide-details
            autofocus
            @keyup.enter="saveCategoryDialog"
          />
        </v-card-text>
        <v-card-actions class="pa-6 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="categoryDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            rounded="lg"
            :disabled="!categoryDialogName?.trim()"
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
import FilterComponent from '../components/filterComponent.vue'
import { usePeriodFilter } from '../stores/usePeriodFilter'
import { useUserBudgetsStore } from '../stores/userBudgets'
import { useUserCategoriesStore } from '../stores/userCategories'
import { useUserSettingsStore } from '../stores/userSettings'
import { useTheme } from 'vuetify'

const theme = useTheme()

const budgetsStore = useUserBudgetsStore()
const categoriesStore = useUserCategoriesStore()
const userSettings = useUserSettingsStore()
const { formatCurrency } = userSettings
const ipc = window.electron?.ipcRenderer

// ── Period filter ─────────────────────────────────────────────────────────────
const _pf = usePeriodFilter()
const { periodStart, periodLength, periodMonths, periodLabel } = storeToRefs(_pf)
const { offsetMonth } = _pf

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
    const entries = t.splitCategory2
      ? [
          { id: t.category, amt: Number(t.splitAmount1) || 0 },
          { id: t.splitCategory2, amt: Number(t.splitAmount2) || 0 }
        ]
      : [{ id: t.category, amt: trnAmt }]
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

// ── Sparklines ────────────────────────────────────────────────────────────────
const sparklineLineColor = computed(() => (theme.current.value.dark ? 'white' : 'black'))
const gradient = [
  [theme.current.value.colors.primary, theme.current.value.colors['primary-container']],
  [theme.current.value.colors.success, theme.current.value.colors['success-container']],
  [theme.current.value.colors.info, theme.current.value.colors['info-container']],
  [theme.current.value.colors.secondary, theme.current.value.colors['secondary-container']]
]

const ensureVariance = (data) => {
  if (!data || data.length <= 1) return [0, 1]
  const min = Math.min(...data)
  const max = Math.max(...data)
  if (min === max) {
    const arr = [...data]
    arr[0] = min - (min === 0 ? 1 : Math.abs(min * 0.01))
    arr[arr.length - 1] = max + (max === 0 ? 1 : Math.abs(max * 0.01))
    return arr
  }
  return data
}

const periodBounds = computed(() => {
  const lastMonth = periodMonths.value[periodMonths.value.length - 1]
  const sy = parseInt(periodStart.value.slice(0, 4))
  const sm = parseInt(periodStart.value.slice(4, 6)) - 1
  const ey = parseInt(lastMonth.slice(0, 4))
  const em = parseInt(lastMonth.slice(4, 6)) - 1
  return { start: new Date(sy, sm, 1), end: new Date(ey, em + 1, 0, 23, 59, 59, 999) }
})

const chartData = computed(() => {
  const points = []

  if (periodMonths.value.length > 1) {
    for (const m of periodMonths.value) {
      points.push({ key: m, budgeted: 0, actual: 0 })
    }

    for (const p of points) {
      p.budgeted = categoriesStore.categories.reduce(
        (sum, c) => sum + (budgetsStore.getBudget(c.id, p.key)?.amount || 0),
        0
      )
    }

    for (const t of transactions.value) {
      const s = String(t.DTPOSTED || '')
      if (s.length >= 6) {
        const monthKey = s.slice(0, 6)
        const p = points.find((pt) => pt.key === monthKey)
        if (p) {
          const trnAmt = Number(t.TRNAMT)
          const entries = t.splitCategory2
            ? [
                { id: t.category, amt: Number(t.splitAmount1) || 0 },
                { id: t.splitCategory2, amt: Number(t.splitAmount2) || 0 }
              ]
            : [{ id: t.category, amt: trnAmt }]
          for (const { id, amt } of entries) {
            if (!id) continue
            if (incomeIds.value.has(id)) {
              if (amt > 0) p.actual += amt
            } else {
              if (amt < 0) p.actual += Math.abs(amt)
            }
          }
        }
      }
    }
  } else {
    const { start, end } = periodBounds.value
    let current = new Date(start)
    while (current <= end) {
      points.push({
        date: new Date(current),
        actual: 0
      })
      current.setDate(current.getDate() + 1)
    }

    for (const t of transactions.value) {
      const s = String(t.DTPOSTED || '')
      if (s.length >= 8) {
        const tDate = new Date(
          parseInt(s.slice(0, 4)),
          parseInt(s.slice(4, 6)) - 1,
          parseInt(s.slice(6, 8))
        )
        const dayIndex = points.findIndex(
          (d) =>
            d.date &&
            d.date.getFullYear() === tDate.getFullYear() &&
            d.date.getMonth() === tDate.getMonth() &&
            d.date.getDate() === tDate.getDate()
        )
        if (dayIndex !== -1) {
          const p = points[dayIndex]
          const trnAmt = Number(t.TRNAMT)
          const entries = t.splitCategory2
            ? [
                { id: t.category, amt: Number(t.splitAmount1) || 0 },
                { id: t.splitCategory2, amt: Number(t.splitAmount2) || 0 }
              ]
            : [{ id: t.category, amt: trnAmt }]
          for (const { id, amt } of entries) {
            if (!id) continue
            if (incomeIds.value.has(id)) {
              if (amt > 0) p.actual += amt
            } else {
              if (amt < 0) p.actual += Math.abs(amt)
            }
          }
        }
      }
    }
  }
  return points
})

const sparklineBudgeted = computed(() => {
  if (periodMonths.value.length > 1) {
    return ensureVariance(chartData.value.map((d) => d.budgeted))
  }
  const arr = Array(chartData.value.length).fill(totalBudgeted.value)
  return ensureVariance(arr)
})

const sparklineActual = computed(() => {
  let running = 0
  const data = chartData.value.map((d) => {
    running += d.actual
    return periodMonths.value.length > 1 ? d.actual : running
  })
  return ensureVariance(data)
})

const sparklineRemaining = computed(() => {
  if (periodMonths.value.length > 1) {
    return ensureVariance(chartData.value.map((d) => d.budgeted - d.actual))
  }
  let runningActual = 0
  const data = chartData.value.map((d) => {
    runningActual += d.actual
    return totalBudgeted.value - runningActual
  })
  return ensureVariance(data)
})

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
      const entries = t.splitCategory2
        ? [
            { id: t.category, amt: Number(t.splitAmount1) || 0 },
            { id: t.splitCategory2, amt: Number(t.splitAmount2) || 0 }
          ]
        : [{ id: t.category, amt: trnAmt }]
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
  categoryDialogType.value = row.type
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
