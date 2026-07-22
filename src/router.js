// src/router.js
import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuth } from './stores/auth.js'
import MerkzettelView from './views/MerkzettelView.vue'
import AngeboteView from './views/AngeboteView.vue'
import SucheView from './views/SucheView.vue'
import ProduktView from './views/ProduktView.vue'
import SettingsView from './views/SettingsView.vue'
import LoginView from './views/LoginView.vue'

const routes = [
  { path: '/', component: MerkzettelView },
  { path: '/angebote', component: AngeboteView },
  { path: '/suche', component: SucheView },
  { path: '/produkt/:key', component: ProduktView },
  { path: '/settings', component: SettingsView },
  { path: '/login', component: LoginView },
]

const router = createRouter({ history: createWebHashHistory('/angebots-radar/'), routes })

router.beforeEach(async (to) => {
  const auth = useAuth()
  if (!auth.session) await auth.init()
  if (!auth.session && to.path !== '/login') return '/login'
  if (auth.session && to.path === '/login') return '/'
})

export default router
