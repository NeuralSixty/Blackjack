import { ref, computed, reactive } from "vue";
import { defineStore } from "pinia";

const swap = (array, first, second) => {
  let temp;

  temp = array[first];
  array[first] = array[second];
  array[second] = temp;
};

const cryptoRandomNumber = (min, max) => {
  const range = max - min;
  const bytesNeeded = Math.ceil(Math.log2(range) / 8);
  const randomBytes = new Uint8Array(bytesNeeded);
  const maximumRange = Math.pow(Math.pow(2, 8), bytesNeeded);
  const extendedRange = Math.floor(maximumRange / range) * range;
  let i = 0;
  let randomInteger = 0;

  for (;;) {
    window.crypto.getRandomValues(randomBytes);
    randomInteger = 0;

    for (i = 0; i < bytesNeeded; i++) {
      randomInteger <<= 8;
      randomInteger += randomBytes[i];
    }

    if (randomInteger < extendedRange) {
      randomInteger %= range;

      break;
    }
  }

  return min + randomInteger;
};

const bytesToHex = (bytes) => {
  let hexString = "";
  let hex = "";

  for (let i = 0; i < bytes.length; i++) {
    hex = bytes[i].toString(16);

    if (hex.length === 1) hex = "0" + hex;
    hexString += hex;
  }

  return hexString;
};

