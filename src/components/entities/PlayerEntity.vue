<script setup>
import { storeToRefs } from "pinia";
import { useTableStore } from "@/stores/table";
import { usePlayerStore } from "@/stores/player";
import CardComponent from "@/components/CardComponent.vue";
import BlackjackPhase from "@/components/core/BlackjackPhase.vue";

const tableStore = useTableStore();
const playerStore = usePlayerStore();

const { rules, playerHands } = storeToRefs(tableStore);

const startGame = () => {
  tableStore.initPlayerHands();
  tableStore.goToNextPhase();
};

const placeBet = (playerHandIndex, bet) => {
  playerStore.subtractFromBankRoll(bet);
  tableStore.placePlayerBet(playerHandIndex, bet);
};

const placeBetOnAllPlayerHands = (bet) => {
  for (const [index, playerHand] of playerHands.value.entries()) {
    if (!playerHand.betIsFinished) {
      playerStore.subtractFromBankRoll(bet);
      tableStore.placePlayerBet(index, bet);
    }
  }
};

const resetBet = (playerHandIndex) => {
  playerStore.resetBankRoll(playerHands.value[playerHandIndex].betAmount);
  tableStore.resetPlayerBet(playerHandIndex);
};

const resetAllBets = () => {
  for (const [index, playerHand] of playerHands.value.entries()) {
    if (!playerHand.betIsFinished) {
      playerStore.resetBankRoll(playerHand.betAmount);
      tableStore.resetPlayerBet(index);
    }
  }
};

const finishBet = (playerHandIndex) => {
  tableStore.finishPlayerBet(playerHandIndex);
};

const finishAllBets = () => {
  for (const [index, playerHand] of playerHands.value.entries()) {
    if (playerHand.betAmount) {
      tableStore.finishPlayerBet(index);
    }
  }
};

const goToNextPhase = () => {
  tableStore.goToNextPhase();
};

const doubleInsuranceBet = (playerHandIndex) => {
  const insuranceAmount = playerHands.value[playerHandIndex].insuranceBetAmount;

  playerStore.subtractFromBankRoll(insuranceAmount);
  tableStore.updateInsuranceBetAmount(playerHandIndex, insuranceAmount * 2);
};

const splitInsuranceBet = (playerHandIndex) => {
  const insuranceAmount = playerHands.value[playerHandIndex].insuranceBetAmount;

  playerStore.subtractFromBankRoll(insuranceAmount);
  tableStore.updateInsuranceBetAmount(playerHandIndex + 1, insuranceAmount);
};

const finishInsuranceBet = (playerHandIndex, insure) => {
  if (insure) {
    const insuranceAmount = playerHands.value[playerHandIndex].betAmount / 2;

    playerStore.subtractFromBankRoll(insuranceAmount);
    tableStore.updateInsuranceBetAmount(playerHandIndex, insuranceAmount);
  }

  tableStore.finishPlayerInsuranceBet(playerHandIndex);
};

const finishAllInsuranceBets = (insure) => {
  for (const [index, playerHand] of playerHands.value.entries()) {
    if (insure && !playerHand.insuranceBetIsFinished) {
      const insuranceAmount = playerHand.betAmount / 2;

      playerStore.subtractFromBankRoll(insuranceAmount);
      tableStore.updateInsuranceBetAmount(index, insuranceAmount);
    }

    tableStore.finishPlayerInsuranceBet(index);
  }
};

const getPlayerScore = (playerHandIndex) => {
  let playerScore = playerHands.value[playerHandIndex].score;

  if (playerHands.value[playerHandIndex].softCount) {
    if (playerHands.value[playerHandIndex].hasBlackjack) {
      return "Blackjack!";
    } else if (playerScore === 21) {
      return playerScore;
    } else if (playerHands.value[playerHandIndex].cards.length === 7) {
      return playerScore - 10 + " or " + playerScore + " (7-card Charlie!)";
    } else {
      return playerScore - 10 + " or " + playerScore;
    }
  } else {
    if (playerScore > 21) {
      return playerScore + " (Bust!)";
    } else if (playerHands.value[playerHandIndex].cards.length === 7) {
      return playerScore + " (7-card Charlie!)";
    } else {
      return playerScore;
    }
  }
};

