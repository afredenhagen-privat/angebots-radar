<!-- src/components/ProductRow.vue -->
<script setup>
import { computed } from 'vue'
import { eur, datum } from '../lib/format.js'

const props = defineProps({ stat: Object })

const priceParts = computed(() => {
  const parts = []
  if (props.stat.regular_price != null) parts.push(`Normal ${eur(props.stat.regular_price)}`)
  if (props.stat.typical_price != null) parts.push(`meist ${eur(props.stat.typical_price)}`)
  if (props.stat.lowest_price != null) parts.push(`Tief ${eur(props.stat.lowest_price)}`)
  return parts.join(' · ')
})
</script>

<template>
  <!-- Aufbau wie OfferCard: Ware links, Preis rechts und dominant. -->
  <router-link :to="`/produkt/${encodeURIComponent(stat.product_key)}`" class="karte flex items-stretch overflow-hidden">
    <div class="flex-1 min-w-0 p-3">
      <p class="font-semibold leading-snug truncate">{{ stat.product }}</p>
      <p v-if="stat.brand" class="text-sm text-muted truncate">{{ stat.brand }}</p>
      <p class="mt-1 text-xs" :class="stat.currently_active ? 'text-signal font-semibold' : 'text-muted'">
        {{ stat.currently_active ? 'Im Angebot' : `Zuletzt ${datum(stat.last_valid_to)}` }}
      </p>
      <p v-if="priceParts" class="label mt-1 truncate">{{ priceParts }}</p>
    </div>

    <div
      v-if="stat.currently_active"
      class="shrink-0 flex flex-col items-end justify-center px-3 py-2 bg-paper border-l border-hair"
    >
      <p class="preis text-signal text-2xl leading-none">{{ eur(stat.current_price) }}</p>
    </div>
  </router-link>
</template>
