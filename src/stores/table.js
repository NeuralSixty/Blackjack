import { ref, computed, reactive } from "vue";
import { defineStore } from "pinia";

export const useTableStore = defineStore("table", () => {
  const shoe = ref([]);
  const discardRack = ref([]);
  const phase = ref(1);
  const dealerHand = reactive({
    softCount: 0,
    hasBlackjack: false,
    hasBusted: false,
    hasStood: false,
    handIsFinished: false,
    cards: [],
    score: 0,
  });
  const playerHands = ref([]);
  const numberOfHands = ref(1);
  const rules = reactive({
    decksToUse: 6,
    playerCanLateSurrender: false,
    blackjackPayoutRate: "3 to 2",
    insurance: {
      enabled: true,
      payoutRate: "2 to 1",
    },
    doubleAfterSplit: true,
    dealerDrawing: "H17",
    multipleSplitting: {
      enabled: true,
      iterations: 3,
    },
    reshuffleStage: 0.25,
    sevenCardCharlie: true,
    dealerGetsHoleCard: true,
    burnCardAfterShuffle: true,
    allowInsuranceDoubleDown: false,
    allowInsuranceSplit: false,
    europeanDoubleDownOnly: false,
    europeanSplitOnly: false,
  });

  const dealerShouldStand = computed(() => {
    if (dealerHand.score === 21) {
      return true;
    }

    if (rules.dealerDrawing === "H17") {
      if (dealerHand.score >= 17 && dealerHand.softCount === 0) {
        return true;
      }
    } else if (rules.dealerDrawing === "S17") {
      if (dealerHand.score >= 17) {
        return true;
      }
    } else {
      return true;
    }

    return false;
  });

  const playerMayDouble = computed(() => {
    return (playerHandIndex) => {
      const playerHand = playerHands.value[playerHandIndex];

      if (
        playerHand.cards.length !== 2 ||
        (!rules.doubleAfterSplit && playerHand.splitCount > 0) ||
        (rules.europeanDoubleDownOnly &&
          !(playerHand.score > 8 && playerHand.score < 12))
      ) {
        return false;
      }

      return true;
    };
  });

  const playerMaySplit = computed(() => {
    return (playerHandIndex) => {
      const playerHand = playerHands.value[playerHandIndex];

      if (
        playerHand.cards.length === 2 &&
        !playerHand.hasSplit &&
        playerHand.splitCount <
          (rules.multipleSplitting.enabled
            ? rules.multipleSplitting.iterations
            : 1) &&
        playerHand.cards[0].card.value === playerHand.cards[1].card.value &&
        !(
          rules.europeanSplitOnly &&
          !(
            playerHand.cards[0].card.value === 10 &&
            playerHand.cards[1].card.value === 10
          )
        )
      ) {
        return true;
      }

      return false;
    };
  });

  const playerMaySurrender = computed(() => {
    return (playerHandIndex) => {
      const playerHand = playerHands.value[playerHandIndex];

      if (
        rules.playerCanLateSurrender &&
        playerHand.cards.length === 2 &&
        !playerHand.splitCount > 0 &&
        !playerHand.hasSplit
      ) {
        return true;
      }

      return false;
    };
  });

  const playerWon = computed(() => {
    return (playerHand) => {
      if (
        playerHand.hasBlackjack &&
        !dealerHand.hasBlackjack &&
        !playerHand.hasSurrendered
      ) {
        return true;
      }

      if (playerHand.score > dealerHand.score && !playerHand.hasSurrendered) {
        if (!playerHand.hasBusted) {
          return true;
        }
      }

      if (dealerHand.hasBusted && !playerHand.hasBusted) {
        return true;
      }

      if (
        rules.sevenCardCharlie &&
        playerHand.cards.length === 7 &&
        !playerHand.hasBusted
      ) {
        return true;
      }

      return false;
    };
  });

  const playerAndDealerPushed = computed(() => {
    return (playerHand) => {
      if (dealerHand.hasBlackjack && playerHand.hasBlackjack) {
        return true;
      }

      if (
        dealerHand.score === playerHand.score &&
        !(dealerHand.hasBlackjack || playerHand.hasBlackjack)
      ) {
        return true;
      }

      return false;
    };
  });

  // The function is computationally reliable before insurance bets,
  // and visually reliable during them.
  const getTotalPlayerBetAmount = computed(() => {
    if (playerHands.value.length > 0) {
      return playerHands.value
        .map((hand) => {
          return hand.betAmount + hand.insuranceBetAmount;
        })
        .reduce((previousBet, bet) => {
          return previousBet + bet;
        });
    } else {
      return 0;
    }
  });

  const getTotalUnplacedPlayerBetAmount = computed(() => {
    if (playerHands.value.length > 0) {
      return playerHands.value
        .map((hand) => {
          return !hand.betIsFinished
            ? hand.betAmount + hand.insuranceBetAmount
            : 0;
        })
        .reduce((previousBet, bet) => {
          return previousBet + bet;
        });
    } else {
      return 0;
    }
  });

  const getTotalPlayerInsuranceBetAmount = computed(() => {
    if (playerHands.value.length > 0) {
      return playerHands.value
        .map((hand) => {
          return hand.insuranceBetAmount;
        })
        .reduce((previousBet, bet) => {
          return previousBet + bet;
        });
    } else {
      return 0;
    }
  });

  const getHighestPossibleTotalPlayerInsuranceBetAmount = computed(() => {
    if (playerHands.value.length > 0) {
      return playerHands.value
        .map((hand) => {
          return !hand.insuranceBetIsFinished ? hand.betAmount / 2 : 0;
        })
        .reduce(
          (
            previousHighestPossibleInsuranceBet,
            highestPossibleInsuranceBet
          ) => {
            return (
              previousHighestPossibleInsuranceBet + highestPossibleInsuranceBet
            );
          }
        );
    } else {
      return 0;
    }
  });

  const formatNumberToUSD = computed(() => {
    return (money) => {
      return money.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits:
          (Math.round(money * 100) / 100) % 1 === 0 ? 0 : 2,
      });
    };
  });

  const getPlayerHandBet = computed(() => {
    return (playerHand) => {
      if (playerHands.value.length > 0 && playerHands.value[playerHand]) {
        return playerHands.value[playerHand].betAmount;
      }
    };
  });

  const getPlayerHandInsuranceBet = computed(() => {
    return (playerHand) => {
      if (playerHands.value.length > 0 && playerHands.value[playerHand]) {
        return playerHands.value[playerHand].insuranceBetAmount;
      }
    };
  });

  const getPlayerHandInsuranceMoneyLost = computed(() => {
    return (playerHand) => {
      if (playerHands.value.length > 0 && playerHands.value[playerHand]) {
        return playerHands.value[playerHand].insuranceMoneyLost;
      }
    };
  });

  const dealerShouldAskForInsurance = computed(() => {
    if (rules.dealerGetsHoleCard && dealerHand.cards.length === 2) {
      return dealerHand.cards[1].card.value === 11;
    } else if (!rules.dealerGetsHoleCard && dealerHand.cards.length === 1) {
      return dealerHand.cards[0].card.value === 11;
    } else {
      return false;
    }
  });

  const isBlackjackTablePhase = computed(() => {
    const blackjackTablePhases = [1, 2, 4, 5, 6, 8, 9, 10];

    return blackjackTablePhases.indexOf(phase.value) >= 0 ? true : false;
  });

  const isPlayerPhase = computed(() => {
    const playerPhases = [3, 7];

    return playerPhases.indexOf(phase.value) >= 0 ? true : false;
  });

  const allBetsAreFinished = computed(() => {
    return playerHands.value.every((hand) => {
      return hand.betIsFinished === true;
    });
  });

  const allInsuranceBetsAreFinished = computed(() => {
    return playerHands.value.every((hand) => {
      return hand.insuranceBetIsFinished === true;
    });
  });

  const allPlayerHandsHavePlacedBetAmount = computed(() => {
    return playerHands.value.every((hand) => {
      return hand.betAmount > 0;
    });
  });

  const allPlayerHandsAreFinished = computed(() => {
    return playerHands.value.every((hand) => {
      return hand.handIsFinished === true;
    });
  });

  const allPlayerHandsAreBusted = computed(() => {
    return playerHands.value.every((hand) => {
      return hand.hasBusted === true;
    });
  });

  const allPlayerHandsHaveSevenCardCharlie = computed(() => {
    return playerHands.value.every((hand) => {
      return hand.hasSevenCardCharlie === true;
    });
  });

  const allPlayerHandsHaveBlackjack = computed(() => {
    return playerHands.value.every((hand) => {
      return hand.hasBlackjack === true;
    });
  });

  const allPlayerHandsHaveSurrendered = computed(() => {
    return playerHands.value.every((hand) => {
      return hand.hasSurrendered === true;
    });
  });

  const calculateCardsRemainingBeforeShuffle = computed(() => {
    let cardsHeldByPlayers = 0;

    for (const hand of playerHands.value) {
      cardsHeldByPlayers += hand.cards.length;
    }

    const totalCards =
      shoe.value.length +
      discardRack.value.length +
      dealerHand.cards.length +
      cardsHeldByPlayers;

    const cardsLeftBeforeReshuffle =
      shoe.value.length - Math.ceil(totalCards * rules.reshuffleStage);

    return cardsLeftBeforeReshuffle < 0 ? 0 : cardsLeftBeforeReshuffle;
  });

  const calculateBlackjackPayoutRate = computed(() => {
    const calculations = {
      "3 to 2": 1.5,
    };

    return calculations[rules.blackjackPayoutRate];
  });

  const calculateInsurancePayoutRate = computed(() => {
    const calculations = {
      "2 to 1": 2,
    };

    return calculations[rules.insurance.payoutRate];
  });

  const formatDealerDrawingRule = computed(() => {
    const formats = {
      H17: "Dealer must hit soft 17",
      S17: "Dealer must stand on all 17's",
    };

    return formats[rules.dealerDrawing];
  });

  const resetBetState = () => {
    playerHands.value.map((hand) => {
      hand.betIsFinished = false;
    });
  };

  const resetInsuranceBetState = () => {
    playerHands.value.map((hand) => {
      hand.insuranceBetIsFinished = false;
    });
  };

  const initPlayerHands = () => {
    for (let i = 0; i < numberOfHands.value; i++) {
      if (!playerHands.value[i]) {
        playerHands.value[i] = {};
      }

      playerHands.value[i].betAmount = 0;
      playerHands.value[i].betIsFinished = false;
      playerHands.value[i].insuranceBetAmount = 0;
      playerHands.value[i].insuranceMoneyLost = 0;
      playerHands.value[i].insuranceBetIsFinished = false;
      playerHands.value[i].softCount = 0;
      playerHands.value[i].hasBlackjack = false;
      playerHands.value[i].hasSevenCardCharlie = false;
      playerHands.value[i].hasBusted = false;
      playerHands.value[i].hasStood = false;
      playerHands.value[i].hasSurrendered = false;
      playerHands.value[i].hasDoubled = false;
      playerHands.value[i].handIsFinished = false;
      playerHands.value[i].hasSplit = false;
      playerHands.value[i].splitCount = 0;
      playerHands.value[i].cards = [];
      playerHands.value[i].score = 0;
    }
  };

  const deleteAllPlayerHands = () => {
    for (let i = 0; i < playerHands.value.length; i++) {
      const hand = playerHands.value[i];

      if (hand.splitCount > 0) {
        numberOfHands.value--;
      }
    }

    playerHands.value.length = 0;
  };

  const placePlayerBet = (hand, bet) => {
    playerHands.value[hand].betAmount += bet;
  };

  const resetPlayerBet = (hand) => {
    playerHands.value[hand].betAmount = 0;
  };

  const finishPlayerBet = (hand) => {
    playerHands.value[hand].betIsFinished = true;
  };

  const goToNextPhase = () => {
    phase.value++;
  };

  const putDecksInShoe = (decks) => {
    shoe.value = decks;
  };

  const shuffleShoe = () => {
    // Durstenfeld shuffle -> O(n)
    for (let i = shoe.value.length - 1; i > 0; i--) {
      let j = Math.floor(Math.random() * (i + 1));
      let temp = shoe.value[i];
      shoe.value[i] = shoe.value[j];
      shoe.value[j] = temp;
    }
  };

  const emptyShoe = () => {
    shoe.value.length = 0;
  };

  const emptyDiscardRack = () => {
    discardRack.value.length = 0;
  };

  const dealInitialCardsToPlayer = (faceDown) => {
    for (const hand of playerHands.value) {
      const cardPulledOutOfShoe = shoe.value.pop();

      if (cardPulledOutOfShoe.value === 11) {
        hand.softCount += 1;

        if (cardPulledOutOfShoe.value + hand.score <= 21) {
          hand.score += cardPulledOutOfShoe.value;
        } else {
          hand.softCount -= 1;
          hand.score += 1;
        }
      } else {
        hand.score += cardPulledOutOfShoe.value;
      }

      hand.cards.push({ faceDown: faceDown, card: cardPulledOutOfShoe });

      if (hand.cards.length === 2 && hand.score === 21) {
        hand.hasBlackjack = true;
        hand.betIsFinished = true;
        hand.insuranceBetIsFinished = true;
        hand.handIsFinished = true;
      } else if (hand.score === 21) {
        hand.handIsFinished = true;
      } else if (hand.score > 21) {
        if (hand.softCount) {
          hand.score -= 10;
          hand.softCount -= 1;

          if (hand.score === 21) {
            hand.handIsFinished = true;
          }
        } else {
          hand.hasBusted = true;
          hand.handIsFinished = true;
        }
      }
    }
  };

  const dealCardToPlayer = (handIndex) => {
    const hand = playerHands.value[handIndex];
    const cardPulledOutOfShoe = shoe.value.pop();

    if (cardPulledOutOfShoe.value === 11) {
      hand.softCount += 1;

      if (cardPulledOutOfShoe.value + hand.score <= 21) {
        hand.score += cardPulledOutOfShoe.value;
      } else {
        hand.softCount -= 1;
        hand.score += 1;
      }
    } else {
      hand.score += cardPulledOutOfShoe.value;
    }

    hand.cards.push({ faceDown: false, card: cardPulledOutOfShoe });

    if (hand.cards.length === 2 && hand.score === 21) {
      hand.hasBlackjack = true;
      hand.betIsFinished = true;
      hand.insuranceBetIsFinished = true;
      hand.handIsFinished = true;
    } else if (hand.score === 21) {
      hand.handIsFinished = true;
    } else if (hand.score > 21) {
      if (hand.softCount) {
        hand.score -= 10;
        hand.softCount -= 1;

        if (hand.score === 21) {
          hand.handIsFinished = true;
        }
      } else {
        hand.hasBusted = true;
        hand.handIsFinished = true;
      }
    } else if (hand.cards.length === 7 && rules.sevenCardCharlie) {
      hand.hasSevenCardCharlie = true;
      hand.handIsFinished = true;
    }
  };

  const dealCardToDealer = (faceDown) => {
    const cardPulledOutOfShoe = shoe.value.pop();

    if (cardPulledOutOfShoe.value === 11) {
      dealerHand.softCount += 1;

      if (cardPulledOutOfShoe.value + dealerHand.score <= 21) {
        dealerHand.score += cardPulledOutOfShoe.value;
      } else {
        dealerHand.softCount -= 1;
        dealerHand.score += 1;
      }
    } else {
      dealerHand.score += cardPulledOutOfShoe.value;
    }

    dealerHand.cards.push({ faceDown: faceDown, card: cardPulledOutOfShoe });

    if (dealerHand.cards.length === 2 && dealerHand.score === 21) {
      dealerHand.hasBlackjack = true;
      dealerHand.handIsFinished = true;
    } else if (dealerHand.score === 21) {
      dealerHand.handIsFinished = true;
    } else if (dealerHand.score > 21) {
      if (dealerHand.softCount) {
        dealerHand.score -= 10;
        dealerHand.softCount -= 1;

        if (dealerHand.score === 21) {
          dealerHand.handIsFinished = true;
        }
      } else {
        dealerHand.hasBusted = true;
        dealerHand.handIsFinished = true;
      }
    }
  };

  const revealDealerFaceDownCard = () => {
    if (rules.dealerGetsHoleCard) {
      for (const hand of dealerHand.cards) {
        if (hand.faceDown) {
          hand.faceDown = false;
        }
      }
    }
  };

  const finishAllPlayerHands = () => {
    for (const hand of playerHands.value) {
      hand.handIsFinished = true;
    }
  };

  const standPlayerHand = (handIndex) => {
    const hand = playerHands.value[handIndex];

    hand.hasStood = true;
    hand.handIsFinished = true;
  };

  const surrenderPlayerHand = (handIndex) => {
    const hand = playerHands.value[handIndex];

    hand.hasSurrendered = true;
    hand.handIsFinished = true;
  };

  const collectInsuranceMoneyFromPlayers = () => {
    let collectedMoney = 0;

    for (const hand of playerHands.value) {
      collectedMoney += hand.insuranceBetAmount;
      hand.insuranceMoneyLost += hand.insuranceBetAmount;
      hand.insuranceBetAmount = 0;
    }

    return collectedMoney;
  };

  const burnCard = () => {
    discardRack.value.push(shoe.value.pop());
  };

  const updateInsuranceBetAmount = (hand, insuranceBet) => {
    playerHands.value[hand].insuranceBetAmount = insuranceBet;
  };

  const finishPlayerInsuranceBet = (hand) => {
    playerHands.value[hand].insuranceBetIsFinished = true;
  };

  const setDoubleOnPlayerHand = (hand) => {
    playerHands.value[hand].hasDoubled = true;
  };

  const resetPlayerHands = () => {
    for (let i = 0; i < playerHands.value.length; i++) {
      const hand = playerHands.value[i];

      for (const cardItem of hand.cards) {
        discardRack.value.push(cardItem);
      }

      hand.cards.length = 0;

      if (hand.splitCount > 0) {
        numberOfHands.value--;
        playerHands.value.splice(i, 1);
        i--;
      } else {
        hand.betAmount = 0;
        hand.betIsFinished = false;
        hand.insuranceBetAmount = 0;
        hand.insuranceMoneyLost = 0;
        hand.insuranceBetIsFinished = false;
        hand.softCount = 0;
        hand.hasBlackjack = false;
        hand.hasSevenCardCharlie = false;
        hand.hasBusted = false;
        hand.hasStood = false;
        hand.hasSurrendered = false;
        hand.hasDoubled = false;
        hand.handIsFinished = false;
        hand.hasSplit = false;
        hand.splitCount = 0;
        hand.score = 0;
      }
    }
  };

  const resetDealerHand = () => {
    dealerHand.softCount = 0;
    dealerHand.hasBlackjack = false;
    dealerHand.hasBusted = false;
    dealerHand.hasStood = false;
    dealerHand.handIsFinished = false;
    dealerHand.score = 0;

    for (const cardItem of dealerHand.cards) {
      discardRack.value.push(cardItem);
    }

    dealerHand.cards.length = 0;
  };

  const startNewRound = () => {
    phase.value = 2;
  };

  const startNewGame = () => {
    phase.value = 1;
  };

  const splitPlayerHand = (handIndex) => {
    let newHand = {
      betAmount: 0,
      betIsFinished: false,
      insuranceBetAmount: 0,
      insuranceMoneyLost: 0,
      insuranceBetIsFinished: false,
      softCount: 0,
      hasBlackjack: false,
      hasSevenCardCharlie: false,
      hasBusted: false,
      hasStood: false,
      hasSurrendered: false,
      hasDoubled: false,
      handIsFinished: false,
      hasSplit: false,
      splitCount: playerHands.value[handIndex].splitCount + 1,
      score: 0,
      cards: [],
    };

    const cardToBeSplit = playerHands.value[handIndex].cards.pop();

    playerHands.value[handIndex].hasSplit = true;

    newHand.cards.push(cardToBeSplit);
    newHand.score += cardToBeSplit.card.value;

    if (cardToBeSplit.card.value === 11) {
      newHand.softCount++;
      playerHands.value[handIndex].score -= 1;
    } else {
      playerHands.value[handIndex].score -= cardToBeSplit.card.value;
    }

    playerHands.value.splice(handIndex + 1, 0, newHand);
    numberOfHands.value++;
  };

  return {
    shoe,
    discardRack,
    phase,
    dealerHand,
    playerHands,
    numberOfHands,
    rules,
    dealerShouldStand,
    playerMayDouble,
    playerMaySplit,
    playerMaySurrender,
    playerWon,
    playerAndDealerPushed,
    getTotalPlayerBetAmount,
    getTotalUnplacedPlayerBetAmount,
    getTotalPlayerInsuranceBetAmount,
    getHighestPossibleTotalPlayerInsuranceBetAmount,
    formatNumberToUSD,
    getPlayerHandBet,
    getPlayerHandInsuranceBet,
    getPlayerHandInsuranceMoneyLost,
    dealerShouldAskForInsurance,
    isBlackjackTablePhase,
    isPlayerPhase,
    allBetsAreFinished,
    allInsuranceBetsAreFinished,
    allPlayerHandsHavePlacedBetAmount,
    allPlayerHandsAreFinished,
    allPlayerHandsAreBusted,
    allPlayerHandsHaveSevenCardCharlie,
    allPlayerHandsHaveBlackjack,
    allPlayerHandsHaveSurrendered,
    calculateCardsRemainingBeforeShuffle,
    calculateBlackjackPayoutRate,
    calculateInsurancePayoutRate,
    formatDealerDrawingRule,
    resetBetState,
    resetInsuranceBetState,
    initPlayerHands,
    deleteAllPlayerHands,
    placePlayerBet,
    resetPlayerBet,
    finishPlayerBet,
    goToNextPhase,
    putDecksInShoe,
    shuffleShoe,
    emptyShoe,
    emptyDiscardRack,
    dealInitialCardsToPlayer,
    dealCardToPlayer,
    dealCardToDealer,
    revealDealerFaceDownCard,
    finishAllPlayerHands,
    standPlayerHand,
    surrenderPlayerHand,
    collectInsuranceMoneyFromPlayers,
    burnCard,
    updateInsuranceBetAmount,
    finishPlayerInsuranceBet,
    setDoubleOnPlayerHand,
    resetPlayerHands,
    resetDealerHand,
    startNewRound,
    startNewGame,
    splitPlayerHand,
  };
});
