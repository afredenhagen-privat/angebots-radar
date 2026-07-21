<!-- src/views/LoginView.vue -->
<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../stores/auth.js'

const email = ref('')
const password = ref('')
const err = ref('')
const auth = useAuth()
const router = useRouter()

async function submit() {
  err.value = ''
  try { await auth.login(email.value, password.value); router.push('/') }
  catch (e) { err.value = e.message }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-6 bg-slate-50">
    <form class="w-full max-w-sm space-y-4 bg-white p-6 rounded-2xl shadow" @submit.prevent="submit">
      <h1 class="text-xl font-bold">Angebots-Radar</h1>
      <input v-model="email" type="email" placeholder="E-Mail" class="w-full border rounded-lg p-3" />
      <input v-model="password" type="password" placeholder="Passwort" class="w-full border rounded-lg p-3" />
      <p v-if="err" class="text-red-600 text-sm">{{ err }}</p>
      <button class="w-full bg-emerald-600 text-white rounded-lg p-3 font-semibold">Anmelden</button>
    </form>
  </div>
</template>
