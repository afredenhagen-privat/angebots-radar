<!-- src/views/ProduktView.vue -->
<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useProducts } from '../stores/products.js'
import { eur, datum } from '../lib/format.js'
import PreisSkala from '../components/PreisSkala.vue'
import NavBar from '../components/NavBar.vue'

const route = useRoute()
const products = useProducts()
const key = decodeURIComponent(route.params.key)

const stat = ref(null)
const history = ref([])
const loading = ref(true)

onMounted(async () => {
  const [s, h] = await Promise.all([products.byKey(key), products.history(key)])
  stat.value = s
  history.value = h
  loading.value = false
})
</script>

<template>
  <div class="max-w-xl mx-auto p-4 pb-24 space-y-4">
    <router-link to="/suche" class="text-sm text-deep font-semibold">&larr; Zurück zur Suche</router-link>

    <p v-if="products.error" class="text-sm text-red-600 bg-red-50 rounded-lg p-3">{{ products.error }}</p>
    <template v-else-if="!loading">
      <p v-if="!stat" class="text-sm text-muted">Produkt nicht gefunden.</p>
      <template v-else>
        <div>
          <h1 class="text-xl font-bold truncate">{{ stat.product }} <span class="text-muted font-normal">{{ stat.brand }}</span></h1>
        </div>

        <div class="karte p-3 space-y-1.5">
          <div class="flex justify-between items-baseline">
            <span class="label">Normalpreis{{ stat.unit ? " je " + stat.unit : "" }}</span>
            <!-- Ohne Streichpreis in den Daten bleibt hier "—" stehen statt
                 einer leeren Zeile, die wie ein Fehler aussieht. -->
            <span class="preis text-lg" :class="stat.regular_price == null ? 'text-muted' : ''">
              {{ eur(stat.regular_price) || '—' }}
            </span>
          </div>
          <div class="flex justify-between items-baseline">
            <span class="label">Im Angebot meist</span>
            <span class="preis text-lg">{{ eur(stat.typical_price) || "—" }}</span>
          </div>
          <div class="flex justify-between items-baseline">
            <span class="label">Tiefpreis</span>
            <span class="preis text-lg">{{ eur(stat.lowest_price) || "—" }}</span>
          </div>

          <PreisSkala
            class="pt-2"
            :current="stat.current_price ?? stat.typical_price"
            :low="stat.lowest_price_past"
            :normal="stat.regular_price"
          />

          <p class="text-xs text-muted pt-1">Basis: {{ stat.observations }} Beobachtungen seit {{ datum(stat.first_seen) }}</p>
        </div>

        <div>
          <h2 class="font-semibold mb-2">Preisverlauf</h2>
          <div class="space-y-2">
            <div v-for="h in history" :key="h.id" class="karte flex items-stretch overflow-hidden">
              <div class="flex-1 min-w-0 p-3">
                <p class="font-semibold truncate text-deep">{{ h.retailer }}</p>
                <p class="text-xs text-muted">{{ datum(h.valid_from) }}–{{ datum(h.valid_to) }}</p>
              </div>
              <div class="shrink-0 flex items-center px-3 py-2 bg-paper border-l border-hair">
                <p class="preis text-signal text-xl leading-none">{{ eur(h.price) }}</p>
              </div>
            </div>
            <p v-if="!history.length" class="text-sm text-muted">Kein Preisverlauf vorhanden.</p>
          </div>
        </div>
      </template>
    </template>

    <NavBar />
  </div>
</template>
