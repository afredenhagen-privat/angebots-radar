<!-- src/components/ProductPicker.vue -->
<script setup>
import { nextTick, onUnmounted, ref } from 'vue'
import { useProducts } from '../stores/products.js'
import { datum } from '../lib/format.js'

/**
 * Sucheingabe mit Vorschlägen aus dem Produktkatalog.
 * Wird zweimal genutzt: neuen Korb anlegen und Produkt in einen Korb legen.
 *
 * Die Treffer stehen bewusst IM FLUSS statt als überlappende Liste: In einer
 * Karte mit overflow-hidden würde eine überlappende Liste abgeschnitten, und
 * am unteren Bildschirmrand verdeckt sie die Tastatur. So wächst stattdessen
 * die Karte und die Seite scrollt normal.
 */
defineProps({
  placeholder: { type: String, default: 'Produkt suchen' },
  autofocus: { type: Boolean, default: false },
})
const emit = defineEmits(['pick'])

const products = useProducts()
const query = ref('')
const suggestions = ref([])
const open = ref(false)
const listEl = ref(null)
let timer = null

onUnmounted(() => clearTimeout(timer))

function close() {
  suggestions.value = []
  open.value = false
}

function onInput() {
  clearTimeout(timer)
  if (!query.value.trim()) return close()
  timer = setTimeout(async () => {
    suggestions.value = (await products.search(query.value)).slice(0, 8)
    open.value = true
    await nextTick()
    listEl.value?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, 300)
}

function pick(s) {
  clearTimeout(timer)
  close()
  query.value = ''
  emit('pick', s)
}
</script>

<template>
  <div>
    <input
      v-model="query"
      :placeholder="placeholder"
      :autofocus="autofocus"
      class="w-full karte p-3 outline-none focus:border-deep"
      @input="onInput"
    />

    <ul v-if="open && suggestions.length" ref="listEl" class="mt-1 karte divide-y divide-hair overflow-hidden">
      <li v-for="s in suggestions" :key="s.product_key">
        <button
          type="button"
          class="w-full flex items-center gap-3 text-left px-3 py-2.5 hover:bg-paper focus:bg-paper outline-none"
          @click="pick(s)"
        >
          <span class="flex-1 min-w-0">
            <span class="block font-medium truncate">{{ s.product }}</span>
            <span class="block text-xs truncate">
              <span v-if="s.brand" class="text-muted">{{ s.brand }}</span>
              <span v-if="s.brand" class="text-hair"> · </span>
              <span :class="s.currently_active ? 'text-signal font-semibold' : 'text-muted'">
                {{ s.currently_active ? 'im Angebot' : `zuletzt ${datum(s.last_valid_to)}` }}
              </span>
            </span>
          </span>
          <span class="shrink-0 text-deep font-bold text-lg leading-none" aria-hidden="true">+</span>
        </button>
      </li>
    </ul>

    <p v-else-if="open" class="mt-1 text-xs text-muted px-1">
      Nichts gefunden. Produkte tauchen erst auf, wenn sie mindestens einmal im Angebot waren.
    </p>

    <p v-if="products.error" class="mt-1 text-xs text-red-600">{{ products.error }}</p>
  </div>
</template>
