// src/stores/auth.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../supabase.js'

export const useAuth = defineStore('auth', () => {
  const session = ref(null)

  async function init() {
    const { data } = await supabase.auth.getSession()
    session.value = data.session
    supabase.auth.onAuthStateChange((_e, s) => { session.value = s })
  }
  async function login(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }
  async function logout() { await supabase.auth.signOut() }

  return { session, init, login, logout }
})
