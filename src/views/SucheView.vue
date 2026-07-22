<!-- src/views/SucheView.vue -->
<script setup>
import { ref } from 'vue'
import { useProducts } from '../stores/products.js'
import ProductRow from '../components/ProductRow.vue'
import NavBar from '../components/NavBar.vue'

const products = useProducts()
const query = ref('')
const results = ref([])
let timer = null

function onInput() {
  clearTimeout(timer)
  const q = query.value
  if (q.trim().length < 2) {
    results.value = []
    return
  }
  timer = setTimeout(async () => {
    results.value = await products.search(q)
  }, 300)
}
</script>

<template>
  <div class="max-w-xl mx-auto p-4 pb-24 space-y-3">
    <header>
      <p class="label">Katalog</p>
      <h1 class="text-xl font-bold">Suche</h1>
    </header>

    <input
      v-model="query"
      @input="onInput"
      placeholder="Produkt suchen, z.B. Butter"
      class="w-full karte p-3 outline-none focus:border-deep"
    />

    <p v-if="products.error" class="text-sm text-red-600 bg-red-50 rounded-lg p-3">{{ products.error }}</p>
    <p v-else-if="query.trim().length < 2" class="text-sm text-muted">Mindestens 2 Zeichen eingeben.</p>
    <p v-else-if="!results.length" class="text-sm text-muted">Keine Treffer.</p>
    <ProductRow v-for="s in results" :key="s.product_key" :stat="s" />

    <NavBar />
  </div>
</template>
