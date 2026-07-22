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
onUnmounted(() => {
  clearTimeout(suggestTimer)
  wl.unsubscribe()
})

const hitsByItem = computed(() =>
  wl.items.map((it) => ({ it, hits: offers.forTerm(it.term, it.target_price) })))
const totalHits = computed(() => hitsByItem.value.reduce((s, x) => s + x.hits.length, 0))

function closeSuggestions() {
  suggestions.value = []
  showSuggestions.value = false
}

function onTermInput() {
  clearTimeout(suggestTimer)
  if (!newTerm.value.trim()) return closeSuggestions()
  suggestTimer = setTimeout(async () => {
    suggestions.value = (await products.search(newTerm.value)).slice(0, 8)
    showSuggestions.value = true
  }, 300)
}

/** Vorschlag antippen legt den Eintrag direkt an — kein zweiter Handgriff. */
async function pickSuggestion(s) {
  clearTimeout(suggestTimer)
  closeSuggestions()
  newTerm.value = ''
  await wl.add(s.product)
}

async function addTerm() {
  const term = newTerm.value.trim()
  if (!term) return
  clearTimeout(suggestTimer)
  closeSuggestions()
  newTerm.value = ''
  await wl.add(term)
}
</script>

<template>
  <div class="max-w-xl mx-auto p-4 pb-24 space-y-5">
    <header class="flex items-end justify-between border-b border-hair pb-3">
      <div>
        <p class="label">Diese Woche</p>
        <p class="preis text-signal text-5xl leading-none">{{ totalHits }}</p>
      </div>
      <p class="text-sm text-muted text-right leading-snug">
        Treffer auf<br />eurer Merkliste
      </p>
    </header>

    <form class="relative" @submit.prevent="addTerm">
      <div class="flex gap-2">
        <input
          v-model="newTerm"
          @input="onTermInput"
          placeholder="Produkt suchen und hinzufügen"
          class="flex-1 karte p-3 outline-none focus:border-deep"
        />
        <button class="bg-deep text-card px-4 rounded-lg font-semibold" aria-label="Hinzufügen">+</button>
      </div>

      <ul
        v-if="showSuggestions && suggestions.length"
        class="absolute z-10 left-0 right-0 mt-1 karte shadow-lg overflow-hidden"
      >
        <li v-for="s in suggestions" :key="s.product_key">
          <button
            type="button"
            class="w-full text-left px-3 py-2 border-b border-hair last:border-b-0 hover:bg-paper focus:bg-paper outline-none"
            @click="pickSuggestion(s)"
          >
            <span class="font-medium">{{ s.product }}</span>
            <span v-if="s.brand" class="text-muted"> {{ s.brand }}</span>
            <span class="block text-[11px]" :class="s.currently_active ? 'text-signal' : 'text-muted'">
              {{ s.currently_active ? 'gerade im Angebot' : `zuletzt ${datum(s.last_valid_to)}` }}
            </span>
          </button>
        </li>
      </ul>
      <p v-else-if="showSuggestions" class="mt-1 text-xs text-muted px-1">
        Nichts gefunden — du kannst den Begriff trotzdem mit + anlegen.
      </p>
    </form>

    <p v-if="!wl.items.length" class="text-sm text-muted">
      Noch nichts gemerkt. Such oben ein Produkt und tipp einen Vorschlag an.
    </p>

    <details
      v-for="{ it, hits } in hitsByItem"
      :key="it.id"
      class="karte overflow-hidden"
      open
    >
      <summary class="flex justify-between items-center gap-3 p-3 cursor-pointer">
        <span class="font-semibold truncate">
          {{ it.term }}
          <span v-if="it.target_price" class="label ml-1">unter {{ it.target_price }} €</span>
        </span>
        <span class="flex items-center gap-3 shrink-0">
          <span
            class="preis text-sm px-2 py-0.5 rounded"
            :class="hits.length ? 'bg-signal text-card' : 'bg-paper text-muted'"
          >{{ hits.length }}</span>
          <button
            class="text-muted hover:text-signal text-sm"
            :aria-label="`${it.term} entfernen`"
            @click.prevent="wl.remove(it.id)"
          >✕</button>
        </span>
      </summary>
      <div class="p-3 pt-0 space-y-2">
        <OfferCard v-for="o in hits" :key="o.id" :offer="o" />
        <p v-if="!hits.length" class="text-sm text-muted">Diese Woche kein Angebot.</p>
      </div>
    </details>

    <NavBar />
  </div>
</template>
