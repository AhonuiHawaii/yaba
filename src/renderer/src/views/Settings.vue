<template>
  <v-container fluid class="pa-4">
    <v-row>
      <v-col cols="12">
        <v-card rounded="sm" elevation="2" class="mb-3">
          <v-card-item class="pa-4 pb-0">
            <template #prepend>
              <v-icon color="primary" size="20" :opacity="0.7">mdi-palette-outline</v-icon>
            </template>
            <div class="d-flex align-center justify-space-between w-100">
              <v-card-title class="text-h6 font-weight-bold pl-2">Appearance</v-card-title>
              <v-switch
                v-model="isDark"
                inset
                label="Dark Mode"
                color="primary"
                density="compact"
                hide-details
                class="flex-grow-0"
                @update:model-value="updateTheme"
              ></v-switch>
            </div>
          </v-card-item>

          <v-card-text class="pt-4 pb-4">
            <div class="d-flex flex-wrap justify-center">
              <div
                v-for="(accent, index) in accentColors"
                :key="accent.value"
                v-ripple
                class="accent-swatch-circle"
                :class="{
                  active: selectedBaseTheme === accent.value,
                  'mr-4': index !== accentColors.length - 1
                }"
                :style="{ backgroundColor: accent.color }"
                :title="accent.title"
                @click="selectTheme(accent.value)"
              >
                <v-icon v-if="selectedBaseTheme === accent.value" color="white" size="20">
                  mdi-check
                </v-icon>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <v-card rounded="sm" elevation="2" class="mb-3">
          <v-card-item class="pa-4 pb-0">
            <template #prepend>
              <v-icon color="primary" size="20" :opacity="0.7">mdi-cog-outline</v-icon>
            </template>
            <v-card-title class="text-h6 font-weight-bold pl-2">Settings</v-card-title>
          </v-card-item>

          <v-card-text class="pt-4">
            <v-row align="center">
              <v-col cols="12">
                <div class="d-flex align-center">
                  <span class="text-caption text-medium-emphasis text-no-wrap setting-label"
                    >Currency</span
                  >
                  <v-autocomplete
                    :model-value="selectedCurrency"
                    :items="currencies"
                    item-title="label"
                    item-value="code"
                    variant="solo-filled"
                    density="compact"
                    color="primary"
                    hide-details
                    @update:model-value="updateCurrency"
                  ></v-autocomplete>
                </div>
              </v-col>

              <v-col cols="12">
                <div class="d-flex align-center">
                  <span class="text-caption text-medium-emphasis text-no-wrap setting-label"
                    >Symbol Position</span
                  >
                  <v-btn-toggle
                    :model-value="selectedCurrencyPosition"
                    mandatory
                    density="compact"
                    color="primary"
                    variant="outlined"
                    @update:model-value="updateCurrencyPosition"
                  >
                    <v-btn value="before" size="small">{{ currencyPreviewSymbol }}100</v-btn>
                    <v-btn value="after" size="small">100{{ currencyPreviewSymbol }}</v-btn>
                  </v-btn-toggle>
                </div>
              </v-col>

              <v-col cols="12">
                <div class="d-flex align-center">
                  <span class="text-caption text-medium-emphasis text-no-wrap setting-label"
                    >Date Format</span
                  >
                  <v-btn-toggle
                    :model-value="selectedDateFormat"
                    mandatory
                    density="compact"
                    color="primary"
                    variant="outlined"
                    @update:model-value="updateDateFormat"
                  >
                    <v-btn
                      v-for="fmt in dateFormats"
                      :key="fmt.value"
                      :value="fmt.value"
                      size="small"
                    >
                      {{ fmt.example }}
                    </v-btn>
                  </v-btn-toggle>
                </div>
              </v-col>

              <v-col cols="12">
                <div class="d-flex align-center">
                  <span class="text-caption text-medium-emphasis text-no-wrap setting-label"
                    >Week Starts</span
                  >
                  <v-btn-toggle
                    :model-value="selectedWeekStart"
                    mandatory
                    density="compact"
                    color="primary"
                    variant="outlined"
                    @update:model-value="updateWeekStart"
                  >
                    <v-btn value="sunday" size="small">Sunday</v-btn>
                    <v-btn value="monday" size="small">Monday</v-btn>
                  </v-btn-toggle>
                </div>
              </v-col>

              <v-col cols="12">
                <div class="d-flex align-center">
                  <span class="text-caption text-medium-emphasis text-no-wrap setting-label"
                    >Decimal Places</span
                  >
                  <v-btn-toggle
                    :model-value="selectedDecimalPlaces"
                    mandatory
                    density="compact"
                    color="primary"
                    variant="outlined"
                    @update:model-value="updateDecimalPlaces"
                  >
                    <v-btn value="0" size="small">0</v-btn>
                    <v-btn value="1" size="small">1</v-btn>
                    <v-btn value="2" size="small">2</v-btn>
                  </v-btn-toggle>
                </div>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useTheme } from 'vuetify'