const doubleHand = (playerHandIndex) => {
  if (
    playerHands.value[playerHandIndex].insuranceBetAmount &&
    rules.value.allowInsuranceDoubleDown
  ) {
    doubleInsuranceBet(playerHandIndex);
  }

  placeBet(playerHandIndex, playerHands.value[playerHandIndex].betAmount);
  finishBet(playerHandIndex);

  tableStore.dealCardToPlayer(playerHandIndex);
  tableStore.standPlayerHand(playerHandIndex);
  tableStore.setDoubleOnPlayerHand(playerHandIndex);
};

const splitHand = (playerHandIndex) => {
  tableStore.splitPlayerHand(playerHandIndex);

  if (
    playerHands.value[playerHandIndex].insuranceBetAmount &&
    rules.value.allowInsuranceSplit
  ) {
    splitInsuranceBet(playerHandIndex);
  }

  placeBet(playerHandIndex + 1, playerHands.value[playerHandIndex].betAmount);
  finishBet(playerHandIndex + 1);

  if (
    !rules.value.allowPlayerTurnOnSplitAces &&
    playerHands.value[playerHandIndex].score === 11
  ) {
    tableStore.standPlayerHand(playerHandIndex);
    tableStore.standPlayerHand(playerHandIndex + 1);
  }

  tableStore.dealCardToPlayer(playerHandIndex);
  tableStore.dealCardToPlayer(playerHandIndex + 1);
};

const surrenderHand = (playerHandIndex) => {
  tableStore.surrenderPlayerHand(playerHandIndex);
};
</script>

