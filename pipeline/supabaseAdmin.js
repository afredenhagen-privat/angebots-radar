// pipeline/supabaseAdmin.js
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY fehlen')

// Service-Role umgeht RLS — nur serverseitig (Cron), nie im Frontend.
export const admin = createClient(url, key, { auth: { persistSession: false } })
