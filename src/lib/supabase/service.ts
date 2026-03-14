import { createClient } from "@supabase/supabase-js";

/**
 * Create a Supabase client using the service role key.
 * This bypasses Row Level Security and should ONLY be used in
 * server-side API routes for trusted operations.
 * Never expose this client to the browser.
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  );
}
