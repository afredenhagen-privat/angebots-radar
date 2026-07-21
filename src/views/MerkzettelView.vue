<!-- src/views/MerkzettelView.vue -->
<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useWatchlist } from '../stores/watchlist.js'
import { useOffers } from '../stores/offers.js'
import OfferCard from '../components/OfferCard.vue'
import NavBar from '../components/NavBar.vue'

const wl = useWatchlist()
const offers = useOffers()
const newTerm = ref('')

onMounted(async () => {
  await Promise.all([wl.load(), offers.load()])
  wl.subscribe()
})
onUnmounted(() => wl.unsubscribe())

const hitsByItem = computed(() =>
  wl.items.map((it) => ({ it, hits: offers.forTerm(it.term, it.target_price) })))
const totalHits = computed(() => hitsByItem.value.reduce((s, x) => s + x.hits.length, 0))

async function addTerm() {
  if (!newTerm.value.trim()) return
  await wl.add(newTerm.value.trim())
  newTerm.value = ''
}
</script>

<template>
  <div class="max-w-xl mx-auto p-4 pb-24 space-y-4">
    <div class="bg-emerald-600 text-white rounded-2xl p-4">
      <p class="text-2xl font-bold">{{ totalHits }} Treffer diese Woche</p>
      <p class="text-emerald-100 text-sm">auf deiner Merkliste</p>
    </div>

    <form class="flex gap-2" @submit.prevent="addTerm">
      <input v-model="newTerm" placeholder="Produkt hinzufügen (z.B. Butter)" class="flex-1 border rounded-lg p-3" />
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
