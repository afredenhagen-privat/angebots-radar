<!-- src/views/SettingsView.vue -->
<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../supabase.js'
import { useAuth } from '../stores/auth.js'
import NavBar from '../components/NavBar.vue'

const auth = useAuth()
const router = useRouter()
const lastUpdate = ref(null)

onMounted(async () => {
  const { data } = await supabase.from('offers').select('fetched_at').order('fetched_at', { ascending: false }).limit(1)
  lastUpdate.value = data?.[0]?.fetched_at ?? null
})

async function logout() { await auth.logout(); router.push('/login') }
</script>

<template>
  <div class="max-w-xl mx-auto p-4 pb-24 space-y-4">
    <h1 class="text-xl font-bold">Einstellungen</h1>

    <div class="karte p-4 space-y-2">
      <p><span class="label">Märkte</span><br />Höchberg (97204) &amp; Würzburg (97070)</p>
      <p><span class="label">Zuletzt aktualisiert</span><br />{{ lastUpdate ? new Date(lastUpdate).toLocaleString('de-DE') : '–' }}</p>
    </div>

    <div class="karte p-4">
      <p class="font-semibold mb-1">Telegram-Wecker</p>
      <p class="text-sm text-muted">Öffnet den Bot und sendet einmal <code>/start</code>, damit ihr Benachrichtigungen bekommt.</p>
    </div>

    <button class="text-muted font-semibold py-2 underline" @click="logout">Abmelden</button>
    <NavBar />
  </div>
</template>
