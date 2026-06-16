import { createBrowserClient } from '@supabase/ssr';

/**
 * Supabase browser client — use in Client Components.
 *
 * Environment variables required:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 */
export function createClient() {
  return createBrowserClient(
    process.env['NEXT_PUBLIC_SUPABASE_URL']!,
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!,
  );
}
