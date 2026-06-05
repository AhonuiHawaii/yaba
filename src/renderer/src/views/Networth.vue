<template>
  <v-container fluid class="pa-6">
    <!-- Header -->
    <v-row align="start" justify="space-between" class="mb-6 mx-0 ga-4">
      <v-col cols="auto" class="pa-0">
        <div class="text-h5 font-weight-bold mb-1">Net worth</div>
        <div class="text-body-2 text-medium-emphasis mb-0">
          Assets minus debts · {{ periodLabel }}
        </div>
      </v-col>
      <v-col cols="auto" class="pa-0">
        <FilterComponent />
      </v-col>
    </v-row>

    <v-alert v-if="reportError" type="error" variant="flat" class="mb-5 rounded-xl border">
      {{ reportError }}
    </v-alert>

    <!-- Stat cards -->
    <v-row class="mb-5">
      <v-col cols="12" sm="6" lg="3">
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
              :model-value="sparklineAssets"
              :color="sparklineLineColor"
              :padding="0"
              :smooth="16"
              auto-draw
            ></v-sparkline>
          </div>
          <v-card-text class="pa-5 stat-card-content">
            <v-row no-gutters align="center" justify="space-between" class="mb-4">
              <span class="text-caption font-weight-bold text-uppercase text-medium-emphasis"
                >Assets</span
              >
              <v-avatar color="success" variant="flat" size="38" rounded="lg">
                <v-icon size="20">mdi-bank</v-icon>
              </v-avatar>
            </v-row>
            <div class="text-h4 font-weight-black text-success mb-1">
              {{ formatCurrency(displayAssets) }}
            </div>
            <div class="text-caption text-medium-emphasis d-flex align-center ga-1 mb-0 mt-2">
              <v-icon size="14">mdi-information-outline</v-icon>
              <span>Total owned</span>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" lg="3">
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
              :model-value="sparklineLiabilities"
              :color="sparklineLineColor"
              :padding="0"
              :smooth="16"
              auto-draw
            ></v-sparkline>
          </div>
          <v-card-text class="pa-5 stat-card-content">
            <v-row no-gutters align="center" justify="space-between" class="mb-4">
              <span class="text-caption font-weight-bold text-uppercase text-medium-emphasis"
                >Debts</span
              >
              <v-avatar color="error" variant="flat" size="38" rounded="lg">
                <v-icon size="20">mdi-credit-card-outline</v-icon>
              </v-avatar>
            </v-row>
            <div class="text-h4 font-weight-black text-error mb-1">
              {{ formatCurrency(displayLiabilities) }}
            </div>
            <div class="text-caption text-medium-emphasis d-flex align-center ga-1 mb-0 mt-2">
              <v-icon size="14">mdi-information-outline</v-icon>
              <span>Total owed</span>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" lg="3">
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
              :model-value="sparklineNetWorth"
              :color="sparklineLineColor"
              :padding="0"
              :smooth="16"
              auto-draw
            ></v-sparkline>
          </div>
          <v-card-text class="pa-5 stat-card-content">
            <v-row no-gutters align="center" justify="space-between" class="mb-4">
              <span class="text-caption font-weight-bold text-uppercase text-medium-emphasis"
                >Net Worth</span
              >
              <v-avatar color="primary" variant="flat" size="38" rounded="lg">
                <v-icon size="20">mdi-scale-balance</v-icon>
              </v-avatar>
            </v-row>
            <div class="text-h4 font-weight-black mb-1">
              {{ formatCurrency(displayNetWorth) }}
            </div>
            <div class="text-caption text-medium-emphasis d-flex align-center ga-1 mb-0 mt-2">
              <v-icon size="14">mdi-information-outline</v-icon>
              <span>Assets minus debts</span>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" lg="3">
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
              :gradient="gradient[3]"
              :line-width="1"
              :model-value="sparklinePeriodChange"
              :color="sparklineLineColor"
              :padding="0"
              :smooth="16"
              auto-draw
            ></v-sparkline>
          </div>
          <v-card-text class="pa-5 stat-card-content">
            <v-row no-gutters align="center" justify="space-between" class="mb-4">
              <span class="text-caption font-weight-bold text-uppercase text-medium-emphasis"
                >Period Change</span
              >
              <v-avatar color="secondary" variant="flat" size="38" rounded="lg">
                <v-icon size="20">mdi-trending-up</v-icon>
              </v-avatar>
            </v-row>
            <div class="text-h4 font-weight-black mb-1">
              <span :class="periodChange >= 0 ? 'text-success' : 'text-error'">
                {{ periodChange >= 0 ? '+' : '-' }}{{ formatCurrency(Math.abs(periodChange)) }}
              </span>
            </div>
            <div class="text-caption text-medium-emphasis d-flex align-center ga-1 mb-0 mt-2">
              <v-icon size="16" :color="periodChange >= 0 ? 'success' : 'error'">
                {{ periodChange >= 0 ? 'mdi-trending-up' : 'mdi-trending-down' }}
              </v-icon>
              <span>during {{ periodLabel }}</span>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Main Trend Chart -->
    <v-row class="mb-5">
      <v-col cols="12">
        <v-card
          rounded="lg"
          elevation="0"
          variant="flat"
          border
          hover
          class="h-100 d-flex flex-column"
          min-height="350"
        >
          <v-card-item class="pa-5 pb-0">
            <v-card-title class="text-body-1 font-weight-bold">Net Worth Trend</v-card-title>
            <template #append>
              <v-chip size="x-small" variant="flat" class="font-weight-medium" color="primary">{{
                trendChipLabel
              }}</v-chip>
            </template>
          </v-card-item>
          <div class="pa-5 flex-grow-1 chart-area">
            <Line
              v-if="filteredChartData.labels.length > 0"
              :data="filteredChartData"
              :options="lineChartOptions"
            />
            <div
              v-else
              class="d-flex align-center justify-center h-100 text-medium-emphasis text-body-2"
            >
              No history yet
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Allocation Charts -->
    <v-row class="mb-5">
      <v-col cols="12" md="6">
        <v-card
          rounded="lg"
          elevation="0"
          variant="flat"
          border
          hover
          class="h-100 d-flex flex-column"
          min-height="350"
        >
          <v-card-item class="pa-5 pb-0">
            <v-card-title class="text-body-1 font-weight-bold">Asset Allocation</v-card-title>
          </v-card-item>
          <div class="pa-5 flex-grow-1 chart-area" style="display: flex; justify-content: center">
            <Doughnut
              v-if="assetAllocationData.labels.length > 0"
              :data="assetAllocationData"
              :options="doughnutOptions"
            />
            <div
              v-else
              class="d-flex align-center justify-center h-100 text-medium-emphasis text-body-2"
            >
              No assets found
            </div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card
          rounded="lg"
          elevation="0"
          variant="flat"
          border
          hover
          class="h-100 d-flex flex-column"
          min-height="350"
        >
          <v-card-item class="pa-5 pb-0">
            <v-card-title class="text-body-1 font-weight-bold">Debt Allocation</v-card-title>
          </v-card-item>
          <div class="pa-5 flex-grow-1 chart-area" style="display: flex; justify-content: center">
            <Doughnut
              v-if="debtAllocationData.labels.length > 0"
              :data="debtAllocationData"
              :options="doughnutOptions"
            />
            <div
              v-else
              class="d-flex align-center justify-center h-100 text-medium-emphasis text-body-2"
            >
              No debts found
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { usePeriodFilter } from '../stores/usePeriodFilter'
import { Line, Doughnut } from 'vue-chartjs'
import { useTheme } from 'vuetify'
import FilterComponent from '../components/filterComponent.vue'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
  ArcElement
} from 'chart.js'
import { useUserAccountsStore, resolveIsAsset } from '../stores/userAccounts'
import { useUserTransactionsStore } from '../stores/userTransactions'
import { useUserSettingsStore } from '../stores/userSettings'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
)

