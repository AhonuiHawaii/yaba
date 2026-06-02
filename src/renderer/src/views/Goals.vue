<template>
  <v-container fluid class="pa-6">
    <v-row class="mb-6">
      <v-col cols="12" sm="6" lg="3">
        <v-card class="h-100" rounded="sm" elevation="2">
          <v-card-text class="pa-4">
            <div class="d-flex align-start justify-space-between mb-3">
              <span class="text-caption text-uppercase font-weight-bold text-medium-emphasis"
                >Total Target</span
              >
              <v-icon color="primary" size="18" :opacity="0.4">mdi-flag-outline</v-icon>
            </div>
            <div class="text-h5 font-weight-black">{{ formatCurrency(store.totalTarget) }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" lg="3">
        <v-card class="h-100" rounded="sm" elevation="2">
          <v-card-text class="pa-4">
            <div class="d-flex align-start justify-space-between mb-3">
              <span class="text-caption text-uppercase font-weight-bold text-medium-emphasis"
                >Saved</span
              >
              <v-icon color="success" size="18" :opacity="0.4">mdi-piggy-bank</v-icon>
            </div>
            <div class="text-h5 font-weight-black text-success">
              {{ formatCurrency(store.totalSaved) }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" lg="3">
        <v-card class="h-100" rounded="sm" elevation="2">
          <v-card-text class="pa-4">
            <div class="d-flex align-start justify-space-between mb-3">
              <span class="text-caption text-uppercase font-weight-bold text-medium-emphasis"
                >Remaining</span
              >
              <v-icon color="warning" size="18" :opacity="0.4">mdi-wallet-outline</v-icon>
            </div>
            <div class="text-h5 font-weight-black">{{ formatCurrency(store.totalRemaining) }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" lg="3">
        <v-card class="h-100" rounded="sm" elevation="2">
          <v-card-text class="pa-4">
            <div class="d-flex align-start justify-space-between mb-3">
              <span class="text-caption text-uppercase font-weight-bold text-medium-emphasis"
                >Completed</span
              >
              <v-icon color="success" size="18" :opacity="0.4">mdi-check-circle-outline</v-icon>
            </div>
            <div class="text-h5 font-weight-black">{{ store.completedGoals.length }}</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-alert v-if="store.error" type="error" variant="flat" class="mb-4">
      {{ store.error }}
    </v-alert>

    <v-card rounded="sm" elevation="2">
      <v-card-item class="pa-4 pb-0">
        <template #prepend>
          <v-icon color="primary" size="20" :opacity="0.7">mdi-flag-outline</v-icon>
        </template>
        <v-card-title class="text-h6 font-weight-bold pl-2">Goals</v-card-title>
        <template #append>
          <v-btn
            prepend-icon="mdi-plus"
            variant="flat"
            color="primary"
            size="small"
            @click="openNewGoal"
          >
            Add Goal
          </v-btn>
        </template>
      </v-card-item>

      <v-table density="comfortable" class="mt-2">
        <thead>
          <tr>
            <th class="text-start text-uppercase text-caption font-weight-bold pl-4">Goal</th>
            <th class="text-center text-uppercase text-caption font-weight-bold">Priority</th>
            <th class="text-center text-uppercase text-caption font-weight-bold">Saved</th>
            <th class="text-center text-uppercase text-caption font-weight-bold">Target</th>
            <th class="text-center text-uppercase text-caption font-weight-bold">Remaining</th>
            <th class="text-center text-uppercase text-caption font-weight-bold">Progress</th>
            <th class="text-center text-uppercase text-caption font-weight-bold">Target Date</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="goalRows.length === 0">
            <td colspan="8" class="text-center py-10 text-medium-emphasis">No goals yet.</td>
          </tr>
          <tr
            v-for="goal in goalRows"
            :key="goal.id"
            :draggable="goal.status !== 'completed'"
            @dragstart="onDragStart(goal.id)"
            @dragover.prevent
            @drop="onDrop(goal.id)"
          >
            <td class="pl-4 font-weight-medium text-body-2">{{ goal.name }}</td>
            <td class="text-center">
              <v-chip color="primary" variant="flat" size="x-small" rounded>
                {{ goal.priority }}
              </v-chip>
            </td>
            <td>
              <v-text-field
                :model-value="goal.currentAmount"
                type="number"
                :prefix="userSettings.currencySymbol"
                variant="solo"
                flat
                density="compact"
                hide-details
                @update:model-value="(value) = color="primary"> updateCurrentAmount(goal.id, value)"
              />
            </td>
            <td class="text-center text-body-2 font-weight-bold">
              {{ formatCurrency(goal.targetAmount) }}
            </td>
            <td
              class="text-center text-body-2 font-weight-bold"
              :class="goal.remaining <= 0 ? 'text-success' : 'text-medium-emphasis'"
            >
              {{ formatCurrency(goal.remaining) }}
            </td>
            <td class="text-center">
              <div class="d-flex align-center gap-2 px-2">
                <v-progress-linear
                  :model-value="goal.progress"
                  :color="goal.status === 'completed' ? 'success' : 'primary'"
                  height="4"
                  rounded
                />
                <span class="text-caption text-medium-emphasis" style="min-width: 32px">{{
                  goal.progressLabel
                }}</span>
              </div>
            </td>
            <td class="text-center text-body-2">{{ formatDate(goal.targetDate) }}</td>
            <td class="text-right">
              <v-btn
                icon="mdi-pencil-outline"
                variant="text"
                size="small"
                density="compact"
                @click="openEditGoal(goal)"
              />
              <v-btn
                icon="mdi-delete-outline"
                variant="text"
                size="small"
                density="compact"
                color="error"
                @click="store.deleteGoal(goal.id)"
              />
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <v-dialog v-model="goalDialog" max-width="520">
      <v-card rounded="sm">
        <v-card-title class="pa-6 pb-4">
          <div class="d-flex align-center justify-space-between">
            <span class="text-h6 font-weight-bold">{{
              editingGoalId ? 'Edit Goal' : 'Add Goal'
            }}</span>
            <v-btn icon="mdi-close" variant="text" density="compact" @click="closeGoalDialog" />
          </div>
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-6">
          <v-text-field
            v-model="goalForm.name"
            label="Goal name"
            variant="solo-filled"
            density="comfortable"
            rounded="sm"
            hide-details="auto"
            class="mb-4"
           color="primary" />
          <v-text-field
            v-model.number="goalForm.targetAmount"
            label="Target amount"
            type="number"
            :prefix="userSettings.currencySymbol"
            variant="solo-filled"
            density="comfortable"
            rounded="sm"
            hide-details="auto"
            class="mb-4"
           color="primary" />
          <v-text-field
            v-model.number="goalForm.currentAmount"
            label="Saved so far"
            type="number"
            :prefix="userSettings.currencySymbol"
            variant="solo-filled"
            density="comfortable"
            rounded="sm"
            hide-details="auto"
            class="mb-4"
           color="primary" />
          <v-text-field
            v-model="goalForm.targetDate"
            label="Target date"
            type="date"
            variant="solo-filled"
            density="comfortable"
            rounded="sm"
            hide-details="auto"
           color="primary" />
        </v-card-text>
        <v-card-actions class="pa-6 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="closeGoalDialog">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            rounded="sm"
            :loading="store.loading"
            @click="saveGoal"
          >
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useUserGoalsStore } from '../stores/userGoals'
import { useUserSettingsStore } from '../stores/userSettings'

const store = useUserGoalsStore()
const userSettings = useUserSettingsStore()
const { formatCurrency } = userSettings
const goalDialog = ref(false)
const editingGoalId = ref(null)
const goalForm = ref(createEmptyGoal())
const draggedGoalId = ref(null)

const goalRows = computed(() => {
  return store.goals
    .map((goal) => {
      const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0)
      const rawProgress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0

      return {
        ...goal,
        remaining,
        progress: Math.min(rawProgress, 100),
        progressLabel: `${Math.round(rawProgress)}%`
      }
    })
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === 'completed' ? 1 : -1
      const prioritySort = a.priority - b.priority
      if (prioritySort !== 0) return prioritySort
      if (!a.targetDate) return 1
      if (!b.targetDate) return -1
      return a.targetDate.localeCompare(b.targetDate)
    })
})

