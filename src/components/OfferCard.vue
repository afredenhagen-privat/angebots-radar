<!-- src/components/OfferCard.vue -->
<script setup>
const props = defineProps({ offer: Object })
const eur = (n) => n == null ? '' : Number(n).toFixed(2).replace('.', ',') + ' €'
const bis = (iso) => iso ? `${iso.slice(8,10)}.${iso.slice(5,7)}.` : ''
</script>

<template>
  <div class="flex justify-between items-center border rounded-xl p-3 bg-white">
    <div>
      <p class="font-medium">{{ offer.product }} <span class="text-slate-400">{{ offer.brand }}</span></p>
      <p class="text-sm text-slate-500">{{ offer.retailer }} · gültig bis {{ bis(offer.valid_to) }}</p>
    </div>
    <div class="text-right">
      <p class="font-bold text-emerald-700">{{ eur(offer.price) }}<span v-if="offer.unit" class="text-xs">/{{ offer.unit }}</span></p>
      <p v-if="offer.old_price" class="text-xs text-slate-400 line-through">{{ eur(offer.old_price) }}</p>
    </div>
  </div>
</template>
