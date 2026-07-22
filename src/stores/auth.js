// src/stores/auth.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../supabase.js'

let initialized = false

export const useAuth = defineStore('auth', () => {
  const session = ref(null)
  const sending = ref(false)
  const sentTo = ref(null)
  const error = ref('')

  async function init() {
    const { data } = await supabase.auth.getSession()
    session.value = data.session
    if (!initialized) {
      initialized = true
      supabase.auth.onAuthStateChange((_e, s) => { session.value = s })
    }
  }

  async function sendMagicLink(email) {
    const trimmed = (email ?? '').trim()
    if (!trimmed) throw new Error('E-Mail ist Pflicht.')
    sending.value = true
    error.value = ''
    try {
      const { error: err } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          // Nach dem Klick landet man wieder auf der App-Startseite.
          emailRedirectTo: window.location.origin + import.meta.env.BASE_URL,
          // Kein Self-Signup: nur vorab in Supabase angelegte Nutzer dürfen rein.
          // Ohne das käme jede beliebige E-Mail an eure Merkliste, weil die
          // RLS-Regeln jedem eingeloggten Nutzer vollen Zugriff geben.
          shouldCreateUser: false,
        },
      })
      if (err) {
        // Supabase meldet bei nicht freigeschalteter Adresse "Signups not allowed for otp".
        if (/signups? not allowed/i.test(err.message)) {
          throw new Error('Diese E-Mail ist nicht freigeschaltet. Sie muss erst in Supabase als Nutzer angelegt werden.')
        }
        throw err
      }
      sentTo.value = trimmed
    } catch (e) {
      error.value = e.message ?? 'Magic-Link konnte nicht gesendet werden.'
      throw e
    } finally {
      sending.value = false
    }
  }

  function reset() {
    sentTo.value = null
    error.value = ''
  }

  async function logout() {
    await supabase.auth.signOut()
    session.value = null
    reset()
  }

  return { session, sending, sentTo, error, init, sendMagicLink, reset, logout }
})
