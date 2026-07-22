<!-- src/views/MerkzettelView.vue -->
<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useWatchlist } from '../stores/watchlist.js'
import { useOffers } from '../stores/offers.js'
import { useProducts } from '../stores/products.js'
import OfferCard from '../components/OfferCard.vue'
import ProductPicker from '../components/ProductPicker.vue'
import NavBar from '../components/NavBar.vue'

const wl = useWatchlist()
const offers = useOffers()
const products = useProducts()

const statMap = ref(new Map())
const limits = ref({})
const addingTo = ref(null)
const ladefehler = ref('')

onMounted(async () => {
  try {
    await Promise.all([wl.load(), offers.load()])
  } catch (e) {
    ladefehler.value = 'Daten konnten nicht geladen werden. Prüf deine Verbindung.'
  }
  // Auch nach einem Fehlschlag abonnieren, damit spätere Änderungen ankommen.
  wl.subscribe()
})
onUnmounted(() => wl.unsubscribe())

/**
 * Ein Korb zeigt seine Produkte einzeln — so sieht man auch, welches gerade
 * KEIN Angebot hat. Alte Freitext-Einträge haben keine Produkte und zeigen
 * stattdessen ihre Treffer.
 */
const koerbe = computed(() =>
  wl.items.map((it) => {
    const keys = it.product_keys ?? []
    const produkte = keys.map((key) => ({
      key,
      stat: statMap.value.get(key) ?? null,
      angebote: offers.items.filter((o) => o.product_key === key),
    }))
    const treffer = offers.forEntry(it)
    return { it, keys, produkte, treffer }
  }))

const totalHits = computed(() => koerbe.value.reduce((s, k) => s + k.treffer.length, 0))

// Statistik für alle Produkte in den Körben laden (Preisurteil auf den Karten).
watch(
  () => wl.items,
  async (items) => {
    const keys = items.flatMap((i) => i.product_keys ?? [])
    statMap.value = keys.length ? await products.statsForKeys(keys) : new Map()
  },
  { immediate: true, deep: true },
)

watch(
  () => wl.items,
  (items) => {
    const next = {}
    for (const it of items) next[it.id] = it.target_price ?? ''
    limits.value = next
  },
  { immediate: true },
)

async function neuerKorb(s) {
  await wl.addBasket(s.product, s.product_key)
}

async function produktHinzufuegen(id, s) {
  await wl.addProduct(id, s.product_key)
  addingTo.value = null
}

async function saveLimit(it) {
  const raw = String(limits.value[it.id] ?? '').replace(',', '.').trim()
  if (raw === '') return wl.setTarget(it.id, null)
  const val = Number(raw)
  if (!Number.isFinite(val) || val <= 0) return
  await wl.setTarget(it.id, val)
}

const nameVon = (p) => p.stat?.product ?? p.key.split('|')[1] ?? p.key
const markeVon = (p) => p.stat?.brand ?? p.key.split('|')[0]
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

    <p v-if="ladefehler" class="text-sm text-red-600 bg-red-50 rounded-lg p-3">{{ ladefehler }}</p>

    <section class="space-y-1">
      <p class="label">Neuer Eintrag</p>
      <ProductPicker placeholder="Produkt suchen und merken" @pick="neuerKorb" />
    </section>

    <p v-if="!wl.items.length && !ladefehler" class="text-sm text-muted">
      Noch nichts gemerkt. Such oben ein Produkt und tipp einen Vorschlag an.
    </p>

    <details v-for="k in koerbe" :key="k.it.id" class="karte overflow-hidden" open>
      <summary class="flex justify-between items-center gap-3 p-3 cursor-pointer">
        <span class="font-semibold truncate">
          {{ k.it.term }}
          <span v-if="k.it.target_price" class="label ml-1">unter {{ k.it.target_price }} €</span>
        </span>
        <span class="flex items-center gap-3 shrink-0">
          <span
            class="preis text-sm px-2 py-0.5 rounded"
            :class="k.treffer.length ? 'bg-signal text-card' : 'bg-paper text-muted'"
          >{{ k.treffer.length }}</span>
          <button
            class="text-muted hover:text-signal text-sm"
            :aria-label="`${k.it.term} entfernen`"
            @click.prevent="wl.remove(k.it.id)"
          >✕</button>
        </span>
      </summary>

      <div class="p-3 pt-0 space-y-3">
        <!-- Preiswecker: nur melden, wenn der Preis unter diesem Wert liegt. -->
        <div class="flex items-center gap-2 flex-wrap">
          <label class="label" :for="`limit-${k.it.id}`">Preiswecker unter</label>
          <input
            :id="`limit-${k.it.id}`"
            v-model="limits[k.it.id]"
            type="text"
            inputmode="decimal"
            placeholder="—"
            class="w-20 karte px-2 py-1 text-sm outline-none focus:border-deep"
            @keyup.enter="saveLimit(k.it)"
          />
          <span class="text-sm text-muted">€</span>
          <button type="button" class="text-xs font-semibold text-deep underline" @click="saveLimit(k.it)">
            Speichern
          </button>
        </div>

        <!-- Korb mit konkreten Produkten -->
        <template v-if="k.keys.length">
          <div v-for="p in k.produkte" :key="p.key" class="space-y-1">
            <div class="flex items-center justify-between gap-2">
              <span class="text-sm truncate">
                {{ nameVon(p) }}
                <span class="text-muted">{{ markeVon(p) }}</span>
              </span>
              <button
                class="text-xs text-muted hover:text-signal shrink-0"
                :aria-label="`${nameVon(p)} aus dem Korb nehmen`"
                @click="wl.removeProduct(k.it.id, p.key)"
              >entfernen</button>
            </div>
            <OfferCard
              v-for="o in p.angebote"
              :key="o.id"
              :offer="o"
              :stat="p.stat"
            />
            <p v-if="!p.angebote.length" class="text-xs text-muted pl-1">gerade kein Angebot</p>
          </div>

          <div v-if="addingTo === k.it.id">
            <ProductPicker
              placeholder="Weiteres Produkt in diesen Korb"
              autofocus
              @pick="(s) => produktHinzufuegen(k.it.id, s)"
            />
            <button class="mt-1 text-xs text-muted underline" @click="addingTo = null">Abbrechen</button>
          </div>
          <button
            v-else
            class="text-xs font-semibold text-deep underline"
            @click="addingTo = k.it.id"
          >+ Produkt hinzufügen</button>
        </template>

        <!-- Alter Freitext-Eintrag: zeigt weiterhin seine Treffer -->
        <template v-else>
          <p class="text-xs text-muted">
            Freitext-Eintrag — matcht per Namensteil. Leg ihn neu über die Suche an, um exakt zu treffen.
          </p>
          <OfferCard
            v-for="o in k.treffer"
            :key="o.id"
            :offer="o"
            :stat="statMap.get(o.product_key)"
          />
          <p v-if="!k.treffer.length" class="text-sm text-muted">Diese Woche kein Angebot.</p>
        </template>
      </div>
    </details>

    <NavBar />
  </div>
</template>
