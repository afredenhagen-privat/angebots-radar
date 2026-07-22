// src/supabase.js
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
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
  },
)
