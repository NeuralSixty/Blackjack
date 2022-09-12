<script setup>
import { reactive } from "vue";
import { useTableStore } from "@/stores/table";

const props = defineProps({
  result: {
    type: String,
    default: () => {
      return "";
    },
  },
  insurancePayback: {
    type: Number,
    default: () => {
      return 0;
    },
  },
});

const tableStore = useTableStore();

const phases = reactive({
  1: {
    name: "starting",
    description: "⯅ Waiting to start the game...",
  },
  2: {
    name: "shuffling",
    description: "🂠 Dealer is shuffling cards...",
  },
  3: {
    name: "betting",
    description: "⯅ Place your bet",
  },
  4: {
    name: "dealing",
    description: "🂠 Dealer is dealing cards...",
  },
  5: {
    name: "asking",
    description: "💵 Dealer is asking for insurance...",
  },
  6: {
    name: "checking",
    description: "🂠 Dealer is checking the card values for Blackjack...",
  },
  7: {
    name: "playing",
    description: "⯅ Your turn",
  },
  8: {
    name: "comparing",
    description:
      "🂠 Dealer is drawing cards for their own hand to compare with player's hand...",
  },
  9: {
    name: "finishing",
    description: "⯅ Another round?",
    descriptionWin: "🤑 You win!",
    descriptionLost: "💸 Dealer wins!",
    descriptionPush: "🐔 Push",
  },
  10: {
    name: "clearing",
    description: "🂠 Clearing up the table...",
  },
});
</script>

<template>
  <div v-if="result && tableStore.phase === 9" class="phase">
    <div>{{ phases[tableStore.phase][result] }}</div>
    <div v-if="insurancePayback">
      🏦 Insurance pays you
      {{ tableStore.formatNumberToUSD(insurancePayback * 2) }} plus the
      {{ tableStore.formatNumberToUSD(insurancePayback) }} insurance bet back!
    </div>
  </div>
  <p v-else class="phase">{{ phases[tableStore.phase].description }}</p>
</template>

<style scoped>
.phase {
  font-weight: bold;
}
</style>
