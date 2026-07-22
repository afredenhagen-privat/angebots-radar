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
  <router-link :to="`/produkt/${encodeURIComponent(stat.product_key)}`" class="block border rounded-xl p-3 bg-white">
    <div class="flex justify-between items-center">
      <p class="font-bold">{{ stat.product }} <span class="text-slate-400 font-normal">{{ stat.brand }}</span></p>
    </div>
    <p v-if="stat.currently_active" class="text-sm text-emerald-600">Im Angebot · {{ eur(stat.current_price) }}</p>
    <p v-else class="text-sm text-slate-400">Zuletzt {{ datum(stat.last_valid_to) }}</p>
    <p v-if="priceParts" class="text-xs text-slate-500">{{ priceParts }}</p>
  </router-link>
</template>
