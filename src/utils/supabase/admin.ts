import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cachedAdminClient: SupabaseClient | null = null;
let lastAdminUrl = '';
let lastAdminKey = '';

export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required for the admin client.');
  }

  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for the admin client.');
  }

  // Reuse cached singleton instance across serverless invocations within the same container isolate
  if (cachedAdminClient && lastAdminUrl === url && lastAdminKey === key) {
    return cachedAdminClient;
  }

  cachedAdminClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  lastAdminUrl = url;
  lastAdminKey = key;

  return cachedAdminClient;
}

