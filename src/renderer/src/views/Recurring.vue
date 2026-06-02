<template>
  <div class="d-flex flex-column h-100">
    <!-- Page header -->
    <div class="d-flex align-center px-5 pt-5 pb-3">
      <div>
        <div class="text-h6 font-weight-bold">Subscriptions</div>
        <div class="text-caption text-medium-emphasis">
          Recurring charges we spotted in your imports
        </div>
      </div>
      <v-spacer />
      <v-btn
        variant="outlined"
        size="small"
        rounded="sm"
        prepend-icon="mdi-plus"
        class="mr-2"
        @click="openAdd"
      >
        Add manually
      </v-btn>
      <v-btn
        color="success"
        variant="flat"
        size="small"
        rounded="sm"
        prepend-icon="mdi-refresh"
        :loading="rescanning"
        @click="rescan"
      >
        Re-scan imports
      </v-btn>
    </div>

    <!-- Tabs -->
    <div class="px-5 pb-3">
      <v-btn-toggle
        v-model="activeTab"
        mandatory
        rounded="sm"
        density="comfortable"
        variant="flat"
        color="primary"
      >
        <v-btn value="list" size="small" prepend-icon="mdi-format-list-bulleted">List</v-btn>
        <v-btn value="calendar" size="small" prepend-icon="mdi-calendar-month-outline"
          >Calendar</v-btn
        >
        <v-btn value="rules" size="small" prepend-icon="mdi-tune-variant">Rules</v-btn>
      </v-btn-toggle>
    </div>

    <!-- Tab content -->
    <AllRecurring
      v-if="activeTab === 'list'"
      :subscriptions="subscriptions"
      :loading="loading"
      @cancel="handleCancel"
    />
    <Calendar v-else-if="activeTab === 'calendar'" :subscriptions="subscriptions" />
    <SubscriptionRules
      v-else-if="activeTab === 'rules'"
      :rules="rules"
      :subscriptions="subscriptions"
      @updated="fetchAll"
    />

    <!-- Add manually dialog -->
    <v-dialog v-model="addDialog" max-width="440" :persistent="addLoading">
      <v-card rounded="sm">
        <v-card-title class="pa-5 pb-3 text-body-1 font-weight-bold">Add subscription</v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-text-field
            v-model="addForm.name"
            label="Payee / service name"
            variant="outlined"
            density="compact"
            rounded="sm"
            autofocus
            class="mb-4"
            hint="Transactions containing this text will be tracked"
            persistent-hint
          />
          <v-select
            v-model="addForm.operator"
            :items="operatorOptions"
            label="Match type"
            variant="outlined"
            density="compact"
            rounded="sm"
          />
        </v-card-text>
        <v-card-actions class="pa-5 pt-0">
          <v-spacer />
          <v-btn variant="text" rounded="sm" :disabled="addLoading" @click="addDialog = false"
            >Cancel</v-btn
          >
          <v-btn
            color="primary"
            variant="flat"
            rounded="sm"
            :disabled="!addForm.name.trim()"
            :loading="addLoading"
            @click="submitAdd"
            >Add</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Cancel/untrack snackbar -->
    <v-snackbar v-model="snackbar.show" :timeout="3000" rounded="sm" :color="snackbar.color">
      {{ snackbar.text }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import AllRecurring from '../components/AllRecurring.vue'
import Calendar from '../components/Calendar.vue'
import SubscriptionRules from '../components/SubscriptionRules.vue'

const CATEGORY_PATTERNS = [
  [/netflix/i, 'Streaming'],
  [/hulu/i, 'Streaming'],
  [/disney/i, 'Streaming'],
  [/paramount/i, 'Streaming'],
  [/peacock/i, 'Streaming'],
  [/\bhbo\b|apple\s*tv/i, 'Streaming'],
  [/spotify/i, 'Music'],
  [/apple\s*music/i, 'Music'],
  [/tidal/i, 'Music'],
  [/pandora/i, 'Music'],
  [/adobe/i, 'Software'],
  [/microsoft|office\s*365/i, 'Software'],
  [/notion|figma|github|1password/i, 'Software'],
  [/icloud/i, 'Storage'],
  [/dropbox/i, 'Storage'],
  [/google\s*one/i, 'Storage'],
  [/backblaze/i, 'Storage'],
  [/amazon\s*prime|prime\s*video/i, 'Shopping'],
  [/planet\s*fitness|equinox|anytime\s*fitness/i, 'Fitness'],
  [/nyt|new\s*york\s*times/i, 'News'],
  [/wsj|wall\s*street|washington\s*post/i, 'News']
]

function detectCategory(name) {
  for (const [pattern, cat] of CATEGORY_PATTERNS) {
    if (pattern.test(name)) return cat
  }
  return null
}

const operatorOptions = [
  { title: 'Contains', value: 'contains' },
  { title: 'Starts with', value: 'startsWith' },
  { title: 'Equals', value: 'equals' },
  { title: 'Whole word', value: 'wholeWord' }
]

const activeTab = ref('list')
const loading = ref(false)
const rescanning = ref(false)
const addDialog = ref(false)
const addLoading = ref(false)
const addForm = ref({ name: '', operator: 'contains' })
const snackbar = ref({ show: false, text: '', color: 'default' })

const recurringTransactions = ref([])
const rules = ref([])

function openAdd() {
  addForm.value = { name: '', operator: 'contains' }
  addDialog.value = true
}

async function fetchAll() {
  loading.value = true
  const [txResult, rulesResult] = await Promise.all([
    window.electron.ipcRenderer.invoke('transactions:fetch', { recurring: 1 }),
    window.electron.ipcRenderer.invoke('customRecurring:fetch')
  ])
  if (txResult.success) recurringTransactions.value = txResult.data
  if (rulesResult.success) rules.value = rulesResult.data
  loading.value = false
}

async function rescan() {
  rescanning.value = true
  await window.electron.ipcRenderer.invoke('transactions:rescanRecurring')
  await fetchAll()
  rescanning.value = false
}

async function submitAdd() {
  if (!addForm.value.name.trim()) return
  addLoading.value = true
  await window.electron.ipcRenderer.invoke('customRecurring:create', {
    name: addForm.value.name.trim(),
    operator: addForm.value.operator
  })
  await fetchAll()
  addLoading.value = false
  addDialog.value = false
}

async function handleCancel(sub) {
  if (sub.ruleId) {
    await window.electron.ipcRenderer.invoke('customRecurring:delete', sub.ruleId)
    await fetchAll()
    snackbar.value = { show: true, text: `Removed "${sub.name}" from tracking.`, color: 'default' }
  } else {
    snackbar.value = {
      show: true,
      text: 'Auto-detected subscriptions can be excluded via the Rules tab.',
      color: 'default'
    }
  }
}

// ── Subscription computation ──────────────────────────────────────────────────

function median(arr) {
  if (!arr.length) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

function getInitials(name) {
  return (name || '')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

function computeNextCharge(typicalDay) {
  if (!typicalDay) return null
  const now = new Date()
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), typicalDay)
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, typicalDay)
  return thisMonth >= now ? thisMonth : nextMonth
}

