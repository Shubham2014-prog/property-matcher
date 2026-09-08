import { createClient } from "@supabase/supabase-js";

import { normalizeSupabaseProjectUrl } from "@/lib/supabase/config";
import type { Database } from "@/types/database";

export function createBrowserSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase public environment variables.");
  }

  return createClient<Database>(
    normalizeSupabaseProjectUrl(supabaseUrl),
    supabaseAnonKey,
  );
}
