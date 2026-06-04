import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CAD: '$',
  AUD: '$',
  CHF: 'Fr',
  CNY: '¥',
  INR: '₹',
  BRL: 'R$',
  MXN: '$',
  SGD: '$',
  HKD: '$',
  NOK: 'kr',
  SEK: 'kr',
  DKK: 'kr',
  NZD: '$',
  ZAR: 'R',
  KRW: '₩',
  TRY: '₺',
  RUB: '₽',
  PLN: 'zł',
  PHP: '₱',
  IDR: 'Rp',
  MYR: 'RM',
  THB: '฿',
  AED: 'د.إ',
  SAR: '﷼'
}

const THEME_KEY = 'budget.theme'
const DEFAULT_THEME = 'pastelLight'

const CURRENCY_KEY = 'budget.currency'
const CURRENCY_POSITION_KEY = 'budget.currencyPosition'
const DEFAULT_CURRENCY = 'USD'
const DEFAULT_CURRENCY_POSITION = 'before'

const WEEK_START_KEY = 'budget.weekStart'
const DEFAULT_WEEK_START = 'monday'

const DECIMAL_PLACES_KEY = 'budget.decimalPlaces'
const DEFAULT_DECIMAL_PLACES = '2'

const DATE_FORMAT_KEY = 'budget.dateFormat'
const DEFAULT_DATE_FORMAT = 'MM/DD/YYYY'

export const useUserSettingsStore = defineStore('userSettings', () => {
  const theme = ref(localStorage.getItem(THEME_KEY) || DEFAULT_THEME)
  const currency = ref(localStorage.getItem(CURRENCY_KEY) || DEFAULT_CURRENCY)
  const currencyPosition = ref(
    localStorage.getItem(CURRENCY_POSITION_KEY) || DEFAULT_CURRENCY_POSITION
  )
  const weekStart = ref(localStorage.getItem(WEEK_START_KEY) || DEFAULT_WEEK_START)
  const decimalPlaces = ref(localStorage.getItem(DECIMAL_PLACES_KEY) || DEFAULT_DECIMAL_PLACES)
  const dateFormat = ref(localStorage.getItem(DATE_FORMAT_KEY) || DEFAULT_DATE_FORMAT)

  function setTheme(newTheme) {
    if (!newTheme) return
    theme.value = newTheme
    localStorage.setItem(THEME_KEY, newTheme)
  }

  function setCurrency(newCurrency) {
    if (!newCurrency) return
    currency.value = newCurrency
    localStorage.setItem(CURRENCY_KEY, newCurrency)
  }

  function setCurrencyPosition(newPosition) {
    if (!newPosition) return
    currencyPosition.value = newPosition
    localStorage.setItem(CURRENCY_POSITION_KEY, newPosition)
  }

  function setWeekStart(day) {
    if (!day) return
    weekStart.value = day
    localStorage.setItem(WEEK_START_KEY, day)
  }

  function setDecimalPlaces(places) {
    if (places == null) return
    decimalPlaces.value = String(places)
    localStorage.setItem(DECIMAL_PLACES_KEY, String(places))
  }

  function setDateFormat(format) {
    if (!format) return
    dateFormat.value = format
    localStorage.setItem(DATE_FORMAT_KEY, format)
  }

  const currencySymbol = computed(() => CURRENCY_SYMBOLS[currency.value] ?? currency.value)

  function formatCurrency(value) {
    const symbol = CURRENCY_SYMBOLS[currency.value] ?? currency.value
    const places = parseInt(decimalPlaces.value) || 0
    const num = value || 0
    const isNegative = num < 0
    const absFormatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: places,
      maximumFractionDigits: places
    }).format(Math.abs(num))
    const sign = isNegative ? '-' : ''
    return currencyPosition.value === 'after'
      ? `${sign}${absFormatted}${symbol}`
      : `${sign}${symbol}${absFormatted}`
  }

  function formatDate(raw) {
    if (!raw) return '—'
    const s = String(raw)
    const year = s.slice(0, 4)
    const month = s.slice(4, 6)
    const day = (s.slice(6, 8) || '01').padStart(2, '0')
    if (!year || !month) return String(raw)
    const d = new Date(`${year}-${month}-${day}`)
    const mmm = d.toLocaleString('en', { month: 'short' })
    return dateFormat.value
      .replace('MMM', mmm)
      .replace('MM', month)
      .replace('DD', day)
      .replace('YYYY', year)
  }

  return {
    theme,
    setTheme,
    currency,
    setCurrency,
    currencyPosition,
    setCurrencyPosition,
    weekStart,
    setWeekStart,
    decimalPlaces,
    setDecimalPlaces,
    dateFormat,
    setDateFormat,
    currencySymbol,
    formatCurrency,
    formatDate
  }
})
