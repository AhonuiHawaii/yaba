<template>
  <div class="d-flex flex-column h-100">
    <!-- Page header -->
    <div class="d-flex align-center px-5 pt-5 pb-3">
      <div>
        <div class="text-h6 font-weight-bold">Subscriptions</div>
        <div class="text-caption text-medium-emphasis">Recurring charges tracked by your rules</div>
      </div>
      <v-spacer />
      <v-btn
        icon="mdi-cog-outline"
        variant="text"
        rounded="sm"
        class="mr-2"
        @click="openSettings"
      />
      <v-btn color="primary" rounded="sm" prepend-icon="mdi-plus" @click="openAdd">
        Add manually
      </v-btn>
    </div>

    <!-- Tabs -->
    <v-tabs v-model="activeTab" class="px-5 mb-4" color="primary">
      <v-tab value="list" prepend-icon="mdi-format-list-bulleted">List</v-tab>
      <v-tab value="calendar" prepend-icon="mdi-calendar-month-outline">Calendar</v-tab>
    </v-tabs>

    <!-- Tab content -->
    <v-tabs-window v-model="activeTab">
      <v-tabs-window-item value="list">
        <SubscriptionsMain
          :subscriptions="subscriptions"
          :loading="loading"
          @cancel="handleCancel"
          @save-due-date="handleSaveDueDate"
        />
      </v-tabs-window-item>

      <v-tabs-window-item value="calendar">
        <Calendar :subscriptions="subscriptions" />
      </v-tabs-window-item>
    </v-tabs-window>

    <!-- Add manually dialog -->
    <v-dialog v-model="addDialog" max-width="440" :persistent="addLoading">
      <v-card rounded="sm">
        <v-card-title class="pa-5 pb-3 text-body-1 font-weight-bold">Add subscription</v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-text-field
            v-model="addForm.name"
            label="Payee / service name"
            variant="solo"
            rounded="sm"
            autofocus
            class="mb-4"
            hint="Transactions containing this text will be tracked"
            persistent-hint
            color="primary"
          />
          <v-select
            v-model="addForm.operator"
            :items="operatorOptions"
            label="Match type"
            variant="solo"
            rounded="sm"
            class="mb-4"
            color="primary"
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

    <!-- Settings dialog -->
    <v-dialog v-model="settingsDialog" max-width="420">
      <v-card rounded="sm">
        <v-card-title class="pa-5 pb-3 text-body-1 font-weight-bold"
          >Subscription settings</v-card-title
        >
        <v-divider />
        <v-card-text class="pa-5">
          <v-select
            v-model="settingsCategoryId"
            :items="categoryOptions"
            item-title="name"
            item-value="id"
            label="Subscription budget category"
            variant="outlined"
            density="compact"
            rounded="sm"
            clearable
            hint="Transactions in this category will be considered subscriptions for budgeting purposes."
            persistent-hint
            color="primary"
          />
        </v-card-text>
        <v-card-actions class="pa-5 pt-0">
          <v-spacer />
          <v-btn variant="text" rounded="sm" @click="settingsDialog = false">Cancel</v-btn>
          <v-btn color="primary" variant="flat" rounded="sm" @click="saveSettings">Save</v-btn>
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
import SubscriptionsMain from '../components/SubscriptionsMain.vue'
import Calendar from '../components/Calendar.vue'
import { useUserSettingsStore } from '../stores/userSettings'
import { useUserCategoriesStore } from '../stores/userCategories'

const settingsStore = useUserSettingsStore()
const categoriesStore = useUserCategoriesStore()

const activeTab = ref('list')
const loading = ref(false)
const addDialog = ref(false)
const addLoading = ref(false)
const addForm = ref({ name: '', operator: 'contains' })
const snackbar = ref({ show: false, text: '', color: 'default' })
const settingsDialog = ref(false)
const settingsCategoryId = ref(settingsStore.subscriptionCategory)
const allTransactions = ref([])
const rules = ref([])
const dueDateOverrides = ref({})

const categoryOptions = computed(() => categoriesStore.categories)

const operatorOptions = [
  { title: 'Contains', value: 'contains' },
  { title: 'Starts with', value: 'startsWith' },
  { title: 'Equals', value: 'equals' },
  { title: 'Whole word', value: 'wholeWord' }
]

async function fetchAll() {
  loading.value = true
  const categoryId = settingsStore.subscriptionCategory
  const [txResult, rulesResult] = await Promise.all([
    categoryId
      ? window.electron.ipcRenderer.invoke('transactions:fetch', { category: categoryId })
      : Promise.resolve({ success: true, data: [] }),
    window.electron.ipcRenderer.invoke('customRecurring:fetch')
  ])
  if (txResult.success) allTransactions.value = txResult.data
  if (rulesResult.success) rules.value = rulesResult.data
  loading.value = false
}

function openSettings() {
  settingsCategoryId.value = settingsStore.subscriptionCategory
  settingsDialog.value = true
}

async function saveSettings() {
  settingsStore.setSubscriptionCategory(settingsCategoryId.value)
  settingsDialog.value = false
  await fetchAll()
}