<template>
  <h2>Player</h2>
  <h4 class="player-stats">Bankroll: {{ playerStore.formatBankRoll }}</h4>
  <div v-if="tableStore.phase >= 5" class="hand-stats">
    <div
      v-for="(n, i) in tableStore.numberOfHands"
      :key="i"
      class="hand-bet-container"
    >
      <div v-if="tableStore.phase >= 5" class="hand-bet">
        <div>
          Hand:
          {{ tableStore.formatNumberToUSD(tableStore.getPlayerHandBet(i)) }}
        </div>
        <div v-if="tableStore.getPlayerHandInsuranceBet(i)">
          <span v-if="tableStore.phase >= 5"
            >Insurance:
            {{
              tableStore.formatNumberToUSD(
                tableStore.getPlayerHandInsuranceBet(i)
              )
            }}</span
          >
        </div>
        <div v-if="tableStore.getPlayerHandInsuranceMoneyLost(i)">
          <span
            v-if="tableStore.phase >= 6 && !tableStore.dealerHand.hasBlackjack"
            >Dealer has no Blackjack -
            {{
              tableStore.formatNumberToUSD(
                tableStore.getPlayerHandInsuranceMoneyLost(i)
              )
            }}
            insurance lost</span
          >
        </div>
        <div v-if="tableStore.playerHands[i].hasSurrendered">
          <span
            >You surrendered your hand ({{
              tableStore.formatNumberToUSD(
                tableStore.playerHands[i].betAmount / 2
              )
            }}
            lost)</span
          >
        </div>
        <div v-if="tableStore.playerHands[i].hasDoubled">
          <span>Doubled down</span>
        </div>
        <div
          v-if="
            tableStore.playerHands[i].hasBlackjack &&
            !tableStore.dealerHand.hasBlackjack &&
            ((tableStore.phase >= 7 && tableStore.rules.dealerGetsHoleCard) ||
              (tableStore.phase >= 9 && !tableStore.rules.dealerGetsHoleCard))
          "
        >
          <span
            >Blackjack pays you
            {{
              tableStore.formatNumberToUSD(
                tableStore.playerHands[i].betAmount *
                  tableStore.calculateBlackjackPayoutRate
              )
            }}
            back!</span
          >
        </div>
      </div>
    </div>
  </div>
  <div class="player-hands">
    <div
      v-for="(n, i) in tableStore.numberOfHands"
      :key="i"
      class="player-card-zone"
    >
      <div class="player-cards-container">
        <template v-if="tableStore.playerHands[i]">
          <CardComponent
            v-for="(cardContainer, cardContainerIndex) in tableStore
              .playerHands[i].cards"
            :key="cardContainerIndex"
            :card-container="cardContainer"
          />
        </template>
      </div>
      <div v-if="tableStore.phase >= 5" class="player-card-values">
        {{ getPlayerScore(i) }}
      </div>
    </div>
  </div>
  <div class="player-actions">
    <div v-if="tableStore.phase === 1" class="starting-actions">
      <h3>Customize rules</h3>
      <div class="input-groups">
        <div class="standard-checkboxes">
          <div><b>Standard rules</b></div>
          <div>
            <span>Dealer gets Hole Card: </span>
            <input
              v-model="tableStore.rules.dealerGetsHoleCard"
              type="checkbox"
            />
          </div>
          <div>
            <span>Offer insurance:</span>
            <input
              v-model="tableStore.rules.insurance.enabled"
              type="checkbox"
            />
          </div>
          <div>
            <span>Player can late surrender:</span>
            <input
              v-model="tableStore.rules.playerCanLateSurrender"
              type="checkbox"
            />
          </div>
          <div>
            <span>7-card Charlie is allowed: </span>
            <input
              v-model="tableStore.rules.sevenCardCharlie"
              type="checkbox"
            />
          </div>
          <div>
            <span>Dealer burns a card after shuffling: </span>
            <input
              v-model="tableStore.rules.burnCardAfterShuffle"
              type="checkbox"
            />
          </div>
          <div>
            <span>Allow Blackjack on split hands: </span>
            <input
              v-model="tableStore.rules.allowBlackjackOnSplitHand"
              type="checkbox"
            />
          </div>
        </div>
        <div class="double-down-checkboxes">
          <div><b>Double Down rules</b></div>
          <div
            title="Doubling down is allowed only on hand values of 9, 10 and 11"
          >
            <span>European Double Down:</span>
            <input
              v-model="tableStore.rules.europeanDoubleDownOnly"
              type="checkbox"
            />
          </div>
          <div>
            <span>Allow Double After Split:</span>
            <input
              v-model="tableStore.rules.doubleAfterSplit"
              type="checkbox"
            />
          </div>
          <div>
            <span>Allow insurance Double Down:</span>
            <input
              v-model="tableStore.rules.allowInsuranceDoubleDown"
              type="checkbox"
            />
          </div>
        </div>
        <div class="split-checkboxes">
          <div><b>Split rules</b></div>
          <div
            title="Split is allowed only on pairs of 10-value cards (10, J, Q, K)"
          >
            <span>European Split: </span>
            <input
              v-model="tableStore.rules.europeanSplitOnly"
              type="checkbox"
            />
          </div>
          <div>
            <span>Player may split multiple times: </span>
            <input
              v-model="tableStore.rules.multipleSplitting.enabled"
              type="checkbox"
            />
          </div>
          <div v-if="tableStore.rules.multipleSplitting.enabled">
            <span>⤷ Allow aces to be split multiple times: </span>
            <input
              v-model="tableStore.rules.allowMultipleSplitAces"
              type="checkbox"
            />
          </div>
          <div>
            <span>Allow player a turn after splitting aces: </span>
            <input
              v-model="tableStore.rules.allowPlayerTurnOnSplitAces"
              type="checkbox"
            />
          </div>
          <div>
            <span>Allow insurance split: </span>
            <input
              v-model="tableStore.rules.allowInsuranceSplit"
              type="checkbox"
            />
          </div>
          <div v-if="tableStore.rules.playerCanLateSurrender">
            <span>(Surrender rule) Allow surrender after split: </span>
            <input
              v-model="tableStore.rules.allowSurrenderAfterSplit"
              type="checkbox"
            />
          </div>
        </div>
        <div class="non-checkboxes">
          <div><b>Table & Dealer rules</b></div>
          <div>
            <span>Decks to use:</span>
            <input
              v-model.number="tableStore.rules.decksToUse"
              type="range"
              min="1"
              max="8"
              step="1"
            />
            <input
              v-model="tableStore.rules.decksToUse"
              disabled
              type="number"
              min="1"
              max="8"
            />
          </div>
          <div>
            <span>Dealer drawing rule:</span>
            <select v-model="tableStore.rules.dealerDrawing">
              <option value="H17">Dealer must hit soft 17</option>
              <option value="S17">Dealer must stand on all 17's</option>
            </select>
          </div>
          <div>
            <span>Number of hands:</span>
            <input
              v-model.number="tableStore.numberOfHands"
              type="range"
              min="1"
              max="7"
              step="1"
            />
            <input
              v-model="tableStore.numberOfHands"
              disabled
              type="number"
              min="1"
              max="7"
            />
          </div>
          <div>
            <span>Blackjack payout:</span>
            <select v-model="tableStore.rules.blackjackPayoutRate">
              <option value="3 to 2">3 to 2</option>
              <option value="6 to 5">6 to 5</option>
            </select>
          </div>
        </div>
      </div>
      <p><button @click="startGame">Start the game</button></p>
    </div>
    <div v-if="tableStore.phase === 3" class="betting-actions-container">
      <template v-for="(n, i) in tableStore.numberOfHands" :key="i">
        <div
          v-if="!tableStore.playerHands[i].betIsFinished"
          class="betting-actions"
        >
          <div class="betting-actions-form">
            <template
              v-if="
                playerStore.bankRollBeforeBet >= 1 * tableStore.numberOfHands
              "
            >
              <span
                >Bet amount:
                {{
                  tableStore.formatNumberToUSD(
                    tableStore.playerHands[i].betAmount
                  )
                }}</span
              >
              <div>
                <button
                  :disabled="playerStore.bankRoll < 1"
                  @click="placeBet(i, 1)"
                >
                  $1
                </button>
                <button
                  :disabled="playerStore.bankRoll < 5"
                  @click="placeBet(i, 5)"
                >
                  $5
                </button>
                <button
                  :disabled="playerStore.bankRoll < 25"
                  @click="placeBet(i, 25)"
                >
                  $25
                </button>
                <button
                  :disabled="playerStore.bankRoll < 100"
                  @click="placeBet(i, 100)"
                >
                  $100
                </button>
                <button
                  :disabled="playerStore.bankRoll < 500"
                  @click="placeBet(i, 500)"
                >
                  $500
                </button>
              </div>
              <div>
                <button
                  :disabled="tableStore.playerHands[i].betAmount === 0"
                  @click="resetBet(i)"
                >
                  Reset bet
                </button>
                <button
                  :disabled="
                    tableStore.playerHands[i].betAmount < 1 ||
                    !tableStore.allPlayerHandsHavePlacedBetAmount
                  "
                  @click="finishBet(i)"
                >
                  Place bet on the table
                </button>
              </div>
            </template>
            <template v-else>
              <span
                >You idiot! You lost all your money to the greedy fat
                casino!</span
              >
            </template>
          </div>
        </div>
        <div v-else class="hidden-betting-actions"></div>
      </template>
    </div>
    <div v-if="tableStore.phase === 5" class="betting-actions-container">
      <template v-for="(n, i) in tableStore.numberOfHands" :key="i">
        <div
          v-if="!tableStore.playerHands[i].insuranceBetIsFinished"
          class="betting-actions"
        >
          <div class="betting-actions-form">
            <span>Insurance?</span>
            <div>
              <button
                :disabled="
                  playerStore.bankRoll < tableStore.playerHands[i].betAmount / 2
                "
                @click="finishInsuranceBet(i, true)"
              >
                Yes
              </button>
              <button @click="finishInsuranceBet(i, false)">No</button>
            </div>
          </div>
        </div>
        <div v-else class="hidden-betting-actions"></div>
      </template>
    </div>
    <div v-if="tableStore.phase === 7" class="betting-actions-container">
      <template v-for="(n, i) in tableStore.numberOfHands" :key="i">
        <div
          v-if="
            !tableStore.playerHands[i].hasBusted &&
            !tableStore.playerHands[i].hasStood &&
            !tableStore.playerHands[i].hasSurrendered &&
            !tableStore.playerHands[i].hasBlackjack &&
            tableStore.playerHands[i].score !== 21
          "
          class="betting-actions"
        >
          <div class="betting-actions-form">
            <div>
              <button @click="tableStore.dealCardToPlayer(i)">Hit</button>
              <button @click="tableStore.standPlayerHand(i)">Stand</button>
              <button
                v-if="tableStore.playerMayDouble(i)"
                :disabled="
                  playerStore.bankRoll <
                  (tableStore.rules.allowInsuranceDoubleDown
                    ? tableStore.playerHands[i].betAmount +
                      tableStore.playerHands[i].insuranceBetAmount
                    : tableStore.playerHands[i].betAmount)
                "
                @click="doubleHand(i)"
              >
                Double
              </button>
              <button
                v-if="tableStore.playerMaySplit(i)"
                :disabled="
                  playerStore.bankRoll <
                  (tableStore.rules.allowInsuranceSplit
                    ? tableStore.playerHands[i].betAmount +
                      tableStore.playerHands[i].insuranceBetAmount
                    : tableStore.playerHands[i].betAmount)
                "
                @click="splitHand(i)"
              >
                Split
              </button>
              <button
                v-if="tableStore.playerMaySurrender(i)"
                @click="surrenderHand(i)"
              >
                Surrender
              </button>
            </div>
          </div>
        </div>
        <div v-else class="hidden-betting-actions"></div>
      </template>
    </div>
  </div>
  <div
    v-if="
      tableStore.isPlayerPhase &&
      playerStore.bankRollBeforeBet >= 1 * tableStore.numberOfHands
    "
    class="player-phase-section"
  >
    <template v-for="(n, i) in tableStore.numberOfHands" :key="i">
      <div
        v-if="
          !tableStore.playerHands[i].betIsFinished &&
          !tableStore.playerHands[i].handIsFinished
        "
        class="player-phase-info"
      >
        <BlackjackPhase />
      </div>
      <div v-else class="hidden-player-phase-info"></div>
    </template>
  </div>
  <div v-if="tableStore.phase === 9" class="player-phase-section">
    <template v-for="(n, i) in tableStore.numberOfHands" :key="i">
      <div v-if="tableStore.phase === 9" class="player-phase-info">
        <div v-if="tableStore.playerAndDealerPushed(tableStore.playerHands[i])">
          <BlackjackPhase result="descriptionPush" />
        </div>
        <div v-else-if="tableStore.playerWon(tableStore.playerHands[i])">
          <BlackjackPhase result="descriptionWin" />
        </div>
        <div v-else>
          <BlackjackPhase
            result="descriptionLost"
            :insurance-payback="
              tableStore.playerHands[i].insuranceBetAmount
                ? tableStore.playerHands[i].insuranceBetAmount
                : 0
            "
          />
        </div>
      </div>
    </template>
  </div>
  <div
    v-if="
      tableStore.phase === 3 &&
      playerStore.bankRollBeforeBet >= 1 * tableStore.numberOfHands &&
      tableStore.numberOfHands > 1
    "
  >
    <div>
      <div>Bet on all hands</div>
      <button
        :disabled="playerStore.bankRoll < 1 * tableStore.numberOfHands"
        @click="placeBetOnAllPlayerHands(1)"
      >
        $1
      </button>
      <button
        :disabled="playerStore.bankRoll < 5 * tableStore.numberOfHands"
        @click="placeBetOnAllPlayerHands(5)"
      >
        $5
      </button>
      <button
        :disabled="playerStore.bankRoll < 25 * tableStore.numberOfHands"
        @click="placeBetOnAllPlayerHands(25)"
      >
        $25
      </button>
      <button
        :disabled="playerStore.bankRoll < 100 * tableStore.numberOfHands"
        @click="placeBetOnAllPlayerHands(100)"
      >
        $100
      </button>
      <button
        :disabled="playerStore.bankRoll < 500 * tableStore.numberOfHands"
        @click="placeBetOnAllPlayerHands(500)"
      >
        $500
      </button>
    </div>
    <div>
      <button
        :disabled="tableStore.getTotalPlayerBetAmount === 0"
        @click="resetAllBets"
      >
        Reset all bets
      </button>
      <button
        :disabled="
          tableStore.getTotalPlayerBetAmount < 1 ||
          tableStore.getTotalUnplacedPlayerBetAmount === 0 ||
          !tableStore.allPlayerHandsHavePlacedBetAmount
        "
        @click="finishAllBets"
      >
        Place all bets on the table
      </button>
    </div>
  </div>
  <div v-if="tableStore.phase === 5 && tableStore.numberOfHands > 1">
    <p>
      <button
        :disabled="
          playerStore.bankRoll <
          tableStore.getHighestPossibleTotalPlayerInsuranceBetAmount
        "
        @click="finishAllInsuranceBets(true)"
      >
        {{
          tableStore.getTotalPlayerInsuranceBetAmount
            ? "Insure the remaining hands"
            : "Insure all hands"
        }}
      </button>
      <button @click="finishAllInsuranceBets(false)">
        {{
          tableStore.getTotalPlayerInsuranceBetAmount
            ? "Do not insure the remaining hands"
            : "Do not insure any hand"
        }}
      </button>
    </p>
  </div>
  <div v-if="tableStore.phase === 9">
    <p><button @click="goToNextPhase">New round</button></p>
  </div>
  <div
    v-if="
      tableStore.phase === 3 &&
      playerStore.bankRollBeforeBet < 1 * tableStore.numberOfHands
    "
  >
    <p>
      <span><b>Game over</b></span>
    </p>
  </div>
</template>

<style scoped>
.player-hands {
  display: flex;
}
.player-card-zone {
  display: flex;
  flex-direction: column;
  justify-content: left;
  align-items: center;
  width: 500px;
  height: 180px;
  border: 2px groove white;
}
.player-cards-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 150px;
}
.player-card-values {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 30px;
  border-top: 1px solid white;
}
.player-actions {
  display: flex;
}
.betting-actions-container {
  display: contents;
}
.betting-actions {
  width: 500px;
  border: 2px groove white;
}
.betting-actions-form {
  padding: 5px;
}
.hidden-betting-actions {
  width: 500px;
  border: 2px groove transparent;
}
.dollar-sign {
  margin-right: 2px;
}
.player-phase-section {
  display: flex;
}
.player-phase-info {
  width: 500px;
  border: 2px groove transparent;
}
.hidden-player-phase-info {
  width: 500px;
  border: 2px groove transparent;
}
.hand-stats {
  display: flex;
}
.hand-bet-container {
  display: flex;
  align-items: center;
  width: 500px;
  height: 80px;
  border: 2px groove white;
}
.hand-bet {
  padding: 5px;
}
.input-groups {
  display: flex;
  gap: 25px;
}
</style>
