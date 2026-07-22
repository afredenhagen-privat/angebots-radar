// pipeline/supabaseAdmin.js
import { createClient } from '@supabase/supabase-js'
import { normalizeSupabaseUrl } from '../shared/supabaseUrl.js'

const rawUrl = process.env.SUPABASE_URL
const url = normalizeSupabaseUrl(rawUrl)
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY fehlen')

if (url !== rawUrl) {
  console.warn(`[supabase] SUPABASE_URL zu "${url}" normalisiert (war "${rawUrl}").`)
}

// Service-Role umgeht RLS — nur serverseitig (Cron), nie im Frontend.
export const admin = createClient(url, key, { auth: { persistSession: false } })
