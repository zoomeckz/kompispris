import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase as client } from "@/integrations/supabase/client";

// The app reads and writes JSON columns (recipes, lists, settings) with its own types, so it uses the client
// untyped. The Lovable-generated client in src/integrations stays untouched so Lovable can regenerate it.
export const supabase = client as unknown as SupabaseClient;
export const SUPABASE_URL_PUBLIC: string = import.meta.env.VITE_SUPABASE_URL || "";
