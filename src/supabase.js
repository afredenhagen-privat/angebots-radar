// src/supabase.js
import { createClient } from '@supabase/supabase-js'
import { normalizeSupabaseUrl } from '../shared/supabaseUrl.js'

const rawUrl = import.meta.env.VITE_SUPABASE_URL
const url = normalizeSupabaseUrl(rawUrl)

if (rawUrl && url !== rawUrl) {
  console.warn(
    `[supabase] VITE_SUPABASE_URL wurde zu "${url}" normalisiert (war "${rawUrl}"). ` +
      'Bitte im Secret die nackte Project-URL ohne /rest/v1 und ohne Slash am Ende hinterlegen.',
  )
}

export const supabase = createClient(url, import.meta.env.VITE_SUPABASE_ANON_KEY, {
  auth: {
    // PKCE statt Implicit-Flow: der Magic-Link kommt als "?code=..." im
    // Query-String zurück statt als "#access_token=..." im Hash-Fragment.
    // Das ist hier zwingend, weil der Router Hash-Routing nutzt (#/angebote)
    // und sich ein Token im Hash damit beißen würde.
    flowType: 'pkce',
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
  },
})
