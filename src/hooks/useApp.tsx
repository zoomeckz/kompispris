import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, SUPABASE_URL_PUBLIC } from "@/lib/supabase";
import { t } from "@/i18n";
import { DEFAULT_SETTINGS, Recipe, Settings, ShoppingList, parseLibrary, setLibrary, setSettings as engineSetSettings, Library } from "@/lib/engine";

const LS_SETTINGS = "kompispris.settings";

interface AppState {
  lib: Library | null; libError: string | null;
  session: Session | null; user: User | null; isAdmin: boolean; authReady: boolean;
  settings: Settings; setSettings: (s: Settings) => void;
  recipes: Record<string, Recipe>; lists: Record<string, ShoppingList>;
  saveRecipe: (r: Recipe, now?: boolean) => void; deleteRecipe: (id: string) => Promise<void>;
  createRecipe: (r: Omit<Recipe, "id">) => Promise<Recipe | null>;
  saveList: (l: ShoppingList, now?: boolean) => void; deleteList: (id: string) => Promise<void>;
  createList: (l: Omit<ShoppingList, "id">) => Promise<ShoppingList | null>;
  logEvent: (kind: "search" | "add", term: string) => void;
  toast: (msg: string) => void;
  version: number; bump: () => void;
}
const Ctx = createContext<AppState>(null as unknown as AppState);
export const useApp = () => useContext(Ctx);

function loadLocalSettings(): Settings {
  try { const s = JSON.parse(localStorage.getItem(LS_SETTINGS) || "null"); if (s) return { ...DEFAULT_SETTINGS, ...s, stores: { ...DEFAULT_SETTINGS.stores, ...(s.stores || {}) } }; } catch { /* ignore */ }
  return DEFAULT_SETTINGS;
}

