<script setup>
import { computed, ref, onErrorCaptured } from 'vue'
import Drawer from './components/Drawer.vue'
import ViewBar from './components/ViewBar.vue'
import Dashboard from './views/Dashboard.vue'
import Settings from './views/Settings.vue'
import Accounts from './views/Accounts.vue'
import Transactions from './views/Transactions.vue'
import Spending from './views/Spending.vue'
import Debts from './views/Debt.vue'
import Import from './views/Import.vue'
import MonthlyBudgets from './views/MonthlyBudgets.vue'
import Income from './views/Income.vue'
import NetWorth from './views/NetWorth.vue'
import Subscriptions from './views/Subscriptions.vue'
import AppBar from './components/AppBar.vue'
import AppFooter from './components/AppFooter.vue'
import Privacy from './views/Privacy.vue'
import Backup from './views/Backup.vue'
import Bills from './views/Bills.vue'

const views = {
  Dashboard,
  Settings,
  Accounts,
  Transactions,
  Spending,
  Debts,
  MonthlyBudgets,
  Income,
  NetWorth,
  Subscriptions,
  Backup,
  Privacy,
  Import,
  Bills
}

const currentView = ref('Dashboard')
const isRail = ref(false)
const currentComponent = computed(() => views[currentView.value] ?? views.Dashboard)

// 2.3: Warn on unknown view names instead of silently ignoring
const changeView = (viewName) => {
  if (!views[viewName]) {
    console.warn(`[App] Unknown view: "${viewName}"`)
    return
  }
  currentView.value = viewName
}

// 2.4: Top-level error boundary so a crashing child view shows a recovery UI
const appError = ref(null)
onErrorCaptured((err) => {
  appError.value = err.message
  return false
})
</script>

<template>
  <v-app>
    <AppBar />
    <Drawer :current-view="currentView" :rail="isRail" @change-view="changeView" />
    <v-main>
      <ViewBar :title="currentView" @toggle-drawer="isRail = !isRail" @navigate="changeView" />
      <v-alert v-if="appError" type="error" class="ma-4" closable @click:close="appError = null">
        {{ appError }}
      </v-alert>
      <component :is="currentComponent" v-else @navigate="changeView" />
    </v-main>
    <AppFooter />
  </v-app>
</template>