import { useUserSettingsStore } from '../stores/userSettings'

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
let initialDark = false

if (currentThemeName.includes('Dark')) {
  initialDark = true
  initialBase = currentThemeName.replace('Dark', '')
} else if (currentThemeName.includes('Light')) {
  initialDark = false
  initialBase = currentThemeName.replace('Light', '')
}

const selectedBaseTheme = ref(initialBase)
const isDark = ref(initialDark)

const updateTheme = () => {
  const mode = isDark.value ? 'Dark' : 'Light'
  const newTheme = `${selectedBaseTheme.value}${mode}`
  if (typeof theme.change === 'function') {
    theme.change(newTheme)
  } else {
    theme.global.name.value = newTheme
  }
  userSettings.setTheme(newTheme)
}

const selectTheme = (baseValue) => {
  selectedBaseTheme.value = baseValue
  updateTheme()
}

const currencies = [
  { code: 'USD', symbol: '$', label: 'USD - US Dollar ($)' },
  { code: 'EUR', symbol: '€', label: 'EUR - Euro (€)' },
  { code: 'GBP', symbol: '£', label: 'GBP - British Pound (£)' },
  { code: 'JPY', symbol: '¥', label: 'JPY - Japanese Yen (¥)' },
  { code: 'CAD', symbol: '$', label: 'CAD - Canadian Dollar ($)' },
  { code: 'AUD', symbol: '$', label: 'AUD - Australian Dollar ($)' },
  { code: 'CHF', symbol: 'Fr', label: 'CHF - Swiss Franc (Fr)' },
  { code: 'CNY', symbol: '¥', label: 'CNY - Chinese Yuan (¥)' },
  { code: 'INR', symbol: '₹', label: 'INR - Indian Rupee (₹)' },
  { code: 'BRL', symbol: 'R$', label: 'BRL - Brazilian Real (R$)' },
  { code: 'MXN', symbol: '$', label: 'MXN - Mexican Peso ($)' },
  { code: 'SGD', symbol: '$', label: 'SGD - Singapore Dollar ($)' },
  { code: 'HKD', symbol: '$', label: 'HKD - Hong Kong Dollar ($)' },
  { code: 'NOK', symbol: 'kr', label: 'NOK - Norwegian Krone (kr)' },
  { code: 'SEK', symbol: 'kr', label: 'SEK - Swedish Krona (kr)' },
  { code: 'DKK', symbol: 'kr', label: 'DKK - Danish Krone (kr)' },
  { code: 'NZD', symbol: '$', label: 'NZD - New Zealand Dollar ($)' },
  { code: 'ZAR', symbol: 'R', label: 'ZAR - South African Rand (R)' },
  { code: 'KRW', symbol: '₩', label: 'KRW - South Korean Won (₩)' },
  { code: 'TRY', symbol: '₺', label: 'TRY - Turkish Lira (₺)' },
  { code: 'RUB', symbol: '₽', label: 'RUB - Russian Ruble (₽)' },
  { code: 'PLN', symbol: 'zł', label: 'PLN - Polish Złoty (zł)' },
  { code: 'PHP', symbol: '₱', label: 'PHP - Philippine Peso (₱)' },
  { code: 'IDR', symbol: 'Rp', label: 'IDR - Indonesian Rupiah (Rp)' },
  { code: 'MYR', symbol: 'RM', label: 'MYR - Malaysian Ringgit (RM)' },
  { code: 'THB', symbol: '฿', label: 'THB - Thai Baht (฿)' },
  { code: 'AED', symbol: 'د.إ', label: 'AED - UAE Dirham (د.إ)' },
  { code: 'SAR', symbol: '﷼', label: 'SAR - Saudi Riyal (﷼)' }
]

