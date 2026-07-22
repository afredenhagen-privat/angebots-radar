<!-- src/views/AngeboteView.vue -->
<script setup>
import { computed, onMounted, ref } from 'vue'
import { useOffers } from '../stores/offers.js'
import OfferCard from '../components/OfferCard.vue'
import NavBar from '../components/NavBar.vue'

const offers = useOffers()
const retailer = ref('')

onMounted(() => offers.load())

const retailers = computed(() => [...new Set(offers.items.map((o) => o.retailer).filter(Boolean))].sort())
const filtered = computed(() => retailer.value ? offers.items.filter((o) => o.retailer === retailer.value) : offers.items)
</script>

<template>
  <div class="max-w-xl mx-auto p-4 pb-24 space-y-3">
    <header>
      <p class="label">Diese Woche</p>
      <h1 class="text-xl font-bold">Alle Angebote</h1>
    </header>

    <select v-model="retailer" class="w-full karte p-3 outline-none focus:border-deep">
      <option value="">Alle Händler</option>
      <option v-for="r in retailers" :key="r" :value="r">{{ r }}</option>
    </select>
    <OfferCard v-for="o in filtered" :key="o.id + o.category" :offer="o" />
    <NavBar />
  </div>
</template>
