<script setup>
const appName = window.api?.name ?? ''
const appVersion = window.api?.version ?? ''

const navGroups = [
  {
    label: 'BUDGET',
    items: [
      { title: 'Dashboard', value: 'Dashboard', icon: 'mdi-view-dashboard' },
      { title: 'Monthly Budgets', value: 'MonthlyBudgets', icon: 'mdi-calendar-month-outline' },
      { title: 'Transactions', value: 'Transactions', icon: 'mdi-swap-vertical' },
      { title: 'Spending', value: 'Spending', icon: 'mdi-credit-card-outline' },
      { title: 'Income', value: 'Income', icon: 'mdi-cash-plus' }
    ]
  },
  {
    label: 'ACCOUNTS',
    items: [
      { title: 'Accounts', value: 'Accounts', icon: 'mdi-bank-outline' },
      { title: 'Import Accounts', value: 'Import', icon: 'mdi-download-outline' },
      { title: 'Net Worth', value: 'NetWorth', icon: 'mdi-chart-line' }
    ]
  },
  {
    label: 'TOOLS',
    items: [
      { title: 'Subscriptions', value: 'Subscriptions', icon: 'mdi-sync' },
      { title: 'Bills', value: 'Bills', icon: 'mdi-receipt-text-outline' },
      { title: 'Debts Payoff', value: 'Debts', icon: 'mdi-trending-down' },
      { title: 'Backup & Restore', value: 'Backup', icon: 'mdi-cloud-sync-outline' }
    ]
  }
]

defineProps({
  currentView: { type: String, default: 'Dashboard' },
  rail: { type: Boolean, default: false }
})
const emit = defineEmits(['change-view'])
</script>

<template>
  <v-navigation-drawer permanent color="surface-variant" :rail="rail" border="none">
    <v-list-item
      :title="rail ? '' : `${appName}`"
      :subtitle="rail ? '' : `Version ${appVersion}`"
      :min-height="rail ? 48 : undefined"
    />
    <v-divider></v-divider>

    <v-list density="compact" nav>
      <template v-for="group in navGroups" :key="group.label">
        <v-list-subheader v-if="!rail">{{ group.label }}</v-list-subheader>
        <v-list-item
          v-for="item in group.items"
          :key="item.value"
          link
          :title="item.title"
          :active="item.value === currentView"
          @click="emit('change-view', item.value)"
        >
          <template #prepend>
            <v-tooltip :text="item.title" location="right">
              <template #activator="{ props: tipProps }">
                <v-icon v-bind="tipProps" :icon="item.icon" />
              </template>
            </v-tooltip>
          </template>
        </v-list-item>
      </template>
    </v-list>

    <template #append>
      <v-divider></v-divider>
      <v-list density="compact" nav>
        <v-list-item
          link
          title="Settings"
          :active="'Settings' === currentView"
          @click="emit('change-view', 'Settings')"
        >
          <template #prepend>
            <v-tooltip text="Settings" location="right">
              <template #activator="{ props: tipProps }">
                <v-icon v-bind="tipProps" icon="mdi-cog-outline" />
              </template>
            </v-tooltip>
          </template>
        </v-list-item>
        <v-list-item
          link
          title="Privacy"
          :active="'Privacy' === currentView"
          @click="emit('change-view', 'Privacy')"
        >
          <template #prepend>
            <v-tooltip text="Privacy" location="right">
              <template #activator="{ props: tipProps }">
                <v-icon v-bind="tipProps" icon="mdi-shield-lock-outline" />
              </template>
            </v-tooltip>
          </template>
        </v-list-item>
      </v-list>
    </template>
  </v-navigation-drawer>
</template>