const CURRENCY_REGIONAL_DEFAULTS = {
  USD: {
    currencyPosition: 'before',
    dateFormat: 'MM/DD/YYYY',
    weekStart: 'sunday',
    decimalPlaces: '2'
  },
  EUR: {
    currencyPosition: 'after',
    dateFormat: 'DD/MM/YYYY',
    weekStart: 'monday',
    decimalPlaces: '2'
  },
  GBP: {
    currencyPosition: 'before',
    dateFormat: 'DD/MM/YYYY',
    weekStart: 'monday',
    decimalPlaces: '2'
  },
  JPY: {
    currencyPosition: 'before',
    dateFormat: 'YYYY-MM-DD',
    weekStart: 'sunday',
    decimalPlaces: '0'
  },
  CAD: {
    currencyPosition: 'before',
    dateFormat: 'MM/DD/YYYY',
    weekStart: 'sunday',
    decimalPlaces: '2'
  },
  AUD: {
    currencyPosition: 'before',
    dateFormat: 'DD/MM/YYYY',
    weekStart: 'monday',
    decimalPlaces: '2'
  },
  CHF: {
    currencyPosition: 'before',
    dateFormat: 'DD.MM.YYYY',
    weekStart: 'monday',
    decimalPlaces: '2'
  },
  CNY: {
    currencyPosition: 'before',
    dateFormat: 'YYYY-MM-DD',
    weekStart: 'monday',
    decimalPlaces: '2'
  },
  INR: {
    currencyPosition: 'before',
    dateFormat: 'DD/MM/YYYY',
    weekStart: 'sunday',
    decimalPlaces: '2'
  },
  BRL: {
    currencyPosition: 'before',
    dateFormat: 'DD/MM/YYYY',
    weekStart: 'sunday',
    decimalPlaces: '2'
  },
  MXN: {
    currencyPosition: 'before',
    dateFormat: 'DD/MM/YYYY',
    weekStart: 'sunday',
    decimalPlaces: '2'
  },
  SGD: {
    currencyPosition: 'before',
    dateFormat: 'DD/MM/YYYY',
    weekStart: 'sunday',
    decimalPlaces: '2'
  },
  HKD: {
    currencyPosition: 'before',
    dateFormat: 'DD/MM/YYYY',
    weekStart: 'sunday',
    decimalPlaces: '2'
  },
  NOK: {
    currencyPosition: 'after',
    dateFormat: 'DD.MM.YYYY',
    weekStart: 'monday',
    decimalPlaces: '2'
  },
  SEK: {
    currencyPosition: 'after',
    dateFormat: 'YYYY-MM-DD',
    weekStart: 'monday',
    decimalPlaces: '2'
  },
  DKK: {
    currencyPosition: 'after',
    dateFormat: 'DD.MM.YYYY',
    weekStart: 'monday',
    decimalPlaces: '2'
  },
  NZD: {
    currencyPosition: 'before',
    dateFormat: 'DD/MM/YYYY',
    weekStart: 'monday',
    decimalPlaces: '2'
  },
  ZAR: {
    currencyPosition: 'before',
    dateFormat: 'YYYY-MM-DD',
    weekStart: 'sunday',
    decimalPlaces: '2'
  },
  KRW: {
    currencyPosition: 'before',
    dateFormat: 'YYYY-MM-DD',
    weekStart: 'sunday',
    decimalPlaces: '0'
  },
  TRY: {
    currencyPosition: 'after',
    dateFormat: 'DD.MM.YYYY',
    weekStart: 'monday',
    decimalPlaces: '2'
  },
  RUB: {
    currencyPosition: 'after',
    dateFormat: 'DD.MM.YYYY',
    weekStart: 'monday',
    decimalPlaces: '2'
  },
  PLN: {
    currencyPosition: 'after',
    dateFormat: 'DD.MM.YYYY',
    weekStart: 'monday',
    decimalPlaces: '2'
  },
  PHP: {
    currencyPosition: 'before',
    dateFormat: 'MM/DD/YYYY',
    weekStart: 'sunday',
    decimalPlaces: '2'
  },
  IDR: {
    currencyPosition: 'before',
    dateFormat: 'DD/MM/YYYY',
    weekStart: 'monday',
    decimalPlaces: '0'
  },
  MYR: {
    currencyPosition: 'before',
    dateFormat: 'DD/MM/YYYY',
    weekStart: 'monday',
    decimalPlaces: '2'
  },
  THB: {
    currencyPosition: 'before',
    dateFormat: 'DD/MM/YYYY',
    weekStart: 'sunday',
    decimalPlaces: '2'
  },
  AED: {
    currencyPosition: 'before',
    dateFormat: 'DD/MM/YYYY',
    weekStart: 'monday',
    decimalPlaces: '2'
  },
  SAR: {
    currencyPosition: 'before',
    dateFormat: 'DD/MM/YYYY',
    weekStart: 'sunday',
    decimalPlaces: '2'
  }
}

