<template>
  <v-container fluid class="pa-6">
    <!-- ── Header ──────────────────────────────────────────────────────────── -->
    <div class="d-flex flex-wrap align-start justify-space-between gap-4 mb-6">
      <div>
        <div class="text-h5 font-weight-bold">Net worth</div>
        <div class="text-body-2 text-medium-emphasis mt-1">
          Assets minus debts · {{ periodLabel }}
        </div>
      </div>
      <div class="d-flex align-center gap-3">
        <div class="d-flex align-center">
          <v-btn
            icon="mdi-chevron-left"
            variant="text"
            density="compact"
            size="small"
            @click="prevPeriod"
          />
          <span class="text-body-2 font-weight-medium mx-3 text-no-wrap">{{ periodLabel }}</span>
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
      </div>
    </div>

    <v-alert v-if="reportError" type="error" variant="flat" class="mb-4">
      {{ reportError }}
    </v-alert>

    <!-- ── Stat cards ──────────────────────────────────────────────────────── -->
    <v-row class="mb-4">
      <v-col cols="12" sm="4">
        <v-card rounded="lg" elevation="0" border class="pa-1">
          <v-card-text class="pa-5">
            <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis mb-3">
              Assets
            </div>
            <div class="text-h4 font-weight-bold text-success">
              {{ formatCurrency(displayAssets) }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="4">
        <v-card rounded="lg" elevation="0" border class="pa-1">
          <v-card-text class="pa-5">
            <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis mb-3">
              Debts
            </div>
            <div class="text-h4 font-weight-bold text-error">
              {{ formatCurrency(displayLiabilities) }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="4">
        <v-card rounded="lg" elevation="0" border class="pa-1">
          <v-card-text class="pa-5">
            <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis mb-3">
              Net Worth
            </div>
            <div class="text-h4 font-weight-bold">{{ formatCurrency(displayNetWorth) }}</div>
            <div
              v-if="netWorthHistory.length >= 2"
              class="d-flex align-center gap-1 mt-1 text-caption font-weight-medium"
              :class="periodChange >= 0 ? 'text-success' : 'text-error'"
            >
              <span>{{ periodChange >= 0 ? '▲' : '▼' }}</span>
              <span>{{ formatCurrency(Math.abs(periodChange)) }} this period</span>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- ── Trend chart ─────────────────────────────────────────────────────── -->
    <div class="mb-4">
      <v-card rounded="lg" elevation="0" border>
        <v-card-item class="pa-5 pb-0">
          <v-card-title class="text-body-1 font-weight-bold">Trend</v-card-title>
          <template #append>
            <v-chip size="x-small" variant="tonal" class="font-weight-medium">{{
              trendChipLabel
            }}</v-chip>
          </template>
        </v-card-item>
        <div style="height: 240px; padding: 8px 16px 16px">
          <Line
            v-if="filteredChartData.labels.length > 0"
            :data="filteredChartData"
            :options="chartOptions"
          />
          <div
            v-else
            class="d-flex align-center justify-center h-100 text-medium-emphasis text-body-2"
          >
            No history yet
          </div>
        </div>
      </v-card>
    </div>
  </v-container>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { usePeriodFilter } from '../stores/usePeriodFilter'
import { Line } from 'vue-chartjs'
import { useTheme } from 'vuetify'
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { useUserAccountsStore, resolveIsAsset } from '../stores/userAccounts'
import { useUserTransactionsStore } from '../stores/userTransactions'
import { useUserSettingsStore } from '../stores/userSettings'

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
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
const { period, periodStart, periodLength, periodMonths, periodLabel, isNextPeriodFuture } =
  storeToRefs(_pf)
const { prevPeriod, nextPeriod, offsetMonth } = _pf

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

  // Find the latest record in history that is <= lastActiveMonth
  const activeHistory = history.filter((r) => r.month <= lastActiveMonth)
  if (activeHistory.length === 0) return history[0]
  return activeHistory[activeHistory.length - 1]
})

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

  // Find the net worth just before the active period starts
  const precedingMonth = offsetMonth(firstActiveMonth, -1)
  const precedingRecord = history.find((r) => r.month === precedingMonth)

  // Fall back to first available record <= endRecord if no preceding month found
  const startNetWorth = precedingRecord
    ? precedingRecord.netWorth
    : (history.filter((r) => r.month <= endRecord.month)[0]?.netWorth ?? 0)

  return endRecord.netWorth - startNetWorth
})

// Trend months to display
const trendMonths = computed(() => {
  const all = netWorthHistory.value
  if (!all || all.length === 0) return []

  if (period.value === 'month') {
    // Show 6 months ending at the selected periodStart month
    const targetMonth = periodStart.value
    const idx = all.findIndex((r) => r.month === targetMonth)
    if (idx === -1) {
      return all.slice(-6)
    }
    const startIdx = Math.max(0, idx - 5)
    return all.slice(startIdx, idx + 1)
  } else {
    // Show the months within the active period
    const activeMonths = new Set(periodMonths.value)
    return all.filter((r) => activeMonths.has(r.month))
  }
})

const trendChipLabel = computed(() => {
  const n = trendMonths.value.length
  if (n > 0) {
    return n === 1 ? '1 month' : `${n} months`
  }
  // Fallback to default period duration
  const defaultMonths = { month: 6, quarter: 3, semi: 6, annual: 12 }[period.value] ?? 3
  return `${defaultMonths} month${defaultMonths > 1 ? 's' : ''}`
})

const hexToRgba = (hex, alpha) => {
  if (!hex) return `rgba(0, 0, 0, ${alpha})`
  if (hex.startsWith('rgb')) return hex
  const r = parseInt(hex.slice(1, 3), 16) || 0
  const g = parseInt(hex.slice(3, 5), 16) || 0
  const b = parseInt(hex.slice(5, 7), 16) || 0
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

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

const assetRows = computed(() =>
  accountBalances.value.filter((a) => a.isAsset).sort((a, b) => b.balance - a.balance)
)

const liabilityRows = computed(() =>
  accountBalances.value.filter((a) => !a.isAsset).sort((a, b) => b.balance - a.balance)
)

const totalAssets = computed(() => assetRows.value.reduce((sum, a) => sum + a.balance, 0))
const totalLiabilities = computed(() => liabilityRows.value.reduce((sum, a) => sum + a.balance, 0))

const chartOptions = computed(() => {
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
        labels: { color: onSurfaceColor, usePointStyle: true, padding: 16, boxWidth: 6, boxHeight: 6 }
      },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}`
        }
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
        ticks: {
          color: tickColor,
          font: { size: 11 },
          callback: (v) => formatCurrency(v)
        }
      }
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
