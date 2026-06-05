import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

export const usePeriodFilter = defineStore('periodFilter', () => {
  function currentMonthValue() {
    const now = new Date()
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  }

  function offsetMonth(yyyymm, delta) {
    const year = Number(yyyymm.slice(0, 4))
    const month = Number(yyyymm.slice(4)) - 1
    const d = new Date(year, month + delta, 1)
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`
  }

  function snapToPeriodStart(yyyymm, periodType) {
    const year = parseInt(yyyymm.slice(0, 4))
    const month = parseInt(yyyymm.slice(4, 6))
    switch (periodType) {
      case 'quarter': {
        const qStart = Math.floor((month - 1) / 3) * 3 + 1
        return `${year}${String(qStart).padStart(2, '0')}`
      }
      case 'semi':
        return `${year}${month <= 6 ? '01' : '07'}`
      case 'annual':
        return `${year}01`
      default:
        return yyyymm
    }
  }

  const STORAGE_KEY = 'yaba:periodFilter'
  const saved = (() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY))
    } catch {
      return null
    }
  })()

  const period = ref(saved?.period ?? 'month')
  const periodStart = ref(
    saved?.periodStart ?? snapToPeriodStart(currentMonthValue(), saved?.period ?? 'month')
  )

  const periodLength = computed(
    () => ({ month: 1, quarter: 3, semi: 6, annual: 12 })[period.value] ?? 1
  )

  const periodMonths = computed(() => {
    const months = []
    let cur = periodStart.value
    for (let i = 0; i < periodLength.value; i++) {
      months.push(cur)
      cur = offsetMonth(cur, 1)
    }
    return months
  })

  const periodLabel = computed(() => {
    const start = periodStart.value
    const year = parseInt(start.slice(0, 4))
    const startM = parseInt(start.slice(4, 6))
    const endM = startM + periodLength.value - 1
    const abbr = (m) => new Date(year, m - 1, 1).toLocaleDateString('en-US', { month: 'short' })
    switch (period.value) {
      case 'quarter':
        return `Q${Math.floor((startM - 1) / 3) + 1} ${year} · ${abbr(startM)}–${abbr(endM)}`
      case 'semi':
        return `H${startM === 1 ? 1 : 2} ${year} · ${abbr(startM)}–${abbr(endM)}`
      case 'annual':
        return `FY ${year}`
      default:
        return new Date(year, startM - 1, 1).toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric'
        })
    }
  })

  const isNextPeriodFuture = computed(
    () => offsetMonth(periodStart.value, periodLength.value) > currentMonthValue()
  )

  function prevPeriod() {
    periodStart.value = offsetMonth(periodStart.value, -periodLength.value)
  }

  function nextPeriod() {
    periodStart.value = offsetMonth(periodStart.value, periodLength.value)
  }

  watch(period, (newPeriod) => {
    periodStart.value = snapToPeriodStart(periodStart.value, newPeriod)
  })

  watch([period, periodStart], ([p, ps]) =>
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ period: p, periodStart: ps }))
  )

  return {
    period,
    periodStart,
    periodLength,
    periodMonths,
    periodLabel,
    isNextPeriodFuture,
    prevPeriod,
    nextPeriod,
    currentMonthValue,
    offsetMonth
  }
})