async function fetchLibrary(): Promise<any> {
  // 1) the library the scraper published to Supabase Storage, 2) the copy that ships with the app
  if (SUPABASE_URL_PUBLIC) {
    try {
      const base = `${SUPABASE_URL_PUBLIC}/storage/v1/object/public/library`;
      const meta = await fetch(`${base}/meta.json?t=${Math.floor(Date.now() / 60000)}`).then((r) => (r.ok ? r.json() : null));
      if (meta?.version) { const r = await fetch(`${base}/products.json?v=${meta.version}`); if (r.ok) return r.json(); }
    } catch { /* fall back */ }
  }
  const r = await fetch("/library/products.json"); if (!r.ok) throw new Error(t("lib_load_failed")); return r.json();
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [lib, setLib] = useState<Library | null>(null);
  const [libError, setLibError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!supabase);
  const [isAdmin, setIsAdmin] = useState(false);
  const [settings, setSettingsState] = useState<Settings>(() => { const s = loadLocalSettings(); engineSetSettings(s); return s; });
  const [recipes, setRecipes] = useState<Record<string, Recipe>>({});
  const [lists, setLists] = useState<Record<string, ShoppingList>>({});
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const timers = useRef<Record<string, number>>({});
  const user = session?.user ?? null;
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const toast = useCallback((m: string) => { setToastMsg(m); window.setTimeout(() => setToastMsg((x) => (x === m ? null : x)), 2400); }, []);

  useEffect(() => {
    fetchLibrary().then((d) => { const l = parseLibrary(d); setLibrary(l); setLib(l); }).catch((e) => setLibError(String(e.message || e)));
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  // load the signed-in user's data
  useEffect(() => {
    if (!supabase || !user) { setRecipes({}); setLists({}); setIsAdmin(false); return; }
    let live = true;
    (async () => {
      supabase.rpc("touch_last_seen").then(() => {});
      const [roles, rs, ls, st] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("recipes").select("*").order("updated_at", { ascending: false }),
        supabase.from("shopping_lists").select("*").order("updated_at", { ascending: false }),
        supabase.from("user_settings").select("settings").maybeSingle(),
      ]);
      if (!live) return;
      setIsAdmin(!!roles.data?.some((r: any) => r.role === "admin"));
      setRecipes(Object.fromEntries((rs.data || []).map((r: any) => [r.id, r])));
      setLists(Object.fromEntries((ls.data || []).map((l: any) => [l.id, l])));
      if (st.data?.settings && Object.keys(st.data.settings).length) {
        const s = { ...DEFAULT_SETTINGS, ...st.data.settings, stores: { ...DEFAULT_SETTINGS.stores, ...(st.data.settings.stores || {}) } };
        engineSetSettings(s); setSettingsState(s);
      }
    })();
    return () => { live = false; };
  }, [user?.id]);

  const setSettings = useCallback((s: Settings) => {
    engineSetSettings(s); setSettingsState(s);
    try { localStorage.setItem(LS_SETTINGS, JSON.stringify(s)); } catch { /* ignore */ }
    if (supabase && user) supabase.from("user_settings").upsert({ user_id: user.id, settings: s, updated_at: new Date().toISOString() }).then(() => {});
  }, [user?.id]);

  const debounced = (key: string, fn: () => void, now?: boolean) => {
    window.clearTimeout(timers.current[key]);
    if (now) fn(); else timers.current[key] = window.setTimeout(fn, 700);
  };

  const saveRecipe = useCallback((r: Recipe, now?: boolean) => {
    if (!supabase || !user) { toast(t("log_in_to_save")); return; }
    const row = { ...r, updated_at: new Date().toISOString() };
    setRecipes((m) => ({ ...m, [r.id]: row }));
    debounced("r" + r.id, () => { supabase!.from("recipes").update({ name: r.name, portions: r.portions, notes: r.notes, ings: r.ings, updated_at: row.updated_at }).eq("id", r.id).then(({ error }) => { if (error) toast(t("save_recipe_failed")); }); }, now);
  }, [user?.id]);
  const createRecipe = useCallback(async (r: Omit<Recipe, "id">) => {
    if (!supabase || !user) { toast(t("log_in_to_save_recipes")); return null; }
    const { data, error } = await supabase.from("recipes").insert({ name: r.name, portions: r.portions, notes: r.notes, ings: r.ings }).select().single();
    if (error) { toast(t("create_recipe_failed")); return null; }
    setRecipes((m) => ({ [data.id]: data, ...m })); return data as Recipe;
  }, [user?.id]);
  const deleteRecipe = useCallback(async (id: string) => {
    if (!supabase) return; window.clearTimeout(timers.current["r" + id]);
    setRecipes((m) => { const n = { ...m }; delete n[id]; return n; });
    await supabase.from("recipes").delete().eq("id", id);
  }, []);

  const saveList = useCallback((l: ShoppingList, now?: boolean) => {
    if (!supabase || !user) { toast(t("log_in_to_save")); return; }
    const row = { ...l, updated_at: new Date().toISOString() };
    setLists((m) => ({ ...m, [l.id]: row }));
    debounced("l" + l.id, () => { supabase!.from("shopping_lists").update({ name: l.name, mode: l.mode, items: l.items, updated_at: row.updated_at }).eq("id", l.id).then(({ error }) => { if (error) toast(t("save_list_failed")); }); }, now);
  }, [user?.id]);
  const createList = useCallback(async (l: Omit<ShoppingList, "id">) => {
    if (!supabase || !user) { toast(t("log_in_to_create_lists")); return null; }
    const { data, error } = await supabase.from("shopping_lists").insert({ name: l.name, mode: l.mode, items: l.items }).select().single();
    if (error) { toast(t("create_list_failed")); return null; }
    setLists((m) => ({ [data.id]: data, ...m })); return data as ShoppingList;
  }, [user?.id]);
  const deleteList = useCallback(async (id: string) => {
    if (!supabase) return; window.clearTimeout(timers.current["l" + id]);
    setLists((m) => { const n = { ...m }; delete n[id]; return n; });
    await supabase.from("shopping_lists").delete().eq("id", id);
  }, []);

  // searches are logged once the person stops typing; a longer version of the same word replaces the shorter one
  const pending = useRef<{ kind: string; term: string; at: number } | null>(null);
  const logTimer = useRef<number>();
  const logEvent = useCallback((kind: "search" | "add", term0: string) => {
    if (!supabase) return;
    const term = term0.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 80); if (term.length < 2) return;
    const flush = (e: { kind: string; term: string }) => supabase!.from("usage_events").insert({ kind: e.kind, term: e.term, user_id: user?.id ?? null }).then(() => {});
    if (kind === "add") { flush({ kind, term }); return; }
    const p = pending.current;
    if (p && !(term.startsWith(p.term) || p.term.startsWith(term))) flush(p);
    pending.current = { kind, term, at: Date.now() };
    window.clearTimeout(logTimer.current);
    logTimer.current = window.setTimeout(() => { if (pending.current) { flush(pending.current); pending.current = null; } }, 2500);
  }, [user?.id]);

  const value = useMemo<AppState>(() => ({
    lib, libError, session, user, isAdmin, authReady, settings, setSettings, recipes, lists,
    saveRecipe, deleteRecipe, createRecipe, saveList, deleteList, createList, logEvent, toast, version, bump,
  }), [lib, libError, session, isAdmin, authReady, settings, recipes, lists, version, setSettings, saveRecipe, saveList, createRecipe, createList, deleteRecipe, deleteList, logEvent, toast, bump]);

  return <Ctx.Provider value={value}>{children}{toastMsg && <div className="toast" role="status" key={toastMsg}>{toastMsg}</div>}</Ctx.Provider>;
}
