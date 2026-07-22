// src/main.js
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { registerSW } from 'virtual:pwa-register'
import router from './router.js'
import App from './App.vue'
import './style.css'

/*
 * Neue Version sofort übernehmen.
 *
 * Ohne das liefert der Service Worker nach einem Deploy weiter die alte App —
 * man sucht dann Fehler, die längst behoben sind. Zusätzlich stündlich nach
 * Aktualisierungen schauen, damit eine tagelang offene Homescreen-App nicht
 * auf einem alten Stand festhängt.
 */
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateSW(true)
  },
  onRegisteredSW(_url, registration) {
    if (registration) setInterval(() => registration.update(), 60 * 60 * 1000)
  },
})

// Übernimmt ein neuer Service Worker die Kontrolle, einmal neu laden, damit
// wirklich der neue Stand läuft. Das Flag verhindert eine Endlosschleife.
if ('serviceWorker' in navigator) {
  let neuGeladen = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (neuGeladen) return
    neuGeladen = true
    window.location.reload()
  })
}

createApp(App).use(createPinia()).use(router).mount('#app')
