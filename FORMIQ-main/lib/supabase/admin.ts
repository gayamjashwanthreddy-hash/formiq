import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Admin client with service-role key.
 * NEVER import this in client components or expose to the browser.
 * Use only in API routes and Server Actions.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
