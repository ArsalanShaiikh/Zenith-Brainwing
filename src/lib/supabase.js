import { createClient } from '@supabase/supabase-js'

/**
 * The Supabase client (visitor analytics + the /admin dashboard).
 *
 * `createClient` throws at module load when it has no URL, and this module is
 * imported by lib/analytics.js, which App imports — so a build without the
 * vars used to fail before React mounted: a blank page on every route, not
 * just /admin. Same trap the Sanity client documents in sanity/client.js.
 *
 * Unconfigured, the app must still run. `supabaseConfigured` is false, the
 * trackers in analytics.js / geo.js return early without touching the
 * network, and /admin shows a "not configured" notice instead of a login.
 * The placeholder client only exists so imports resolve; nothing should call
 * it when `supabaseConfigured` is false.
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

/** Whether this build can talk to Supabase at all. */
export const supabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey)

if (!supabaseConfigured && import.meta.env.DEV) {
  console.warn(
    '[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY are not set — ' +
      'analytics are off and /admin is unavailable. See .env.example.',
  )
}

export const supabase = createClient(
  supabaseConfigured ? supabaseUrl : 'https://unconfigured.supabase.invalid',
  supabaseConfigured ? supabasePublishableKey : 'unconfigured',
  // No session persistence or token refresh timers for the placeholder.
  supabaseConfigured ? undefined : { auth: { persistSession: false, autoRefreshToken: false } },
)
