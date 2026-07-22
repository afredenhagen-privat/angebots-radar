<!-- src/components/PreisSkala.vue -->
<script setup>
import { computed } from 'vue'
import { eur } from '../lib/format.js'
import { preislage } from '../lib/preislage.js'

/**
 * Zeigt, wo der aktuelle Preis zwischen beobachtetem Tiefpreis und
 * Normalpreis liegt. Links ist günstig, rechts ist teuer.
 */
const props = defineProps({
  current: { type: Number, default: null },
  low: { type: Number, default: null },
  normal: { type: Number, default: null },
})

const lage = computed(() => preislage(props.current, props.low, props.normal))
</script>

<template>
  <div v-if="lage" class="space-y-1">
    <div class="flex justify-between items-baseline">
      <span class="label">Preislage</span>
      <span class="text-xs font-semibold" :class="lage.gut ? 'text-signal' : 'text-muted'">
        {{ lage.urteil }}
      </span>
    </div>

    <div class="relative h-1.5 rounded-full bg-hair">
      <div
        class="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-card bg-signal shadow"
        :style="{ left: lage.pct + '%' }"
      />
    </div>

    <div class="flex justify-between text-[11px] text-muted">
      <span>Tief {{ eur(low) }}</span>
      <span>Normal {{ eur(normal) }}</span>
    </div>
  </div>
</template>
