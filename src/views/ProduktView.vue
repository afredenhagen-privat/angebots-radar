<!-- src/views/ProduktView.vue -->
<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useProducts } from '../stores/products.js'
import { eur, datum } from '../lib/format.js'
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
    <router-link to="/suche" class="text-sm text-emerald-600">&larr; Zurück zur Suche</router-link>

    <p v-if="products.error" class="text-sm text-red-600 bg-red-50 rounded-lg p-3">{{ products.error }}</p>
    <template v-else-if="!loading">
      <p v-if="!stat" class="text-sm text-slate-400">Produkt nicht gefunden.</p>
      <template v-else>
        <div>
          <h1 class="text-xl font-bold">{{ stat.product }} <span class="text-slate-400 font-normal">{{ stat.brand }}</span></h1>
        </div>

        <div class="border rounded-xl p-3 bg-white space-y-1">
          <div class="flex justify-between"><span class="text-slate-500">Normalpreis</span><span class="font-medium">{{ eur(stat.regular_price) }}</span></div>
          <div class="flex justify-between"><span class="text-slate-500">Im Angebot meist</span><span class="font-medium">{{ eur(stat.typical_price) }}</span></div>
          <div class="flex justify-between"><span class="text-slate-500">Tiefpreis</span><span class="font-medium">{{ eur(stat.lowest_price) }}</span></div>
          <p class="text-xs text-slate-400 pt-1">Basis: {{ stat.observations }} Beobachtungen seit {{ datum(stat.first_seen) }}</p>
        </div>

        <div>
          <h2 class="font-semibold mb-2">Preisverlauf</h2>
          <div class="space-y-2">
            <div v-for="h in history" :key="h.id" class="flex justify-between items-center border rounded-xl p-3 bg-white">
              <div>
                <p class="font-medium">{{ h.retailer }}</p>
                <p class="text-xs text-slate-400">{{ datum(h.valid_from) }}–{{ datum(h.valid_to) }}</p>
              </div>
              <p class="font-bold text-emerald-700">{{ eur(h.price) }}</p>
            </div>
            <p v-if="!history.length" class="text-sm text-slate-400">Kein Preisverlauf vorhanden.</p>
          </div>
        </div>
      </template>
    </template>

    <NavBar />
  </div>
</template>
