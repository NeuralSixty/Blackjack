<script setup>
const props = defineProps({
  cardContainer: {
    type: Object,
    required: true,
  },
});
</script>

<template>
  <div v-if="cardContainer.faceDown" class="card facedown"></div>
  <div v-else class="card" :class="[cardContainer.card.class]"></div>
</template>

<style scoped>
.card {
  background-size: contain;
  background-repeat: no-repeat;
  max-width: 94px;
  width: 100%;
  max-height: 131px;
  aspect-ratio: 5 / 7;
  margin: 5px;
  border: 1px groove white;
  border-radius: 10px;
}
</style>
