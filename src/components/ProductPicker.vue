<!-- src/components/ProductPicker.vue -->
<script setup>
import { onUnmounted, ref } from 'vue'
import { useProducts } from '../stores/products.js'
import { datum } from '../lib/format.js'

/**
 * Sucheingabe mit Vorschlägen aus dem Produktkatalog.
 * Wird zweimal genutzt: neuen Korb anlegen und Produkt in einen Korb legen.
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
  <div class="relative">
    <input
      v-model="query"
      :placeholder="placeholder"
      :autofocus="autofocus"
      class="w-full karte p-3 outline-none focus:border-deep"
      @input="onInput"
    />

    <ul v-if="open && suggestions.length" class="absolute z-20 left-0 right-0 mt-1 karte shadow-lg overflow-hidden">
      <li v-for="s in suggestions" :key="s.product_key">
        <button
          type="button"
          class="w-full text-left px-3 py-2 border-b border-hair last:border-b-0 hover:bg-paper focus:bg-paper outline-none"
          @click="pick(s)"
        >
          <span class="font-medium">{{ s.product }}</span>
          <span v-if="s.brand" class="text-muted"> {{ s.brand }}</span>
          <span class="block text-[11px]" :class="s.currently_active ? 'text-signal' : 'text-muted'">
            {{ s.currently_active ? 'gerade im Angebot' : `zuletzt ${datum(s.last_valid_to)}` }}
          </span>
        </button>
      </li>
    </ul>

    <p v-else-if="open" class="mt-1 text-xs text-muted px-1">
      Nichts gefunden. Produkte tauchen erst auf, wenn sie mindestens einmal im Angebot waren.
    </p>

    <p v-if="products.error" class="mt-1 text-xs text-red-600">{{ products.error }}</p>
  </div>
</template>