function formatDateShort(date) {
  if (!date) return '—'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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

function buildSub(name, txs, acctid) {
  const sorted = [...txs].sort((a, b) => (a.DTPOSTED > b.DTPOSTED ? 1 : -1))
  const amounts = sorted.map((t) => Math.abs(Number(t.TRNAMT))).filter((a) => a > 0)
  const months = new Set(sorted.map((t) => t.DTPOSTED?.slice(0, 6)).filter(Boolean))
  const days = sorted.map((t) => parseInt(t.DTPOSTED?.slice(6, 8), 10)).filter((d) => !isNaN(d))
  const categories = sorted.map((t) => t.category).filter(Boolean)

  const currentAmount = amounts[amounts.length - 1] || 0
  const historicalAmounts = amounts.slice(0, -1)
  const histMedian =
    historicalAmounts.length >= 2 ? median(historicalAmounts) : amounts.length ? median(amounts) : 0

  const priceUp =
    historicalAmounts.length >= 2 &&
    currentAmount > histMedian * 1.05 &&
    currentAmount !== histMedian
  const previousAmount = priceUp ? histMedian : null

  const lastDate = sorted[sorted.length - 1]?.DTPOSTED
  let daysSinceCharge = null
  if (lastDate?.length >= 8) {
    const d = new Date(+lastDate.slice(0, 4), +lastDate.slice(4, 6) - 1, +lastDate.slice(6, 8))
    daysSinceCharge = Math.floor((Date.now() - d.getTime()) / 86400000)
  }
  const unused = daysSinceCharge !== null && daysSinceCharge > 35

  const typicalDay = days.length ? median(days) : null
  const nextCharge = computeNextCharge(typicalDay)

  const sortedMonths = [...months].sort()
  let billing = 'Monthly'
  if (sortedMonths.length >= 2) {
    const first = sortedMonths[0]
    const last = sortedMonths[sortedMonths.length - 1]
    const span =
      (parseInt(last.slice(0, 4)) - parseInt(first.slice(0, 4))) * 12 +
      parseInt(last.slice(4)) -
      parseInt(first.slice(4)) +
      1
    if (months.size <= 2 && span >= 10) billing = 'Yearly'
  }

  const txCategory = categories.length
    ? [...categories].sort(
        (a, b) =>
          categories.filter((c) => c === b).length - categories.filter((c) => c === a).length
      )[0]
    : null

  const rule = rules.value.find((r) => matchesRule(name, r))

  return {
    name,
    category: detectCategory(name) || txCategory || null,
    billing,
    nextCharge,
    nextChargeLabel: formatDateShort(nextCharge),
    currentAmount,
    typicalAmount: median(amounts),
    priceUp,
    previousAmount,
    unused,
    daysSinceCharge,
    monthCount: months.size,
    typicalDay,
    status: priceUp ? 'priceUp' : unused ? 'unused' : 'active',
    lastFour: acctid ? String(acctid).slice(-4) : null,
    ruleId: rule?.id || null,
    initials: getInitials(name),
    fromRule: false
  }
}

const subscriptions = computed(() => {
  const map = new Map()
  for (const tx of recurringTransactions.value) {
    const key = tx.NAME || 'Unknown'
    if (!map.has(key)) map.set(key, { txs: [], acctid: tx.ACCTID || null })
    map.get(key).txs.push(tx)
  }

  const result = []
  for (const [name, g] of map) {
    result.push(buildSub(name, g.txs, g.acctid))
  }

  for (const rule of rules.value) {
    if (!result.some((s) => matchesRule(s.name, rule))) {
      result.push({
        name: rule.name,
        category: detectCategory(rule.name),
        billing: 'Monthly',
        nextCharge: null,
        nextChargeLabel: '—',
        currentAmount: 0,
        typicalAmount: 0,
        priceUp: false,
        previousAmount: null,
        unused: false,
        daysSinceCharge: null,
        monthCount: 0,
        typicalDay: null,
        status: 'active',
        lastFour: null,
        ruleId: rule.id,
        initials: getInitials(rule.name),
        fromRule: true
      })
    }
  }

  return result.sort((a, b) => (a.typicalDay ?? 99) - (b.typicalDay ?? 99))
})

onMounted(fetchAll)
</script>