const accountsStore = useUserAccountsStore()
const transactionsStore = useUserTransactionsStore()
const { formatCurrency } = useUserSettingsStore()

const theme = useTheme()
const reportError = ref(null)

const _pf = usePeriodFilter()
const { period, periodStart, periodMonths, periodLabel } = storeToRefs(_pf)
const { offsetMonth } = _pf

const netWorthHistory = computed(() => transactionsStore.netWorthHistory)
const latest = computed(() => netWorthHistory.value[netWorthHistory.value.length - 1] || null)
const netWorth = computed(() => latest.value?.netWorth ?? 0)

// Active period's history record
const activePeriodRecord = computed(() => {
  const history = netWorthHistory.value
  if (!history || history.length === 0) return null

  const activeMonths = periodMonths.value
  if (activeMonths.length === 0) return null
  const lastActiveMonth = activeMonths[activeMonths.length - 1]

  const activeHistory = history.filter((r) => r.month <= lastActiveMonth)
  if (activeHistory.length === 0) return null
  return activeHistory[activeHistory.length - 1]
})

const accountBalances = computed(() => {
  const balanceById = new Map(
    transactionsStore.accountSummary.map((s) => [s.ACCTID, Number(s.total) || 0])
  )
  return accountsStore.accounts.map((account) => {
    const txTotal = balanceById.get(account.ACCTID) || 0
    const starting = Number(account.startingBalance) || 0
    const raw = starting + txTotal
    const isAsset = resolveIsAsset(account)
    return { ...account, isAsset, balance: isAsset ? raw : -raw }
  })
})

