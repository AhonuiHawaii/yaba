import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserDebtsStore = defineStore('userDebts', () => {
  // ── Planner Settings (localStorage) ─────────────────────────────────────────
  const extraPayment = ref(Number(localStorage.getItem('debt_extra_payment') ?? 500))
  const strategy = ref(localStorage.getItem('debt_strategy') ?? 'avalanche')

  function setStrategy(val) {
    strategy.value = val
    localStorage.setItem('debt_strategy', val)
  }

  function setExtraPayment(val) {
    extraPayment.value = Number(val) || 0
    localStorage.setItem('debt_extra_payment', extraPayment.value)
  }

  return {
    extraPayment,
    strategy,
    setStrategy,
    setExtraPayment
  }
})
