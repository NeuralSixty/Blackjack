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
          ✪ Deck has {{ tableStore.rules.deckPenetration }}% penetration
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
        <div>✪ {{ tableStore.formatDealerDrawingRule }}</div>
        <div>
          ✪ Playing {{ tableStore.numberOfHands }} hand{{
            tableStore.numberOfHands === 1 ? "" : "s"
          }}
        </div>
        <div>✪ Blackjack pays {{ tableStore.rules.blackjackPayoutRate }}</div>
        <h3>Standard rules</h3>
        <div v-if="tableStore.rules.dealerGetsHoleCard">
          ✪ Dealer gets Hole Card (American rule)
        </div>
        <div v-else>✪ Dealer doesn't get Hole Card (European rule)</div>
        <div v-if="tableStore.rules.insurance.enabled">
          ✪ Insurance is offered - pays
          {{ tableStore.rules.insurance.payoutRate }}
        </div>
        <div v-else>✪ Insurance is not offered</div>
        <div v-if="tableStore.rules.playerCanLateSurrender">
          ✪ Player can late surrender (must be first action)
        </div>
        <div v-else>✪ Player cannot late surrender</div>
        <div v-if="tableStore.rules.sevenCardCharlie">
          ✪ 7-card Charlie is allowed
        </div>
        <div v-else>✪ 7-card Charlie is not allowed</div>
        <div v-if="tableStore.rules.burnCardAfterShuffle">
          ✪ Dealer burns a card after shuffling
        </div>
        <div v-else>✪ Dealer does not burn a card after shuffling</div>
        <div v-if="tableStore.rules.allowBlackjackOnSplitHand">
          ✪ Blackjack on split hands is allowed
        </div>
        <div v-else>✪ Blackjack on split hands is not allowed</div>
        <h3>Double Down rules</h3>
        <div v-if="tableStore.rules.europeanDoubleDownOnly">
          ✪ European Double Down is enabled
        </div>
        <div v-else>✪ European Double Down is disabled</div>
        <div v-if="tableStore.rules.doubleAfterSplit">
          ✪ Double After Split is allowed
        </div>
        <div v-else>✪ Double After Split is not allowed</div>
        <div v-if="tableStore.rules.allowInsuranceDoubleDown">
          ✪ Insurance Double Down is allowed
        </div>
        <div v-else>✪ Insurance Double Down is not allowed</div>
        <h3>Split rules</h3>
        <div v-if="tableStore.rules.europeanSplitOnly">
          ✪ European Split is enabled
        </div>
        <div v-else>✪ European Split is disabled</div>
        <div v-if="tableStore.rules.multipleSplitting.enabled">
          ✪ Player may have up to
          {{ tableStore.rules.multipleSplitting.iterations }} split hands
        </div>
        <div v-else>✪ Player may only split once</div>
        <div
          v-if="
            tableStore.rules.multipleSplitting.enabled &&
            tableStore.rules.allowMultipleSplitAces
          "
        >
          ⤷ ✪ Player may also split aces multiple times
        </div>
        <div v-else-if="tableStore.rules.multipleSplitting.enabled">
          ⤷ ✪ Player may only split aces once
        </div>
        <div v-if="tableStore.rules.allowPlayerTurnOnSplitAces">
          ✪ Player is allowed a turn after splitting aces
        </div>
        <div v-else>✪ Only 1 card for each ace is given</div>
        <div v-if="tableStore.rules.allowInsuranceSplit">
          ✪ Insurance split is allowed
        </div>
        <div v-else>✪ Insurance split is not allowed</div>
        <div
          v-if="
            tableStore.rules.allowSurrenderAfterSplit &&
            tableStore.rules.playerCanLateSurrender
          "
        >
          ✪ (Surrender rule) Surrender after split is allowed
        </div>
        <div v-else-if="tableStore.rules.playerCanLateSurrender">
          ✪ (Surrender rule) Surrender after split is not allowed
        </div>
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
