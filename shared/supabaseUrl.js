// shared/supabaseUrl.js
// Wird von Frontend (src/supabase.js) UND Pipeline (pipeline/supabaseAdmin.js) genutzt.

/**
 * Räumt eine Supabase-Projekt-URL auf.
 *
 * Im Dashboard tauchen mehrere Schreibweisen auf — u.a. die "Data API"-URL
 * mit angehängtem /rest/v1/. supabase-js will aber nur die nackte Domain und
 * hängt seine Pfade selbst an. Sonst entsteht z.B.
 *   https://ref.supabase.co/rest/v1/auth/v1/otp
 * und der Server antwortet mit "Invalid path specified in request URL" (404).
 */
export function normalizeSupabaseUrl(raw) {
  if (!raw) return raw
  return String(raw)
    .trim()
    .replace(/\/+$/, '') // Trailing-Slashes
    .replace(/\/(rest|auth|realtime|storage)\/v1$/, '') // versehentlich kopierter API-Pfad
    .replace(/\/+$/, '')
}
