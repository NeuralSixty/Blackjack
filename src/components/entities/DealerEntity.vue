<script setup>
import { watch } from "vue";
import { storeToRefs } from "pinia";
import { useTableStore } from "@/stores/table";
import { usePlayerStore } from "@/stores/player";
import { useDeckStore } from "@/stores/deck";
import { useCasinoStore } from "@/stores/casino";
import CardComponent from "@/components/CardComponent.vue";

const tableStore = useTableStore();
const playerStore = usePlayerStore();
const deckStore = useDeckStore();
const casinoStore = useCasinoStore();

const { getDeck } = storeToRefs(deckStore);
const {
  rules,
  shoe,
  dealerHand,
  playerHands,
  calculateCardsRemainingBeforeShuffle,
  calculateBlackjackPayoutRate,
  calculateInsurancePayoutRate,
  dealerShouldAskForInsurance,
  dealerShouldStand,
  allPlayerHandsAreFinished,
  allPlayerHandsAreBusted,
  allPlayerHandsHaveSevenCardCharlie,
  allPlayerHandsHaveBlackjack,
  allPlayerHandsHaveSurrendered,
  allBetsAreFinished,
  allInsuranceBetsAreFinished,
  playerAndDealerPushed,
  playerWon,
} = storeToRefs(tableStore);

const prepareShoe = () => {
  tableStore.putDecksInShoe(
    getDeck.value.flatMap((i) =>
      Array.from({
        length: rules.value.decksToUse,
      }).fill(i)
    )
  );

  tableStore.shuffleShoe();
};

const getDealerScore = () => {
  let firstDealerCardIsFacedDown = false;
  const firstDealerCardValue = dealerHand.value.cards[0].card.value;
  let secondDealerCardValue = 0;

  if (rules.value.dealerGetsHoleCard) {
    firstDealerCardIsFacedDown = dealerHand.value.cards[0].faceDown;
    secondDealerCardValue = dealerHand.value.cards[1].card.value;
  } else if (dealerHand.value.cards.length > 1) {
    secondDealerCardValue = dealerHand.value.cards[1].card.value;
  }

  let dealerScore = dealerHand.value.score;

  if (firstDealerCardIsFacedDown) {
    if (dealerHand.value.softCount) {
      if (firstDealerCardValue === 11) {
        dealerScore -= 1;
      } else {
        dealerScore -= firstDealerCardValue;
      }
    } else {
      dealerScore -= firstDealerCardValue;
    }
  }

  if (dealerHand.value.softCount) {
    if (dealerHand.value.hasBlackjack && !firstDealerCardIsFacedDown) {
      return "Blackjack!";
    } else if (dealerScore === 21) {
      return dealerScore;
    } else if (
      firstDealerCardIsFacedDown &&
      firstDealerCardValue === 11 &&
      secondDealerCardValue !== 11
    ) {
      return dealerScore - 10;
    } else {
      return dealerScore - 10 + " or " + dealerScore;
    }
  } else {
    if (dealerScore > 21) {
      return dealerScore + " (Bust!)";
    } else {
      return dealerScore;
    }
  }
};

