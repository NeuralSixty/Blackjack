<script setup>
import { RouterLink, RouterView } from "vue-router";
</script>

<template>
  <header>
    <div class="wrapper">
      <nav>
        <RouterLink to="/">Game</RouterLink>
        <span> || </span>
        <RouterLink to="/about">About Blackjack</RouterLink>
      </nav>
    </div>
  </header>

  <RouterView />
</template>
