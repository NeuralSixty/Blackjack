import { ref, computed } from "vue";
import { defineStore } from "pinia";

export const useCasinoStore = defineStore("casino", () => {
  const bankRoll = ref(10000000);

  const formatBankRoll = computed(() => {
    return bankRoll.value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    });
  });

  const subtractFromBankRoll = (money) => {
    bankRoll.value -= money;
  };

  const addToBankRoll = (money) => {
    bankRoll.value += money;
  };

  const resetBankRoll = () => {
    bankRoll.value = 10000000;
  };

  return {
    bankRoll,
    formatBankRoll,
    subtractFromBankRoll,
    addToBankRoll,
    resetBankRoll,
  };
});
