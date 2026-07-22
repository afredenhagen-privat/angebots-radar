<!-- src/components/PreisSkala.vue -->
<script setup>
import { computed } from 'vue'
import { eur } from '../lib/format.js'

/**
 * Zeigt, wo der aktuelle Preis zwischen beobachtetem Tiefpreis und
 * Normalpreis liegt — die Antwort auf "ist das gerade günstig?".
 * Links ist günstig, rechts ist teuer.
 */
const props = defineProps({
  current: { type: Number, default: null },
  low: { type: Number, default: null },
  normal: { type: Number, default: null },
})

const usable = computed(
  () =>
    props.current != null &&
    props.low != null &&
    props.normal != null &&
    props.normal > props.low,
)

const percent = computed(() => {
  if (!usable.value) return 0
  const raw = (props.current - props.low) / (props.normal - props.low)
  return Math.min(100, Math.max(0, raw * 100))
})

const urteil = computed(() => {
  if (!usable.value) return null
  if (props.current <= props.low) return 'Bestpreis'
  if (percent.value <= 33) return 'Sehr günstig'
  if (percent.value <= 66) return 'Normal für ein Angebot'
  return 'Eher teuer'
})
</script>

<template>
  <div v-if="usable" class="space-y-1">
    <div class="flex justify-between items-baseline">
      <span class="label">Preislage</span>
      <span class="text-xs font-semibold" :class="percent <= 33 ? 'text-signal' : 'text-muted'">
        {{ urteil }}
      </span>
    </div>

    <div class="relative h-1.5 rounded-full bg-hair">
      <!-- Marker: aktueller Preis auf der Skala Tief -> Normal -->
      <div
        class="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-card bg-signal shadow"
        :style="{ left: percent + '%' }"
      />
    </div>

    <div class="flex justify-between text-[11px] text-muted">
      <span>Tief {{ eur(low) }}</span>
      <span>Normal {{ eur(normal) }}</span>
    </div>
  </div>
</template>
