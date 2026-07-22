<!-- src/views/MerkzettelView.vue -->
<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useWatchlist } from '../stores/watchlist.js'
import { useOffers } from '../stores/offers.js'
import { useProducts } from '../stores/products.js'
import { datum } from '../lib/format.js'
import OfferCard from '../components/OfferCard.vue'
import NavBar from '../components/NavBar.vue'

const wl = useWatchlist()
const offers = useOffers()
const products = useProducts()
const newTerm = ref('')
const suggestions = ref([])
const showSuggestions = ref(false)
let suggestTimer = null

onMounted(async () => {
  await Promise.all([wl.load(), offers.load()])
  wl.subscribe()
})
onUnmounted(() => wl.unsubscribe())

const hitsByItem = computed(() =>
  wl.items.map((it) => ({ it, hits: offers.forTerm(it.term, it.target_price) })))
const totalHits = computed(() => hitsByItem.value.reduce((s, x) => s + x.hits.length, 0))

function onTermInput() {
  clearTimeout(suggestTimer)
  const q = newTerm.value
  if (!q.trim()) {
    suggestions.value = []
    showSuggestions.value = false
    return
  }
  suggestTimer = setTimeout(async () => {
    suggestions.value = (await products.search(q)).slice(0, 8)
    showSuggestions.value = true
  }, 300)
}

function pickSuggestion(s) {
  newTerm.value = s.product
  suggestions.value = []
  showSuggestions.value = false
}

async function addTerm() {
  if (!newTerm.value.trim()) return
  await wl.add(newTerm.value.trim())
  newTerm.value = ''
  suggestions.value = []
  showSuggestions.value = false
}
</script>

<template>
  <div class="max-w-xl mx-auto p-4 pb-24 space-y-4">
    <div class="bg-emerald-600 text-white rounded-2xl p-4">
      <p class="text-2xl font-bold">{{ totalHits }} Treffer diese Woche</p>
      <p class="text-emerald-100 text-sm">auf deiner Merkliste</p>
    </div>

    <form class="flex gap-2 relative" @submit.prevent="addTerm">
      <div class="flex-1 relative">
        <input v-model="newTerm" @input="onTermInput" placeholder="Produkt hinzufügen (z.B. Butter)" class="w-full border rounded-lg p-3" />
        <div v-if="showSuggestions && suggestions.length" class="absolute z-10 top-full left-0 right-0 mt-1 border rounded-lg bg-white shadow-lg overflow-hidden">
          <button
            v-for="s in suggestions"
            :key="s.product_key"
            type="button"
            class="w-full text-left p-2 hover:bg-slate-50 border-b last:border-b-0"
            @click="pickSuggestion(s)"
          >
            <span class="font-medium">{{ s.product }}</span> <span class="text-slate-400">{{ s.brand }}</span>
            <span v-if="!s.currently_active" class="block text-xs text-slate-400">zuletzt {{ datum(s.last_valid_to) }}</span>
          </button>
        </div>
      </div>
      <button class="bg-emerald-600 text-white px-4 rounded-lg">+</button>
    </form>

    <details v-for="{ it, hits } in hitsByItem" :key="it.id" class="border rounded-xl bg-white" open>
      <summary class="flex justify-between items-center p-3 cursor-pointer">
        <span class="font-semibold">{{ it.term }}
          <span v-if="it.target_price" class="text-xs text-slate-400">&lt; {{ it.target_price }} €</span>
        </span>
        <span class="flex items-center gap-3">
          <span class="text-sm px-2 py-0.5 rounded-full" :class="hits.length ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'">{{ hits.length }}</span>
          <button class="text-red-500 text-sm" @click.prevent="wl.remove(it.id)">✕</button>
        </span>
      </summary>
      <div class="p-3 pt-0 space-y-2">
        <OfferCard v-for="o in hits" :key="o.id" :offer="o" />
        <p v-if="!hits.length" class="text-sm text-slate-400">Diese Woche kein Angebot.</p>
      </div>
    </details>

    <NavBar />
  </div>
</template>
