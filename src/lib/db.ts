import type { SupabaseClient } from "@supabase/supabase-js";

/* The database client (supabase-js) is the largest library in the app, and the first screen doesn't need it,
 * so code that is part of the start bundle gets it through db(): it is downloaded on first use, alongside the
 * price library. Pages that are downloaded on their own anyway may import "@/lib/supabase" directly. */

/** accounts are on when the project has a database (Lovable fills in the URL) */
export const HAS_ACCOUNTS = !!import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_URL_PUBLIC: string = import.meta.env.VITE_SUPABASE_URL || "";

let client: Promise<SupabaseClient> | null = null;
export const db = () => (client ??= import("./supabase").then((m) => m.supabase));