const totalAssets = computed(() =>
  accountBalances.value.filter((a) => a.isAsset).reduce((sum, a) => sum + a.balance, 0)
)
const totalLiabilities = computed(() =>
  accountBalances.value.filter((a) => !a.isAsset).reduce((sum, a) => sum + Math.abs(a.balance), 0)
)

const displayAssets = computed(() => activePeriodRecord.value?.assets ?? totalAssets.value)
const displayLiabilities = computed(
  () => activePeriodRecord.value?.liabilities ?? totalLiabilities.value
)
const displayNetWorth = computed(() => activePeriodRecord.value?.netWorth ?? netWorth.value)

// Net Worth change over the active period
const periodChange = computed(() => {
  const history = netWorthHistory.value
  if (!history || history.length === 0) return 0

  const activeMonths = periodMonths.value
  if (activeMonths.length === 0) return 0
  const firstActiveMonth = activeMonths[0]
  const endRecord = activePeriodRecord.value
  if (!endRecord) return 0

  const precedingMonth = offsetMonth(firstActiveMonth, -1)
  const precedingRecord = history.find((r) => r.month === precedingMonth)
  const startNetWorth = precedingRecord
    ? precedingRecord.netWorth
    : (history.filter((r) => r.month <= endRecord.month)[0]?.netWorth ?? 0)

  return endRecord.netWorth - startNetWorth
})

// Trend months to display
const trendMonthKeys = computed(() => {
  if (period.value === 'month') {
    return Array.from({ length: 6 }, (_, i) => offsetMonth(periodStart.value, -(5 - i)))
  } else {
    return periodMonths.value
  }
})

const trendMonths = computed(() => {
  const history = netWorthHistory.value || []
  return trendMonthKeys.value.map((monthKey) => {
    const pastRecords = history.filter((r) => r.month <= monthKey)
    if (pastRecords.length > 0) {
      return { month: monthKey, ...pastRecords[pastRecords.length - 1] }
    }
    return { month: monthKey, assets: 0, liabilities: 0, netWorth: 0 }
  })
})

const trendChipLabel = computed(() => {
  const n = trendMonths.value.length
  if (n > 0) return n === 1 ? '1 month' : `${n} months`
  const defaultMonths = { month: 6, quarter: 3, semi: 6, annual: 12 }[period.value] ?? 3
  return `${defaultMonths} month${defaultMonths > 1 ? 's' : ''}`
})