const cryptoRandom32ByteString = () => {
  return bytesToHex(window.crypto.getRandomValues(new Uint8Array(32)));
};

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
      iterations: 4,
    },
    deckPenetration: 75,
    sevenCardCharlie: true,
    dealerGetsHoleCard: true,
    burnCardAfterShuffle: true,
    allowInsuranceDoubleDown: false,
    allowInsuranceSplit: false,
    europeanDoubleDownOnly: false,
    europeanSplitOnly: false,
    allowBlackjackOnSplitHand: false,
    allowMultipleSplitAces: false,
    allowPlayerTurnOnSplitAces: false,
    allowSurrenderAfterSplit: false,
  });

  const getSplitHandAmount = computed(() => {
    return (playerUid) => {
      let amount = 0;

      for (const playerHand of playerHands.value) {
        if (playerHand.playerUid === playerUid && playerHand.hasSplit) {
          amount++;
        }
      }

      return amount;
    };
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
        (!rules.doubleAfterSplit &&
          getSplitHandAmount.value(playerHand.playerUid) > 0) ||
        (rules.europeanDoubleDownOnly &&
          !(
            (playerHand.score > 8 && playerHand.score < 12) ||
            (playerHand.softCount !== 0 &&
              playerHand.score - 10 > 8 &&
              playerHand.score - 10 < 12)
          ))
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
        getSplitHandAmount.value(playerHand.playerUid) <
          (rules.multipleSplitting.enabled &&
          !(
            !rules.allowMultipleSplitAces &&
            playerHand.cards[0].card.value === 11 &&
            playerHand.cards[1].card.value === 11
          )
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
        !(!rules.allowSurrenderAfterSplit && playerHand.hasSplit)
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
        .map((playerHand) => {
          return playerHand.betAmount + playerHand.insuranceBetAmount;
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
        .map((playerHand) => {
          return !playerHand.betIsFinished
            ? playerHand.betAmount + playerHand.insuranceBetAmount
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
        .map((playerHand) => {
          return playerHand.insuranceBetAmount;
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
        .map((playerHand) => {
          return !playerHand.insuranceBetIsFinished
            ? playerHand.betAmount / 2
            : 0;
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
    return playerHands.value.every((playerHand) => {
      return playerHand.betIsFinished === true;
    });
  });

  const allInsuranceBetsAreFinished = computed(() => {
    return playerHands.value.every((playerHand) => {
      return playerHand.insuranceBetIsFinished === true;
    });
  });

  const allPlayerHandsHavePlacedBetAmount = computed(() => {
    return playerHands.value.every((playerHand) => {
      return playerHand.betAmount > 0;
    });
  });

  const allPlayerHandsAreFinished = computed(() => {
    return playerHands.value.every((playerHand) => {
      return playerHand.handIsFinished === true;
    });
  });

  const allPlayerHandsAreBusted = computed(() => {
    return playerHands.value.every((playerHand) => {
      return playerHand.hasBusted === true;
    });
  });

  const allPlayerHandsHaveSevenCardCharlie = computed(() => {
    return playerHands.value.every((playerHand) => {
      return playerHand.hasSevenCardCharlie === true;
    });
  });

  const allPlayerHandsHaveBlackjack = computed(() => {
    return playerHands.value.every((playerHand) => {
      return playerHand.hasBlackjack === true;
    });
  });

  const allPlayerHandsHaveSurrendered = computed(() => {
    return playerHands.value.every((playerHand) => {
      return playerHand.hasSurrendered === true;
    });
  });

  const calculateCardsRemainingBeforeShuffle = computed(() => {
    let cardsHeldByPlayers = 0;

    for (const playerHand of playerHands.value) {
      cardsHeldByPlayers += playerHand.cards.length;
    }

    const totalCards =
      shoe.value.length +
      discardRack.value.length +
      dealerHand.cards.length +
      cardsHeldByPlayers;

    const cardsLeftBeforeReshuffle =
      shoe.value.length -
      Math.ceil(totalCards * (1 - rules.deckPenetration / 100));

    return cardsLeftBeforeReshuffle < 0 ? 0 : cardsLeftBeforeReshuffle;
  });

  const calculateBlackjackPayoutRate = computed(() => {
    const calculations = {
      "3 to 2": 1.5,
      "6 to 5": 1.2,
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
    playerHands.value.map((playerHand) => {
      playerHand.betIsFinished = false;
    });
  };

  const resetInsuranceBetState = () => {
    playerHands.value.map((playerHand) => {
      playerHand.insuranceBetIsFinished = false;
    });
  };

  const initPlayerHands = () => {
    for (let i = 0; i < numberOfHands.value; i++) {
      if (!playerHands.value[i]) {
        playerHands.value[i] = {};
      }

      playerHands.value[i].playerUid = cryptoRandom32ByteString();
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
      playerHands.value[i].cards = [];
      playerHands.value[i].score = 0;
      playerHands.value[i].originalHand = true;
    }
  };

  const deleteAllPlayerHands = () => {
    for (let i = 0; i < playerHands.value.length; i++) {
      const playerHand = playerHands.value[i];

      if (
        getSplitHandAmount.value(playerHand.playerUid) > 0 &&
        !playerHand.originalHand
      ) {
        numberOfHands.value--;
      }

      for (const cardItem of playerHand.cards) {
        discardRack.value.push(cardItem.card);
      }
    }

    playerHands.value.length = 0;
  };

  const placePlayerBet = (playerHandIndex, bet) => {
    playerHands.value[playerHandIndex].betAmount += bet;
  };

  const resetPlayerBet = (playerHandIndex) => {
    playerHands.value[playerHandIndex].betAmount = 0;
  };

  const finishPlayerBet = (playerHandIndex) => {
    playerHands.value[playerHandIndex].betIsFinished = true;
  };

  const goToNextPhase = () => {
    phase.value++;
  };

  const putDecksInShoe = (decks) => {
    shoe.value = decks;
  };

  const shuffleShoe = () => {
    let i = 0;
    let j = 0;

    for (i = shoe.value.length - 1; i > 0; i--) {
      j = cryptoRandomNumber(0, i + 1);
      swap(shoe.value, i, j);
    }
  };

  const emptyShoe = () => {
    shoe.value.length = 0;
  };

  const emptyDiscardRack = () => {
    discardRack.value.length = 0;
  };

  const dealInitialCardsToPlayer = (faceDown) => {
    for (const playerHand of playerHands.value) {
      const cardPulledOutOfShoe = shoe.value.pop();

      if (cardPulledOutOfShoe.value === 11) {
        playerHand.softCount += 1;

        if (cardPulledOutOfShoe.value + playerHand.score <= 21) {
          playerHand.score += cardPulledOutOfShoe.value;
        } else {
          playerHand.softCount -= 1;
          playerHand.score += 1;
        }
      } else {
        playerHand.score += cardPulledOutOfShoe.value;
      }

      playerHand.cards.push({ faceDown: faceDown, card: cardPulledOutOfShoe });

      if (playerHand.cards.length === 2 && playerHand.score === 21) {
        playerHand.hasBlackjack = true;
        playerHand.betIsFinished = true;
        playerHand.insuranceBetIsFinished = true;
        playerHand.handIsFinished = true;
      } else if (playerHand.score === 21) {
        playerHand.handIsFinished = true;
      } else if (playerHand.score > 21) {
        if (playerHand.softCount) {
          playerHand.score -= 10;
          playerHand.softCount -= 1;

          if (playerHand.score === 21) {
            playerHand.handIsFinished = true;
          }
        } else {
          playerHand.hasBusted = true;
          playerHand.handIsFinished = true;
        }
      }
    }
  };

  const dealCardToPlayer = (playerHandIndex) => {
    const playerHand = playerHands.value[playerHandIndex];
    const cardPulledOutOfShoe = shoe.value.pop();

    if (cardPulledOutOfShoe.value === 11) {
      playerHand.softCount += 1;

      if (cardPulledOutOfShoe.value + playerHand.score <= 21) {
        playerHand.score += cardPulledOutOfShoe.value;
      } else {
        playerHand.softCount -= 1;
        playerHand.score += 1;
      }
    } else {
      playerHand.score += cardPulledOutOfShoe.value;
    }

    playerHand.cards.push({ faceDown: false, card: cardPulledOutOfShoe });

    if (
      playerHand.cards.length === 2 &&
      playerHand.score === 21 &&
      !(!rules.allowBlackjackOnSplitHand && playerHand.hasSplit)
    ) {
      playerHand.hasBlackjack = true;
      playerHand.betIsFinished = true;
      playerHand.insuranceBetIsFinished = true;
      playerHand.handIsFinished = true;
    } else if (playerHand.score === 21) {
      playerHand.betIsFinished = true;
      playerHand.insuranceBetIsFinished = true;
      playerHand.handIsFinished = true;
    } else if (playerHand.score > 21) {
      if (playerHand.softCount) {
        playerHand.score -= 10;
        playerHand.softCount -= 1;

        if (playerHand.score === 21) {
          playerHand.handIsFinished = true;
        }
      } else {
        playerHand.hasBusted = true;
        playerHand.handIsFinished = true;
      }
    } else if (playerHand.cards.length === 7 && rules.sevenCardCharlie) {
      playerHand.hasSevenCardCharlie = true;
      playerHand.handIsFinished = true;
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
      for (const playerHand of dealerHand.cards) {
        if (playerHand.faceDown) {
          playerHand.faceDown = false;
        }
      }
    }
  };

  const finishAllPlayerHands = () => {
    for (const playerHand of playerHands.value) {
      playerHand.handIsFinished = true;
    }
  };

  const standPlayerHand = (playerHandIndex) => {
    const playerHand = playerHands.value[playerHandIndex];

    playerHand.hasStood = true;
    playerHand.handIsFinished = true;
  };

  const surrenderPlayerHand = (playerHandIndex) => {
    const playerHand = playerHands.value[playerHandIndex];

    playerHand.hasSurrendered = true;
    playerHand.handIsFinished = true;
  };

  const collectInsuranceMoneyFromPlayers = () => {
    let collectedMoney = 0;

    for (const playerHand of playerHands.value) {
      collectedMoney += playerHand.insuranceBetAmount;
      playerHand.insuranceMoneyLost += playerHand.insuranceBetAmount;
      playerHand.insuranceBetAmount = 0;
    }

    return collectedMoney;
  };

  const burnCard = () => {
    discardRack.value.push(shoe.value.pop());
  };

  const updateInsuranceBetAmount = (playerHandIndex, insuranceBet) => {
    playerHands.value[playerHandIndex].insuranceBetAmount = insuranceBet;
  };

  const finishPlayerInsuranceBet = (playerHandIndex) => {
    playerHands.value[playerHandIndex].insuranceBetIsFinished = true;
  };

  const setDoubleOnPlayerHand = (playerHandIndex) => {
    playerHands.value[playerHandIndex].hasDoubled = true;
  };

  const resetDealerHand = () => {
    dealerHand.softCount = 0;
    dealerHand.hasBlackjack = false;
    dealerHand.hasBusted = false;
    dealerHand.hasStood = false;
    dealerHand.handIsFinished = false;
    dealerHand.score = 0;

    for (const cardItem of dealerHand.cards) {
      discardRack.value.push(cardItem.card);
    }

    dealerHand.cards.length = 0;
  };

  const startNewRound = () => {
    phase.value = 2;
  };

  const startNewGame = () => {
    phase.value = 1;
  };

  const splitPlayerHand = (playerHandIndex) => {
    let newHand = {
      playerUid: "",
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
      hasSplit: true,
      score: 0,
      cards: [],
      originalHand: false,
    };

    newHand.playerUid = playerHands.value[playerHandIndex].playerUid;

    const cardToBeSplit = playerHands.value[playerHandIndex].cards.pop();

    playerHands.value[playerHandIndex].hasSplit = true;

    newHand.cards.push(cardToBeSplit);
    newHand.score += cardToBeSplit.card.value;

    if (cardToBeSplit.card.value === 11) {
      newHand.softCount++;
      playerHands.value[playerHandIndex].score -= 1;
    } else {
      playerHands.value[playerHandIndex].score -= cardToBeSplit.card.value;
    }

    playerHands.value.splice(playerHandIndex + 1, 0, newHand);
    numberOfHands.value++;
  };

  const dumpRemainingShoeOnDiscardRack = () => {
    while (shoe.value.length > 0) {
      discardRack.value.push(shoe.value.pop());
    }
  };

  const dumpDiscardRackOnShoe = () => {
    while (discardRack.value.length > 0) {
      shoe.value.push(discardRack.value.pop());
    }
  };

  return {
    shoe,
    discardRack,
    phase,
    dealerHand,
    playerHands,
    numberOfHands,
    rules,
    getSplitHandAmount,
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
    resetDealerHand,
    startNewRound,
    startNewGame,
    splitPlayerHand,
    dumpRemainingShoeOnDiscardRack,
    dumpDiscardRackOnShoe,
  };
});
