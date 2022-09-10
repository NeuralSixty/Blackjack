<script setup>
import DealerEntity from "@/components/entities/DealerEntity.vue";
import PlayerEntity from "@/components/entities/PlayerEntity.vue";
import BlackjackPhase from "@/components/core/BlackjackPhase.vue";
import { useTableStore } from "@/stores/table";
import { useCasinoStore } from "../stores/casino";
import { usePlayerStore } from "../stores/player";

const tableStore = useTableStore();
const playerStore = usePlayerStore();
const casinoStore = useCasinoStore();

const restartGame = () => {
  tableStore.deleteAllPlayerHands();
  tableStore.resetDealerHand();
  tableStore.emptyShoe();
  tableStore.emptyDiscardRack();
  playerStore.resetBankRolls();
  casinoStore.resetBankRoll();
  tableStore.startNewGame();
};
</script>

<template>
  <div class="blackjack-table">
    <div class="text-section">
      <div class="stats-section">
        <h2>Settings</h2>
        <button @click="restartGame">Restart the game</button>
        <h2>Info</h2>
        <h3>Casino</h3>
        <div>House bankroll: {{ casinoStore.formatBankRoll }}</div>
        <h3>Table state</h3>
        <div>
          ✪ Total bet on the table:
          {{ tableStore.formatNumberToUSD(tableStore.getTotalPlayerBetAmount) }}
        </div>
        <div>
          ✪ Playing {{ tableStore.numberOfHands }} hand{{
            tableStore.numberOfHands === 1 ? "" : "s"
          }}
        </div>
        <div>
          ✪ Shoe: {{ tableStore.shoe.length }}
          <span>{{ tableStore.shoe.length === 1 ? "card" : "cards" }}</span>
        </div>
        <div>
          ✪ Discard rack: {{ tableStore.discardRack.length }}
          <span>{{
            tableStore.discardRack.length === 1 ? "card" : "cards"
          }}</span>
        </div>
        <div>
          ✪ Dealer will reshuffle at
          {{ tableStore.rules.reshuffleStage * 100 }}% of the shoe
        </div>
        <div>
          ✪ {{ tableStore.calculateCardsRemainingBeforeShuffle }}
          <span>{{
            tableStore.calculateCardsRemainingBeforeShuffle === 1
              ? "card"
              : "cards"
          }}</span>
          remaining before reshuffle
        </div>
        <h3>Table rules</h3>
        <div>
          ✪ Decks to use:
          {{ tableStore.rules.decksToUse }}
        </div>
        <div>✪ Blackjack pays {{ tableStore.rules.blackjackPayoutRate }}</div>
        <div v-if="tableStore.rules.playerCanLateSurrender">
          ✪ Player can late surrender (first two cards only - no split hands)
        </div>
        <div v-else>✪ Player cannot late surrender</div>
        <div v-if="tableStore.rules.insurance.enabled">
          ✪ Insurance is offered - pays
          {{ tableStore.rules.insurance.payoutRate }}
        </div>
        <div v-else>✪ Insurance is not offered</div>
        <div v-if="tableStore.rules.doubleAfterSplit">
          ✪ Double After Split is allowed
        </div>
        <div v-else>✪ Double After Split is not allowed</div>
        <div>✪ {{ tableStore.formatDealerDrawingRule }}</div>
        <div v-if="tableStore.rules.multipleSplitting.enabled">
          ✪ Player may split up to
          {{ tableStore.rules.multipleSplitting.iterations }} times
        </div>
        <div v-else>✪ Player may only split once</div>
        <h3>Rules for Split Aces</h3>
        <div>✪ Player may only split aces once</div>
        <div>✪ Only 1 card for each ace is given</div>
        <h3>Misc rules</h3>
        <div v-if="tableStore.rules.dealerPeeksForBlackjack">
          ✪ Dealer peeks for blackjack (American rule)
        </div>
        <div v-else>✪ Dealer doesn't peek for blackjack (European rule)</div>
        <div v-if="tableStore.rules.sevenCardCharlie">
          ✪ 7-card Charlie is allowed
        </div>
        <div v-else>✪ 7-card Charlie is not allowed</div>
        <div v-if="tableStore.rules.burnCardAfterShuffle">
          ✪ Dealer burns 1 card after shuffling
        </div>
        <div v-else>✪ Dealer does not burn 1 card after shuffling</div>
      </div>
    </div>
    <div class="cards-section">
      <div class="dealer-section">
        <DealerEntity />
      </div>
      <div class="player-section">
        <PlayerEntity />
      </div>
      <div class="phase-section">
        <BlackjackPhase v-if="tableStore.isBlackjackTablePhase" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.blackjack-table {
  display: flex;
  gap: 30px;
}
.text-section {
  width: 230px;
}
.cards-section {
  width: 83%;
}
</style>