function createEmptyGoal() {
  return {
    name: '',
    targetAmount: 0,
    currentAmount: 0,
    targetDate: ''
  }
}

function openNewGoal() {
  editingGoalId.value = null
  goalForm.value = createEmptyGoal()
  goalDialog.value = true
}

function openEditGoal(goal) {
  editingGoalId.value = goal.id
  goalForm.value = {
    name: goal.name,
    targetAmount: goal.targetAmount,
    currentAmount: goal.currentAmount,
    targetDate: goal.targetDate || ''
  }
  goalDialog.value = true
}

function closeGoalDialog() {
  goalDialog.value = false
  editingGoalId.value = null
  goalForm.value = createEmptyGoal()
}

async function saveGoal() {
  if (editingGoalId.value) {
    await store.updateGoal(editingGoalId.value, goalForm.value)
  } else {
    await store.addGoal(goalForm.value)
  }
  if (!store.error) closeGoalDialog()
}

async function updateCurrentAmount(id, value) {
  await store.updateGoal(id, { currentAmount: Number(value) || 0 })
}

function onDragStart(id) {
  draggedGoalId.value = id
}

async function onDrop(targetId) {
  if (!draggedGoalId.value || draggedGoalId.value === targetId) return

  const rows = [...goalRows.value]
  const fromIndex = rows.findIndex((goal) => goal.id === draggedGoalId.value)
  const toIndex = rows.findIndex((goal) => goal.id === targetId)
  if (fromIndex === -1 || toIndex === -1) return

  const [movedGoal] = rows.splice(fromIndex, 1)
  rows.splice(toIndex, 0, movedGoal)
  draggedGoalId.value = null

  // Only pass active goal IDs — completed goals keep their existing priorities
  // and should not be renumbered by a drag-and-drop among active goals.
  const activeIds = rows.filter((goal) => goal.status !== 'completed').map((goal) => goal.id)
  await store.reorderGoals(activeIds)
}

function formatDate(value) {
  if (!value) return '-'
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

onMounted(() => {
  store.fetchGoals()
})
</script>
