import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase as client } from "@/integrations/supabase/client";

// The app reads and writes JSON columns (recipes, lists, settings) with its own types, so it uses the client
// untyped. The Lovable-generated client in src/integrations stays untouched so Lovable can regenerate it.
// Only import this from pages that are downloaded on their own; start-bundle code uses db() from ./db.
export const supabase = client as unknown as SupabaseClient;
