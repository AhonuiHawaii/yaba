<template>
  <v-container fluid class="pa-6">
    <div class="d-flex align-center mb-6">
      <div>
        <div class="text-h5 font-weight-bold">Budgets</div>
        <div class="text-body-2 text-medium-emphasis">Group spending &amp; set auto-rules</div>
      </div>
      <v-spacer />
      <v-btn color="primary" variant="flat" rounded="sm" prepend-icon="mdi-plus" @click="openAdd">
        New category
      </v-btn>
    </div>

    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; align-items: start">
      <v-card v-for="section in sections" :key="section.type" rounded="lg" elevation="1">
        <div class="px-5 pt-5 pb-3 text-h6 font-weight-bold">{{ section.label }}</div>
        <div v-for="g in section.groups" :key="g.id" class="d-flex align-center px-5 py-3">
          <v-avatar size="36" color="primary" variant="tonal" rounded="sm" class="mr-4 flex-shrink-0">
            <v-icon size="18" color="primary">{{ g.icon }}</v-icon>
          </v-avatar>
          <div style="flex: 1; min-width: 0" class="mr-3">
            <div class="text-body-2 font-weight-bold">{{ g.label }}</div>
            <div v-if="g.rules.length" class="text-caption text-medium-emphasis">
              Rule: {{ g.rules.join(', ') }}
            </div>
          </div>
          <span class="text-body-2 font-weight-bold mr-1" style="white-space: nowrap">
            ${{ g.amount }}/mo
          </span>
          <v-menu>
            <template #activator="{ props }">
              <v-btn v-bind="props" icon="mdi-dots-vertical" variant="text" size="small" density="compact" />
            </template>
            <v-list density="compact">
              <v-list-item title="Edit" prepend-icon="mdi-pencil-outline" @click="openEdit(g)" />
              <v-list-item title="Delete" prepend-icon="mdi-delete-outline" @click="store.deleteGroup(g.id)" />
            </v-list>
          </v-menu>
        </div>
        <div class="pb-2" />
      </v-card>
    </div>

    <v-sheet
      color="primary"
      variant="tonal"
      rounded="sm"
      class="d-flex align-center pa-4 mt-5 gap-3"
    >
      <v-icon color="primary" size="22">mdi-cog-outline</v-icon>
      <span class="text-body-2"
        >When a rule matches a new import, the category is applied automatically.</span
      >
    </v-sheet>

    <v-dialog v-model="addDialog" max-width="420">
      <v-card rounded="sm">
        <v-card-title class="pa-5 pb-3 text-body-1 font-weight-bold">{{
          editingId ? 'Edit category' : 'New category'
        }}</v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <div class="form-row mb-3">
            <label>Name</label>
            <v-text-field
              v-model="form.label"
              variant="outlined"
              density="compact"
              rounded="sm"
              autofocus
              hide-details
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
            />
          </div>
          <div class="form-row mb-3">
            <label>Icon</label>
            <v-select
              v-model="form.icon"
              :items="iconItems"
              variant="outlined"
              density="compact"
              rounded="sm"
              hide-details
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
            />
          </div>
          <div class="form-row">
            <label>Rules</label>
            <v-text-field
              v-model="form.rulesRaw"
              placeholder="e.g. NETFLIX, SPOTIFY"
              variant="outlined"
              density="compact"
              rounded="sm"
              hide-details
            />
          </div>
        </v-card-text>
        <v-card-actions class="pa-5 pt-0">
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
import { computed, onMounted, ref } from 'vue'
import { useUserBudgetsRulesStore } from '../stores/userBudgetsRules'

const store = useUserBudgetsRulesStore()

const SECTIONS = [
  { type: 'variable', label: 'Spending' },
  { type: 'bills', label: 'Bills' },
  { type: 'income', label: 'Income' }
]

const sections = computed(() =>
  SECTIONS.map((s) => ({ ...s, groups: store.groups.filter((g) => g.type === s.type) }))
)

const addDialog = ref(false)
const editingId = ref(null)
const form = ref({
  label: '',
  type: 'variable',
  icon: 'mdi-tag-outline',
  amount: 0,
  rulesRaw: ''
})

const typeItems = [
  { title: 'Variable Expenses', value: 'variable' },
  { title: 'Bills', value: 'bills' },
  { title: 'Income', value: 'income' }
]

const iconItems = [
  { title: 'Cart', value: 'mdi-cart-outline' },
  { title: 'Dining', value: 'mdi-silverware-fork-knife' },
  { title: 'Car', value: 'mdi-car-outline' },
  { title: 'Subscriptions', value: 'mdi-autorenew' },
  { title: 'Home', value: 'mdi-home-outline' },
  { title: 'Utilities', value: 'mdi-lightning-bolt-outline' },
  { title: 'Cash', value: 'mdi-cash-multiple' },
  { title: 'Tag', value: 'mdi-tag-outline' }
]

function openAdd() {
  editingId.value = null
  form.value = { label: '', type: 'variable', icon: 'mdi-tag-outline', amount: 0, rulesRaw: '' }
  addDialog.value = true
}

function openEdit(g) {
  editingId.value = g.id
  form.value = {
    label: g.label,
    type: g.type,
    icon: g.icon,
    amount: g.amount,
    rulesRaw: g.rules.join(', ')
  }
  addDialog.value = true
}

async function save() {
  const label = form.value.label.trim()
  if (!label) return
  const rules = form.value.rulesRaw
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean)
  const payload = { type: form.value.type, icon: form.value.icon, label, rules, amount: Number(form.value.amount) || 0 }
  if (editingId.value) {
    await store.updateGroup(editingId.value, payload)
  } else {
    await store.addGroup(payload)
  }
  addDialog.value = false
}

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
</style>