function openAdd() {
  addForm.value = { name: '', operator: 'contains' }
  addDialog.value = true
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

async function handleSaveDueDate({ sub, date }) {
  if (!date || !sub.lastFITID) return
  dueDateOverrides.value = { ...dueDateOverrides.value, [sub.name]: date }
  const dueDateInt = parseInt(date.replace(/-/g, ''), 10)
  await window.electron.ipcRenderer.invoke('transactions:edit', sub.lastFITID, {
    dueDate: dueDateInt
  })
}

async function handleCancel(sub) {
  if (!sub.ruleId) return
  await window.electron.ipcRenderer.invoke('customRecurring:delete', sub.ruleId)
  await fetchAll()
  snackbar.value = { show: true, text: `Removed "${sub.name}" from tracking.`, color: 'default' }
}

function median(arr) {
  if (!arr.length) return 0
  const s = [...arr].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}

function getInitials(name) {
  return (name || '')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

function buildSub(name, txs, ruleId = null) {
  const sorted = [...txs].sort((a, b) => (a.DTPOSTED > b.DTPOSTED ? 1 : -1))
  const amounts = sorted.map((t) => Math.abs(Number(t.TRNAMT))).filter((a) => a > 0)
  const months = new Set(sorted.map((t) => t.DTPOSTED?.slice(0, 6)).filter(Boolean))
  const days = sorted.map((t) => parseInt(t.DTPOSTED?.slice(6, 8), 10)).filter((d) => !isNaN(d))
  const currentAmount = amounts[amounts.length - 1] || 0
  const prev = amounts.slice(0, -1)
  const histMedian = prev.length >= 2 ? median(prev) : median(amounts)
  const priceUp = prev.length >= 2 && currentAmount > histMedian * 1.05
  const typicalDay = days.length ? median(days) : null
  const lastDate = sorted[sorted.length - 1]?.DTPOSTED
  let daysSinceCharge = null
  if (lastDate?.length >= 8) {
    const d = new Date(+lastDate.slice(0, 4), +lastDate.slice(4, 6) - 1, +lastDate.slice(6, 8))
    daysSinceCharge = Math.floor((Date.now() - d.getTime()) / 86400000)
  }
  const unused = daysSinceCharge !== null && daysSinceCharge > 35
  const sortedMonths = [...months].sort()
  let billing = 'Monthly'
  if (sortedMonths.length >= 2) {
    const span =
      (parseInt(sortedMonths.at(-1).slice(0, 4)) - parseInt(sortedMonths[0].slice(0, 4))) * 12 +
      parseInt(sortedMonths.at(-1).slice(4)) -
      parseInt(sortedMonths[0].slice(4)) +
      1
    if (months.size <= 2 && span >= 10) billing = 'Yearly'
  }
  const storedDueDate = sorted[sorted.length - 1]?.dueDate
  let nextCharge = null
  if (storedDueDate) {
    const s = String(storedDueDate)
    nextCharge = new Date(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8))
  } else if (lastDate?.length >= 8) {
    const last = new Date(+lastDate.slice(0, 4), +lastDate.slice(4, 6) - 1, +lastDate.slice(6, 8))
    nextCharge =
      billing === 'Yearly'
        ? new Date(last.getFullYear() + 1, last.getMonth(), last.getDate())
        : new Date(last.getFullYear(), last.getMonth() + 1, last.getDate())
  }
  return {
    name,
    category: sorted.map((t) => t.category).filter(Boolean)[0] ?? null,
    billing,
    nextCharge,
    nextChargeLabel: nextCharge
      ? settingsStore.formatDate(
          `${nextCharge.getFullYear()}${String(nextCharge.getMonth() + 1).padStart(2, '0')}${String(nextCharge.getDate()).padStart(2, '0')}`
        )
      : '—',
    lastBilledLabel: lastDate?.length >= 8 ? settingsStore.formatDate(lastDate) : '—',
    currentAmount,
    typicalAmount: median(amounts),
    priceUp,
    previousAmount: priceUp ? histMedian : null,
    unused,
    daysSinceCharge,
    monthCount: months.size,
    typicalDay,
    status: (() => {
      if (priceUp) return 'priceUp'
      if (unused) return 'unused'
      if (!nextCharge) return 'active'
      const now = Date.now()
      const due = nextCharge.getTime()
      if (due < now) return 'overdue'
      if ((due - now) / 86400000 <= 7) return 'dueSoon'
      return 'active'
    })(),
    lastFour: txs[0]?.ACCTID ? String(txs[0].ACCTID).slice(-4) : null,
    lastFITID: sorted[sorted.length - 1]?.FITID ?? null,
    ruleId,
    initials: getInitials(name),
    fromRule: ruleId != null && !txs.length
  }
}

function matchesRule(name, rule) {
  const h = (name || '').toLowerCase()
  const n = (rule.name || '').toLowerCase()
  switch (rule.operator) {
    case 'equals':
      return h === n
    case 'startsWith':
      return h.startsWith(n)
    case 'wholeWord':
      return new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(h)
    default:
      return h.includes(n)
  }
}

const subscriptions = computed(() => {
  const result = []
  const covered = new Set()

  for (const rule of rules.value) {
    const txs = allTransactions.value.filter((tx) => matchesRule(tx.NAME || '', rule))
    txs.forEach((tx) => covered.add(tx.NAME))
    if (txs.length) {
      result.push(buildSub(rule.name, txs, rule.id))
    } else {
      result.push({
        name: rule.name,
        category: null,
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

  const byName = new Map()
  for (const tx of allTransactions.value) {
    if (covered.has(tx.NAME)) continue
    const name = tx.NAME || 'Unknown'
    if (!byName.has(name)) byName.set(name, [])
    byName.get(name).push(tx)
  }
  for (const [name, txs] of byName) {
    result.push(buildSub(name, txs, null))
  }

  for (const sub of result) {
    const override = dueDateOverrides.value[sub.name]
    if (override) {
      const d = new Date(override)
      sub.nextCharge = d
      sub.nextChargeLabel = settingsStore.formatDate(override.replace(/-/g, ''))
    }
  }

  return result.sort((a, b) => (a.typicalDay ?? 99) - (b.typicalDay ?? 99))
})

onMounted(fetchAll)
</script>
