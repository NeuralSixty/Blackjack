# Blackjack
Blackjack implementation built with Vue.js 3 Composition API.

## Rules
All of the standard and most well-known rules have been implemented. At the beginning of each session, these rules may be customized to accomodate for either house or player advantage. Due to the modular nature of the Blackjack table state, new rules can be implemented with much ease and without conflicting with other rules.

## Dealer
The dealer simulates single-deck up to 8-deck games, therefore it's possible to train card counting. The dealer reshuffles at 25% of the shoe left.

## Manifesto
As a bonus, a little manifesto is avaiable in the About route ;)

## Setup
```sh
npm install
```
### Compile and Hot-Reload for Development
```sh
npm run dev
```
### Compile and Minify for Production
```sh
npm run build
```
### Lint with [ESLint](https://eslint.org/)
```sh
npm run lint
```