const hexToRgba = (hex, alpha) => {
  if (!hex) return `rgba(0, 0, 0, ${alpha})`
  if (hex.startsWith('rgb')) return hex
  let h = hex.slice(1)
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  const r = parseInt(h.slice(0, 2), 16) || 0
  const g = parseInt(h.slice(2, 4), 16) || 0
  const b = parseInt(h.slice(4, 6), 16) || 0
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const gradient = [
  [theme.current.value.colors.primary, theme.current.value.colors['primary-container']],
  [theme.current.value.colors.success, theme.current.value.colors['success-container']],
  [theme.current.value.colors.info, theme.current.value.colors['info-container']],
  [theme.current.value.colors.secondary, theme.current.value.colors['secondary-container']]
]
const sparklineLineColor = computed(() => (theme.current.value.dark ? 'white' : 'black'))

const ensureVariance = (data) => {
  if (!data || data.length <= 1) return [0, 1]
  const min = Math.min(...data)
  const max = Math.max(...data)
  if (min === max) {
    const arr = [...data]
    // Add an imperceptible variance so v-sparkline renders the flat line in the middle
    arr[0] = min - (min === 0 ? 1 : Math.abs(min * 0.01))
    arr[arr.length - 1] = max + (max === 0 ? 1 : Math.abs(max * 0.01))
    return arr
  }
  return data
}

const sparklineAssets = computed(() => {
  const data = trendMonths.value.map((r) => r.assets)
  return ensureVariance(data)
})
const sparklineLiabilities = computed(() => {
  const data = trendMonths.value.map((r) => r.liabilities)
  return ensureVariance(data)
})
const sparklineNetWorth = computed(() => {
  const data = trendMonths.value.map((r) => r.netWorth)
  return ensureVariance(data)
})
const sparklinePeriodChange = computed(() => {
  const data = trendMonths.value.map((r, i, arr) => {
    if (i === 0) return 0
    return r.netWorth - arr[i - 1].netWorth
  })
  return ensureVariance(data)
})

const filteredChartData = computed(() => {
  const primaryColor = theme.current.value.colors.primary || '#1976d2'
  const successColor = theme.current.value.colors.success || '#4caf50'
  const errorColor = theme.current.value.colors.error || '#f44336'
  const rows = trendMonths.value
  return {
    labels: rows.map((r) => {
      const y = r.month.slice(0, 4)
      const m = parseInt(r.month.slice(4, 6)) - 1
      return new Date(y, m, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    }),
    datasets: [
      {
        label: 'Net Worth',
        data: rows.map((r) => r.netWorth),
        borderColor: primaryColor,
        backgroundColor: hexToRgba(primaryColor, 0.12),
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2.5
      },
      {
        label: 'Assets',
        data: rows.map((r) => r.assets),
        borderColor: successColor,
        backgroundColor: hexToRgba(successColor, 0.04),
        fill: false,
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 5,
        borderDash: [4, 4]
      },
      {
        label: 'Liabilities',
        data: rows.map((r) => r.liabilities),
        borderColor: errorColor,
        backgroundColor: hexToRgba(errorColor, 0.04),
        fill: false,
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 5,
        borderDash: [4, 4]
      }
    ]
  }
})

const generateColors = (count) => {
  const baseColors = [
    theme.current.value.colors.primary,
    theme.current.value.colors.success,
    theme.current.value.colors.info,
    theme.current.value.colors.warning,
    theme.current.value.colors.error,
    theme.current.value.colors.secondary
  ]
  return Array.from({ length: count }, (_, i) => baseColors[i % baseColors.length])
}

const assetAllocationData = computed(() => {
  const assets = accountBalances.value
    .filter((a) => a.isAsset && a.balance > 0)
    .sort((a, b) => b.balance - a.balance)
  return {
    labels: assets.map((a) => a.displayName || a.ACCTTYPE || 'Unknown'),
    datasets: [
      {
        data: assets.map((a) => a.balance),
        backgroundColor: generateColors(assets.length),
        borderWidth: 0,
        hoverOffset: 4
      }
    ]
  }
})

const debtAllocationData = computed(() => {
  // Liabilities balances are negative in our calculation, so we use Math.abs
  const debts = accountBalances.value
    .filter((a) => !a.isAsset && Math.abs(a.balance) > 0)
    .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
  return {
    labels: debts.map((a) => a.displayName || a.ACCTTYPE || 'Unknown'),
    datasets: [
      {
        data: debts.map((a) => Math.abs(a.balance)),
        backgroundColor: generateColors(debts.length),
        borderWidth: 0,
        hoverOffset: 4
      }
    ]
  }
})

const lineChartOptions = computed(() => {
  const outlineColor = theme.current.value.colors.outline || '#9e9e9e'
  const tickColor = hexToRgba(outlineColor, 0.6)
  const gridColor = hexToRgba(outlineColor, 0.15)
  const onSurfaceColor = theme.current.value.colors['on-surface'] || '#000'

  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: onSurfaceColor,
          usePointStyle: true,
          padding: 16,
          boxWidth: 6,
          boxHeight: 6
        }
      },
      tooltip: {
        callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}` }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: tickColor, font: { size: 11 } }
      },
      y: {
        grid: { color: gridColor },
        border: { display: false },
        ticks: { color: tickColor, font: { size: 11 }, callback: (v) => formatCurrency(v) }
      }
    }
  }
})

const doughnutOptions = computed(() => {
  const onSurfaceColor = theme.current.value.colors['on-surface'] || '#000'
  return {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: onSurfaceColor,
          usePointStyle: true,
          padding: 16,
          boxWidth: 8,
          boxHeight: 8
        }
      },
      tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${formatCurrency(ctx.parsed)}` } }
    }
  }
})

async function loadReport() {
  reportError.value = null
  try {
    await Promise.all([
      transactionsStore.fetchNetWorthHistory(),
      transactionsStore.fetchAccountSummary(),
      accountsStore.fetchAccounts()
    ])
  } catch (err) {
    reportError.value = err?.message ?? String(err)
  }
}

onMounted(async () => {
  await loadReport()
})
</script>
