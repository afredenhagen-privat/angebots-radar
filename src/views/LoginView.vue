<!-- src/views/LoginView.vue -->
<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../stores/auth.js'

const auth = useAuth()
const router = useRouter()
const email = ref('')

const valid = computed(() => /\S+@\S+\.\S+/.test(email.value))

// Nach dem Klick auf den Magic-Link kehrt man mit "?code=..." hierher zurück.
// supabase-js tauscht den Code asynchron gegen eine Session — sobald die steht,
// direkt weiterleiten (der Router-Guard allein würde erst bei der nächsten
// Navigation greifen, man bliebe sonst auf dem Login-Screen hängen).
watch(() => auth.session, (s) => { if (s) router.push('/') })

async function submit() {
  if (!valid.value || auth.sending) return
  try {
    await auth.sendMagicLink(email.value)
  } catch {
    /* Fehlermeldung liegt im Store */
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-6 bg-slate-50">
    <div class="w-full max-w-sm space-y-4 bg-white p-6 rounded-2xl shadow">
      <h1 class="text-xl font-bold">Angebots-Radar</h1>

      <template v-if="!auth.sentTo">
        <p class="text-sm text-slate-500">
          Meldet euch auf beiden Handys mit eurer gemeinsamen E-Mail an — ihr seht
          danach dieselbe Merkliste.
        </p>

        <form class="space-y-3" @submit.prevent="submit">
          <input
            v-model="email"
            type="email"
            inputmode="email"
            autocomplete="email"
            placeholder="dein@beispiel.de"
            class="w-full border rounded-lg p-3"
          />
          <p v-if="auth.error" class="text-red-600 text-sm">{{ auth.error }}</p>
          <button
            class="w-full bg-emerald-600 text-white rounded-lg p-3 font-semibold disabled:opacity-50"
            :disabled="!valid || auth.sending"
          >
            {{ auth.sending ? 'Sende…' : 'Magic-Link senden' }}
          </button>
        </form>
      </template>

      <template v-else>
        <p class="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-900">
          Mail ist raus an <strong>{{ auth.sentTo }}</strong>. Öffne den Link
          <strong>auf diesem Gerät</strong> — danach bist du automatisch angemeldet.
        </p>
        <button class="text-sm text-slate-500 underline" @click="auth.reset()">
          Andere E-Mail verwenden
        </button>
      </template>
    </div>
  </div>
</template>