const selectedCurrency = ref(userSettings.currency)
const selectedCurrencyPosition = ref(userSettings.currencyPosition)

const currencyPreviewSymbol = computed(
  () => currencies.find((c) => c.code === selectedCurrency.value)?.symbol ?? selectedCurrency.value
)

const updateCurrency = (code) => {
  selectedCurrency.value = code
  userSettings.setCurrency(code)
  const defaults = CURRENCY_REGIONAL_DEFAULTS[code]
  if (defaults) {
    selectedCurrencyPosition.value = defaults.currencyPosition
    selectedDateFormat.value = defaults.dateFormat
    selectedWeekStart.value = defaults.weekStart
    selectedDecimalPlaces.value = defaults.decimalPlaces
    userSettings.setCurrencyPosition(defaults.currencyPosition)
    userSettings.setDateFormat(defaults.dateFormat)
    userSettings.setWeekStart(defaults.weekStart)
    userSettings.setDecimalPlaces(defaults.decimalPlaces)
  }
}

const updateCurrencyPosition = (position) => {
  selectedCurrencyPosition.value = position
  userSettings.setCurrencyPosition(position)
}

const _now = new Date()
const _d = String(_now.getDate()).padStart(2, '0')
const _m = String(_now.getMonth() + 1).padStart(2, '0')
const _y = _now.getFullYear()
const _mmm = _now.toLocaleString('en', { month: 'short' })

const dateFormats = [
  { value: 'MM/DD/YYYY', example: `${_m}/${_d}/${_y}` },
  { value: 'DD/MM/YYYY', example: `${_d}/${_m}/${_y}` },
  { value: 'YYYY-MM-DD', example: `${_y}-${_m}-${_d}` },
  { value: 'DD.MM.YYYY', example: `${_d}.${_m}.${_y}` },
  { value: 'MMM DD, YYYY', example: `${_mmm} ${_d}, ${_y}` }
]

const selectedDateFormat = ref(userSettings.dateFormat)
const selectedWeekStart = ref(userSettings.weekStart)
const selectedDecimalPlaces = ref(userSettings.decimalPlaces)

const updateDateFormat = (format) => {
  selectedDateFormat.value = format
  userSettings.setDateFormat(format)
}

const updateWeekStart = (day) => {
  selectedWeekStart.value = day
  userSettings.setWeekStart(day)
}

const updateDecimalPlaces = (places) => {
  selectedDecimalPlaces.value = places
  userSettings.setDecimalPlaces(places)
}
</script>

<style scoped>
.setting-label {
  width: 130px;
  flex-shrink: 0;
}

.accent-swatch-circle {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
  border: 2px solid transparent;
}

.accent-swatch-circle:hover {
  transform: scale(1.1);
}

.accent-swatch-circle.active {
  box-shadow:
    0 0 0 3px rgb(var(--v-theme-surface)),
    0 0 0 5px rgb(var(--v-theme-primary));
  transform: scale(1.05);
}
</style>
