<!-- src/views/AngeboteView.vue -->
<script setup>
import { computed, onMounted, ref } from 'vue'
import { useOffers } from '../stores/offers.js'
import OfferCard from '../components/OfferCard.vue'
import NavBar from '../components/NavBar.vue'

const offers = useOffers()
const retailer = ref('')

onMounted(() => offers.loadBrowse())

const retailers = computed(() =>
  [...new Set(offers.items.map((o) => o.retailer).filter(Boolean))].sort())
const filtered = computed(() =>
  retailer.value ? offers.items.filter((o) => o.retailer === retailer.value) : offers.items)

// Zum Stöbern wird gedeckelt geladen. Das gehört sichtbar gemacht, statt
// stillschweigend einen Teil wegzulassen.
const gekuerzt = computed(() => offers.gesamt > offers.items.length)
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

    <p v-if="gekuerzt" class="text-xs text-muted">
      Zeigt {{ offers.items.length }} von {{ offers.gesamt }} Angeboten. Nutz die
      <router-link to="/suche" class="text-deep underline">Suche</router-link>, um gezielt etwas zu finden.
    </p>

    <p v-if="offers.error" class="text-sm text-red-600 bg-red-50 rounded-lg p-3">{{ offers.error }}</p>

    <OfferCard v-for="o in filtered" :key="o.id" :offer="o" />
    <p v-if="!filtered.length && !offers.error" class="text-sm text-muted">Keine Angebote geladen.</p>

    <NavBar />
  </div>
</template>
