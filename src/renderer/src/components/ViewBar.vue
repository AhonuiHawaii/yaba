<script setup>
import { ref } from 'vue'
import { useTheme } from 'vuetify'
import { useUserSettingsStore } from '../stores/userSettings'

defineProps({
  title: { type: String, default: '' }
})

const emit = defineEmits(['toggle-drawer', 'navigate'])

const theme = useTheme()
const userSettings = useUserSettingsStore()

const accentColors = [
  { title: 'Red', value: 'red', color: '#F44336' },
  { title: 'Orange', value: 'orange', color: '#FF9800' },
  { title: 'Yellow', value: 'yellow', color: '#FFEB3B' },
  { title: 'Green', value: 'green', color: '#4CAF50' },
  { title: 'Blue', value: 'blue', color: '#2196F3' },
  { title: 'Indigo', value: 'indigo', color: '#3F51B5' },
  { title: 'Violet', value: 'violet', color: '#9C27B0' },
  { title: 'Pink', value: 'pink', color: '#E91E63' },
  { title: 'Teal', value: 'teal', color: '#009688' },
  { title: 'Amber', value: 'amber', color: '#FFC107' },
  { title: 'Mint', value: 'mint', color: '#00BFA5' },
  { title: 'Coral', value: 'coral', color: '#FF7043' },
  { title: 'Plum', value: 'plum', color: '#880E4F' },
  { title: 'Slate', value: 'slate', color: '#607D8B' },
  { title: 'Grey', value: 'grey', color: '#9E9E9E' }
]

const currentThemeName = theme.global.name.value || 'greyDark'
let initialBase = 'grey'
if (currentThemeName.includes('Dark')) {
  initialBase = currentThemeName.replace('Dark', '')
} else if (currentThemeName.includes('Light')) {
  initialBase = currentThemeName.replace('Light', '')
}
const selectedBaseTheme = ref(initialBase)

const selectTheme = (baseValue) => {
  selectedBaseTheme.value = baseValue
  const isDark = theme.global.name.value.includes('Dark')
  const newTheme = `${baseValue}${isDark ? 'Dark' : 'Light'}`
  if (typeof theme.change === 'function') {
    theme.change(newTheme)
  } else {
    theme.global.name.value = newTheme
  }
  userSettings.setTheme(newTheme)
}

const toggleTheme = () => {
  const current = theme.global.name.value
  const newTheme = current.includes('Dark')
    ? current.replace('Dark', 'Light')
    : current.replace('Light', 'Dark')
  theme.global.name.value = newTheme
  userSettings.setTheme(newTheme)
}
</script>

<template>
  <v-toolbar density="compact" elevation="0" border="none" color="surface-variant">
    <v-app-bar-nav-icon @click="emit('toggle-drawer')" />

    <v-toolbar-title>
      <span class="font-weight-bold">{{ title }}</span>
    </v-toolbar-title>

    <v-spacer />

    <span
      class="text-medium-emphasis align-self-center mr-1"
      style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px"
      >Accent:</span
    >
    <v-menu :close-on-content-click="false" location="bottom end">
      <template #activator="{ props: menuProps }">
        <v-btn
          v-bind="menuProps"
          icon="mdi-palette-outline"
          variant="text"
          color="primary"
          class="mr-3"
          size="small"
        />
      </template>

      <v-card width="220" class="pt-2 pb-2" elevation="4">
        <div class="px-4 text-caption text-medium-emphasis mb-2">Accent color</div>

        <div class="d-flex flex-wrap px-4 mb-3 justify-center" style="gap: 8px">
          <div
            v-for="accent in accentColors"
            :key="accent.value"
            v-ripple
            class="accent-swatch-circle"
            :style="{ backgroundColor: accent.color }"
            :title="accent.title"
            @click="selectTheme(accent.value)"
          >
            <v-icon v-if="selectedBaseTheme === accent.value" color="white" size="14">
              mdi-check
            </v-icon>
          </div>
        </div>

        <v-divider class="my-2"></v-divider>

        <div class="px-4">
          <v-switch
            :model-value="theme.global.name.value.includes('Dark')"
            color="primary"
            inset
            hide-details
            density="compact"
            @update:model-value="toggleTheme"
          >
            <template #label>
              <span class="text-body-2 text-medium-emphasis ml-2">Dark mode</span>
            </template>
          </v-switch>
        </div>
      </v-card>
    </v-menu>

    <v-btn
      variant="flat"
      color="primary"
      prepend-icon="mdi-upload"
      class="mr-2"
      @click="emit('navigate', 'Import')"
    >
      Import OFX
    </v-btn>

    <slot />
  </v-toolbar>
</template>

<style scoped>
.accent-swatch-circle {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
  border: 1px solid transparent;
}

.accent-swatch-circle:hover {
  transform: scale(1.15);
}
</style>
