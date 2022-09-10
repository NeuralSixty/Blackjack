import { ref, computed } from "vue";
import { defineStore } from "pinia";

export const usePlayerStore = defineStore("player", () => {
  const bankRollBeforeBet = ref(1000);
  const bankRoll = ref(1000);

  const formatBankRoll = computed(() => {
    return bankRoll.value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    });
  });

  const subtractFromBankRoll = (bet) => {
    bankRoll.value -= bet;
  };

  const addToBankRoll = (bet) => {
    bankRoll.value += bet;
  };

  const resetBankRoll = (betToReturn) => {
    bankRoll.value += betToReturn;
  };

  const subtractFromBankRollBeforeBet = (bet) => {
    bankRollBeforeBet.value -= bet;
  };

  const addToBankRollBeforeBet = (bet) => {
    bankRollBeforeBet.value += bet;
  };

  const resetBankRolls = () => {
    bankRollBeforeBet.value = 1000;
    bankRoll.value = 1000;
  };

  return {
    bankRollBeforeBet,
    bankRoll,
    formatBankRoll,
    subtractFromBankRoll,
    addToBankRoll,
    resetBankRoll,
    subtractFromBankRollBeforeBet,
    addToBankRollBeforeBet,
    resetBankRolls,
  };
});
