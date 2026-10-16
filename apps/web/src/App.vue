<script setup lang="ts">
import { RouterView } from 'vue-router';
</script>

<template>
  <RouterView v-slot="{ Component, route }">
    <component :is="Component" :key="route.matched[0]?.path ?? route.path" />
  </RouterView>
</template>