watch(tableStore, (newTableStoreState, oldTableStoreState) => {
  // The watcher just likes to watch too much and triggers certain
  // if blocks multiple times, so we're gonna shut it up a bit.
  const newPhase = newTableStoreState.phase;
  const oldPhase = oldTableStoreState.phase;

  // The start of the game (IRL: Dealer starts their shift)
  if (oldPhase === 2 && newPhase === 2 && shoe.value.length === 0) {
    prepareShoe();
    tableStore.shuffleShoe();

    if (rules.value.burnCardAfterShuffle) {
      tableStore.burnCard();
    }

    tableStore.goToNextPhase();
  } else if (oldPhase === 2 && newPhase === 2) {
    if (calculateCardsRemainingBeforeShuffle.value <= 0) {
      tableStore.emptyShoe();
      tableStore.emptyDiscardRack();
      prepareShoe();
      tableStore.shuffleShoe();

      if (rules.value.burnCardAfterShuffle) {
        tableStore.burnCard();
      }
    }

    tableStore.goToNextPhase();
  }

  if (oldPhase === 3 && newPhase === 3) {
    if (allBetsAreFinished.value) {
      tableStore.resetBetState();
      tableStore.goToNextPhase();
    }
  }

  if (oldPhase === 4 && newPhase === 4) {
    if (tableStore.rules.dealerGetsHoleCard) {
      tableStore.dealInitialCardsToPlayer(false);
      tableStore.dealCardToDealer(true);
      tableStore.dealInitialCardsToPlayer(false);
      tableStore.dealCardToDealer(false);
      tableStore.goToNextPhase();
    } else {
      tableStore.dealInitialCardsToPlayer(false);
      tableStore.dealCardToDealer(false);
      tableStore.dealInitialCardsToPlayer(false);
      tableStore.goToNextPhase();
    }
  }

  if (oldPhase === 5 && newPhase === 5) {
    if (!dealerShouldAskForInsurance.value || !rules.value.insurance.enabled) {
      tableStore.goToNextPhase();
    } else {
      if (allInsuranceBetsAreFinished.value) {
        tableStore.resetInsuranceBetState();
        tableStore.goToNextPhase();
      }
    }
  }

  if (oldPhase === 6 && newPhase === 6) {
    if (dealerHand.value.hasBlackjack && rules.value.dealerGetsHoleCard) {
      tableStore.revealDealerFaceDownCard();
      tableStore.finishAllPlayerHands();
    } else if (rules.value.dealerGetsHoleCard) {
      // Dealer peeks and has no Blackjack in American version - collect all insurance bets at this point
      const insuranceMoney = tableStore.collectInsuranceMoneyFromPlayers();
      casinoStore.addToBankRoll(insuranceMoney);
    }

    tableStore.goToNextPhase();
  }

  if (oldPhase === 7 && newPhase === 7) {
    if (allPlayerHandsAreFinished.value) {
      tableStore.goToNextPhase();
    }
  }

  if (oldPhase === 8 && newPhase === 8) {
    if (
      dealerHand.value.hasBlackjack ||
      allPlayerHandsAreBusted.value ||
      allPlayerHandsHaveSevenCardCharlie.value ||
      allPlayerHandsHaveBlackjack.value ||
      allPlayerHandsHaveSurrendered.value
    ) {
      tableStore.revealDealerFaceDownCard();
    } else {
      tableStore.revealDealerFaceDownCard();

      while (!dealerShouldStand.value) {
        tableStore.dealCardToDealer(false);
      }
    }

    tableStore.goToNextPhase();
  }

  // Dealer gives and takes chips accordingly
  if (oldPhase === 9 && newPhase === 9) {
    // European Blackjack insurance - collect all insurance bets only after players finish their hands
    if (!rules.value.dealerGetsHoleCard && !dealerHand.value.hasBlackjack) {
      const insuranceMoney = tableStore.collectInsuranceMoneyFromPlayers();
      casinoStore.addToBankRoll(insuranceMoney);
    }

    for (const playerHand of playerHands.value) {
      if (playerAndDealerPushed.value(playerHand)) {
        playerStore.addToBankRoll(playerHand.betAmount);
      } else if (playerWon.value(playerHand)) {
        if (playerHand.hasBlackjack) {
          const moneyWonByPlayer =
            playerHand.betAmount * calculateBlackjackPayoutRate.value;

          casinoStore.subtractFromBankRoll(moneyWonByPlayer);
          playerStore.addToBankRollBeforeBet(moneyWonByPlayer);
          playerStore.addToBankRoll(playerHand.betAmount + moneyWonByPlayer);
        } else {
          casinoStore.subtractFromBankRoll(playerHand.betAmount);
          playerStore.addToBankRollBeforeBet(playerHand.betAmount);
          playerStore.addToBankRoll(playerHand.betAmount * 2);
        }
      } else {
        if (playerHand.hasSurrendered) {
          casinoStore.addToBankRoll(playerHand.betAmount / 2);
          playerStore.subtractFromBankRollBeforeBet(playerHand.betAmount / 2);
          playerStore.addToBankRoll(playerHand.betAmount / 2);
        } else {
          casinoStore.addToBankRoll(playerHand.betAmount);
          playerStore.subtractFromBankRollBeforeBet(playerHand.betAmount);
        }

        if (playerHand.insuranceBetAmount) {
          const insuranceMoneyToPayBack =
            playerHand.insuranceBetAmount * calculateInsurancePayoutRate.value;

          casinoStore.subtractFromBankRoll(insuranceMoneyToPayBack);
          playerStore.addToBankRollBeforeBet(insuranceMoneyToPayBack);
          playerStore.addToBankRoll(
            playerHand.insuranceBetAmount + insuranceMoneyToPayBack
          );
        }
      }
    }
  }

  if (oldPhase === 10 && newPhase === 10) {
    tableStore.deleteAllPlayerHands();
    tableStore.initPlayerHands();
    tableStore.resetDealerHand();
    tableStore.startNewRound();
  }
});
</script>

<template>
  <h2>Dealer</h2>
  <div class="dealer-card-zone">
    <div class="dealer-cards-container">
      <CardComponent
        v-for="cardContainer in tableStore.dealerHand.cards"
        :key="cardContainer.card.name"
        :card-container="cardContainer"
      />
    </div>
    <div v-if="tableStore.phase >= 5" class="dealer-card-values">
      {{ getDealerScore() }}
    </div>
  </div>
</template>

<style scoped>
.dealer-card-zone {
  display: flex;
  flex-direction: column;
  justify-content: left;
  align-items: center;
  width: 500px;
  height: 180px;
  border: 2px groove white;
}
.dealer-cards-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 150px;
}
.dealer-card-values {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 30px;
  border-top: 1px solid white;
}
</style>
