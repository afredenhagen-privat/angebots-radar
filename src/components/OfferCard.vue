<!-- src/components/OfferCard.vue -->
<script setup>
import { eur } from '../lib/format.js'

defineProps({ offer: Object })

const bis = (iso) => (iso ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.` : '')
</script>

<template>
  <!-- Aufbau wie ein Regaletikett: Ware links, Preis rechts und dominant. -->
  <div class="karte flex items-stretch overflow-hidden">
    <div class="flex-1 min-w-0 p-3">
      <p class="font-semibold leading-snug truncate">{{ offer.product }}</p>
      <p v-if="offer.brand" class="text-sm text-muted truncate">{{ offer.brand }}</p>
      <p class="mt-1 text-xs text-muted">
        <span class="font-semibold text-deep">{{ offer.retailer }}</span>
        <span v-if="offer.valid_to"> · bis {{ bis(offer.valid_to) }}</span>
      </p>
    </div>

    <div class="shrink-0 flex flex-col items-end justify-center px-3 py-2 bg-paper border-l border-hair">
      <p class="preis text-signal text-3xl leading-none">
        {{ eur(offer.price) }}
      </p>
      <p class="mt-0.5 text-[11px] text-muted">
        <span v-if="offer.unit">je {{ offer.unit }}</span>
        <span v-if="offer.old_price" class="line-through ml-1">{{ eur(offer.old_price) }}</span>
      </p>
    </div>
  </div>
</template>
