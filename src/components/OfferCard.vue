<!-- src/components/OfferCard.vue -->
<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { eur } from '../lib/format.js'
import { preislage } from '../lib/preislage.js'

const props = defineProps({
  offer: { type: Object, required: true },
  // Optionale Preisstatistik zu diesem Produkt. Ist sie da, urteilen wir über
  // die Preislage — sonst bleibt die Karte bewusst still.
  stat: { type: Object, default: null },
})

const bis = (iso) => (iso ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.` : '')

const lage = computed(() =>
  props.stat ? preislage(props.offer.price, props.stat.lowest_price, props.stat.regular_price) : null,
)

const ziel = computed(() =>
  props.offer.product_key ? `/produkt/${encodeURIComponent(props.offer.product_key)}` : null,
)
</script>

<template>
  <!-- Aufbau wie ein Regaletikett: Ware links, Preis rechts und dominant. -->
  <component
    :is="ziel ? RouterLink : 'div'"
    :to="ziel ?? undefined"
    class="karte flex items-stretch overflow-hidden"
    :class="ziel ? 'hover:border-deep focus:border-deep outline-none' : ''"
  >
    <div class="flex-1 min-w-0 p-3">
      <p class="font-semibold leading-snug truncate">{{ offer.product }}</p>
      <p v-if="offer.brand" class="text-sm text-muted truncate">{{ offer.brand }}</p>
      <p class="mt-1 text-xs text-muted">
        <span class="font-semibold text-deep">{{ offer.retailer }}</span>
        <span v-if="offer.valid_to"> · bis {{ bis(offer.valid_to) }}</span>
      </p>
      <!-- Nur hervorheben, wenn es wirklich ein guter Preis ist. -->
      <p v-if="lage?.gut" class="mt-1 inline-block text-[10px] font-bold uppercase tracking-label text-card bg-signal px-1.5 py-0.5 rounded">
        {{ lage.urteil }}
      </p>
    </div>

    <div class="shrink-0 flex flex-col items-end justify-center px-3 py-2 bg-paper border-l border-hair">
      <p class="preis text-signal text-3xl leading-none">{{ eur(offer.price) }}</p>
      <p class="mt-0.5 text-[11px] text-muted">
        <span v-if="offer.unit">je {{ offer.unit }}</span>
        <span v-if="offer.old_price" class="line-through ml-1">{{ eur(offer.old_price) }}</span>
      </p>
    </div>
  </component>
</template>
