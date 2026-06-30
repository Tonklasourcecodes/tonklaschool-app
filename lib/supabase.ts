import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/** Server-side client — bypasses RLS, use only in API routes */
export function createServerSupabase() {
  return createClient(URL, SERVICE, { auth: { persistSession: false } });
}

/** Browser/client client — anon key, RLS applies */
export function createBrowserSupabase() {
  return createClient(URL, ANON);
}
