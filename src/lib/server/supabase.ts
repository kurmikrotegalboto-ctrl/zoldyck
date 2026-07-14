import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    "[supabase] MISSING SUPABASE_URL or SUPABASE_SERVICE_KEY env vars. " +
    "Data will NOT persist across devices. Set them in Vercel Dashboard → Settings → Environment Variables."
  );
}

// Server-only Supabase client (service_role bypasses RLS)
// If env vars are missing, this creates a non-functional client that will error on use
export const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null as unknown as ReturnType<typeof createClient>;

export function isSupabaseConfigured(): boolean {
  return !!(SUPABASE_URL && SUPABASE_SERVICE_KEY);
}