<script setup lang="ts">
import { RULES } from "../../lib/rules.js";
</script>

<template>
  <ul class="flex flex-col gap-2">
    <li v-for="rule in RULES" :key="rule.title" class="flex gap-3">
      <i class="accent-icon text-xl" :class="rule.icon" aria-hidden="true" />
      <p class="text-sm text-ink/80">
        <span class="font-bold text-ink">{{ rule.title }}.</span> {{ rule.text }}
      </p>
    </li>
  </ul>
</template>
