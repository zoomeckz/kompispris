/* KompisPris price engine.
 * Everything here works on the price library (products.json) that the scraper publishes.
 * Nothing in the app ever fetches from the stores directly.
 * ÖoB has no price data at all: it only uses prices people type in themselves (like ICA's own prices). */
import { t } from "@/i18n";

export type StoreCode = "w" | "h" | "c" | "i" | "l" | "o";
export const STORES: Record<StoreCode, string> = { w: "Willys", h: "Hemköp", c: "Coop", i: "ICA", l: "Lidl", o: "ÖoB" };
export const STORE_CODES: StoreCode[] = ["w", "h", "c", "i", "l", "o"];
export const CHAIN_CODES: StoreCode[] = ["w", "h", "c"];
export const UNITS: Record<string, number | null> = { g: 1, kg: 1000, ml: 1, dl: 100, l: 1000, msk: 15, tsk: 5, krm: 1, st: null };
export type Unit = keyof typeof UNITS;

export interface Product {
  s: StoreCode; id: string; n: string; b: string; sz: string; p: number; pu: "st" | "kg";
  cp: number | null; cu: string; e: string; cat: string; m: number[] | null;
  o: number | null; ot: string; om: number; g: number | null; oe: number | null; os: number | null;
  key: string; nn: string; tk: string[]; h3: string[];
}
export interface LidlOffer { id: string; n: string; p: number | null; plus: number | null; old: number | null; cmp: number | null; cu: string; pack: string; info: string; end: number | null; url: string; kgpriced: boolean; key: string; nn: string; h3: string[]; g: number | null; }
export interface IcaOffer { id: string; n: string; b: string; pack: string; mech: string; unit: number; qty: number; kg: boolean; reg: number | null; cmp: string; member: boolean; end: number | null; store: string; eans: string[]; m: number[] | null; cat: string; g: number | null; key: string; nn: string; h3: string[]; }
export interface SlvFood { i: number; n: string; m: number[]; nn: string; }

export interface Ingredient {
  id: string; label: string; q: string | null; qty: number; unit: Unit;
  picks: Partial<Record<StoreCode, string>>; icaOffer?: string | null; lidl?: string | null;
  ica?: OwnPrice | null; oob?: OwnPrice | null;
  gPerSt?: number | null; pantry?: boolean; done?: boolean; from?: string[];
  macro?: { slv?: number; custom?: number[] } | null;
}
/** a shelf price someone typed in: per pack (with the pack's weight or piece count), or per kg */
export interface OwnPrice { price: number; grams?: number | null; pcs?: number | null; perKg?: boolean }
export interface Recipe { id: string; name: string; portions: number; notes: string; ings: Ingredient[]; updated_at?: string; }
export interface ShoppingList { id: string; name: string; mode: Mode; items: Ingredient[]; updated_at?: string; }
export type Mode = "cheap" | "k" | StoreCode;

export interface Settings { offers: boolean; member: boolean; stores: Record<StoreCode, boolean>; }
export const DEFAULT_SETTINGS: Settings = { offers: true, member: false, stores: { w: true, h: true, c: true, i: true, l: true, o: true } };

export interface Cost {
  buy: number; used: number; packs: number; grams?: number; label?: string; offer?: boolean; member?: boolean;
  dealQty?: number | null; guess?: boolean; locked?: boolean; pantry?: boolean; store?: string; p?: Product;
}

/* ---------- text helpers ---------- */
export function norm(s: unknown): string {
  return String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}
const STOP = new Set(["och", "med", "i", "av", "for", "fran", "ca", "st", "g", "kg", "ml", "l", "pa", "sverige", "svensk", "svenska", "eko", "ekologisk", "klass", "1", "2", "garant", "eldorado", "coop", "ica", "x", "fryst", "farsk"]);
export const toks = (s: unknown) => norm(s).split(" ").filter((t) => t.length > 1 && !STOP.has(t));
export const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
export function packGrams(t0: unknown): number | null {
  let t = String(t0 ?? "").toLowerCase().replace(",", ".");
  let m = t.match(/(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*(kg|g|ml|cl|l)\b/); let mult = 1;
  if (m) { mult = +m[1]; t = m[2] + " " + m[3]; }
  m = t.match(/(\d+(?:\.\d+)?)\s*(kg|g|ml|cl|liter|l)\b/); if (!m) return null;
  const f: Record<string, number> = { kg: 1000, g: 1, ml: 1, cl: 10, l: 1000, liter: 1000 };
  return +m[1] * f[m[2]] * mult;
}

/* ---------- library state ---------- */
export interface Library {
  updated: string; cats: Record<string, string>; P: Product[]; byKey: Map<string, Product>; byEan: Map<string, Product[]>;
  lidl: LidlOffer[]; ica: IcaOffer[]; slv: SlvFood[];
}
let L: Library | null = null;
let cfg: Settings = DEFAULT_SETTINGS;
const gcache = new Map<string, any>();
const gexact = new Map<string, boolean>();
let rcache = new WeakMap<Ingredient, Partial<Record<StoreCode, Cost | null>>>();

export const lib = () => L as Library;
export function setSettings(s: Settings) { cfg = s; rcache = new WeakMap(); }
export function settings() { return cfg; }
export function resetCostCache() { rcache = new WeakMap(); }

export function parseLibrary(d: any): Library {
  const C: string[] = d.cols;
  const P: Product[] = d.rows.map((r: any[]) => {
    const o: any = {}; C.forEach((c, i) => (o[c] = r[i]));
    o.key = o.s + ":" + o.id; o.nn = norm(o.n + " " + o.b); o.tk = toks(o.n); o.h3 = norm(o.n).split(" ").slice(0, 3);
    return o as Product;
  });
  const byKey = new Map<string, Product>(); const byEan = new Map<string, Product[]>();
  P.forEach((p) => { byKey.set(p.key, p); if (p.e) { if (!byEan.has(p.e)) byEan.set(p.e, []); byEan.get(p.e)!.push(p); } });
  const lidl: LidlOffer[] = (d.lidl || []).map((x: any) => ({ ...x, key: "l:" + x.id, nn: norm(x.n),
    h3: norm(String(x.n).replace(/^(?:[A-ZÅÄÖÉ0-9'&.-]{2,}\s+)+/, "")).split(" ").slice(0, 3), g: packGrams(x.pack) }));
  const ica: IcaOffer[] = (d.ica || []).map((x: any) => ({ ...x, key: "i:" + x.id, nn: norm(x.n + " " + x.b + " " + x.store), h3: norm(x.n).split(" ").slice(0, 3), g: x.g || packGrams(x.pack) }));
  const slv: SlvFood[] = (d.slv || []).map((x: any[], i: number) => ({ i, n: x[0], m: [x[1], x[2], x[3], x[4]], nn: norm(x[0]) }));
  return { updated: d.updated, cats: d.cats, P, byKey, byEan, lidl, ica, slv };
}
export function setLibrary(l: Library) { L = l; gcache.clear(); gexact.clear(); rcache = new WeakMap(); }

/* ---------- product helpers ---------- */
export function prodMacros(p?: Product | null): number[] | null {
  if (!p || !L) return null; if (p.m) return p.m;
  for (const q of (p.e && L.byEan.get(p.e)) || []) if (q.m) return q.m;
  return null;
}
export function unitPrice(p: Product) {
  const useOffer = cfg.offers && p.o && (!p.om || cfg.member);
  return useOffer ? (p.o as number) : p.p;
}
export function search(q: string, opts: { stores?: StoreCode[] | null; cat?: string | null; limit?: number } = {}) {
  const { stores = null, cat = null, limit = 60 } = opts;
  const qt = norm(q).split(" ").filter(Boolean); if (!qt.length || !L) return [];
  const out: [number, Product][] = [];
  for (const p of L.P) {
    if (stores && !stores.includes(p.s)) continue;
    if (cat && p.cat !== cat) continue;
    let sc = 0, ok = true;
    for (const t of qt) { const i = p.nn.indexOf(t); if (i < 0) { ok = false; break; } sc += i === 0 ? 3 : p.nn[i - 1] === " " ? 2 : 1; }
    if (!ok) continue;
    sc += 2 / (1 + p.nn.length / 25); if (p.m) sc += 0.3;
    out.push([sc, p]);
  }
  out.sort((a, b) => b[0] - a[0] || (a[1].cp || 1e9) - (b[1].cp || 1e9));
  return out.slice(0, limit).map((x) => x[1]);
}
export function searchSlv(q: string) {
  const qt = norm(q).split(" ").filter(Boolean); if (!qt.length || !L) return [];
  return L.slv.filter((x) => qt.every((t) => x.nn.includes(t))).sort((a, b) => a.nn.length - b.nn.length).slice(0, 30);
}
export function slvGuess(label: string) {
  const t = toks(label);
  for (let k = t.length; k > 0; k--) { const r = searchSlv(t.slice(0, k).join(" ")); if (r.length) return r[0]; }
  return null;
}

/* ---------- quantities ---------- */
const PIECE_G: Record<string, number> = { agg: 60, lok: 120, gul: 120, rodlok: 100, vitlok: 5, vitloksklyfta: 5, paprika: 150, tomat: 100, tomater: 100, banan: 120, bananer: 120, apple: 150, applen: 150, potatis: 100, morot: 70, morotter: 70, citron: 100, lime: 60, avokado: 150, gurka: 350, zucchini: 250, aubergine: 300, broccoli: 400, blomkal: 600, purjolok: 250, salladslok: 15, sotpotatis: 300, ingefara: 30, apelsin: 200, paron: 170, kiwi: 80, champinjoner: 20, rodbeta: 120, chili: 15, schalottenlok: 30, kalrot: 800, palsternacka: 100, fankal: 250 };
export function pcs(p?: Product | null) { return p && p.cu === "st" && (p.cp || 0) > 0 && p.pu === "st" ? Math.max(1, Math.round(p.p / (p.cp as number))) : null; }
export function pieceGrams(ing: Ingredient, p?: Product | null) {
  if (+(ing.gPerSt || 0)) return +(ing.gPerSt as number);
  if (p && p.g && pcs(p)) return p.g / (pcs(p) as number);
  for (const t of toks(ing.q || ing.label)) if (PIECE_G[t]) return PIECE_G[t];
  return null;
}
const unitG = (u: Unit) => (UNITS[u] as number) || 1;

/* what it costs to buy enough of product p for this ingredient */
export function buyFor(ing: Ingredient, p: Product): Cost | null {
  const q = +ing.qty || 0; if (q <= 0) return { buy: 0, used: 0, packs: 0 };
  const price = unitPrice(p); const pc = pcs(p);
  let G: number | null = ing.unit === "st" ? null : q * unitG(ing.unit);
  if (p.pu === "kg") {
    if (G == null) { const w = pieceGrams(ing, p); if (!w) return null; G = q * w; }
    const c = (price * G) / 1000; return { buy: c, used: c, packs: 0, grams: G, offer: price !== p.p, member: price !== p.p && !!p.om };
  }
  let frac: number, guess = false;
  if (ing.unit === "st") {
    if (pc) frac = q / pc;
    else if (p.g) { const w = pieceGrams(ing, p); frac = w ? (q * w) / p.g : q; }
    else frac = q;
  } else {
    if (p.g) frac = (G as number) / p.g;
    else if (pc) { const w = pieceGrams(ing, p); if (w) frac = (G as number) / w / pc; else { frac = 1; guess = true; } }
    else { frac = 1; guess = true; }
  }
  let packs = Math.max(1, Math.ceil(frac - 1e-9)), unit = price, deal: number | null = null;
  if (unit !== p.p) {
    const m = /^(\d+)\s*för/.exec(p.ot || "");
    if (m) { const n = +m[1]; if (packs < n) { if (n * unit < packs * p.p) { packs = n; deal = n; } else unit = p.p; } else deal = n; }
  }
  return { buy: packs * unit, used: Math.min(frac, packs) * unit, packs, offer: unit !== p.p, member: unit !== p.p && !!p.om, dealQty: deal, guess };
}

/* products matching the ingredient's search words (head of the product name) */
export function groupFor(ing: { q: string | null }): Product[] {
  if (!ing.q || !L) return [];
  const key = norm(ing.q); if (gcache.has(key)) return gcache.get(key);
  const qt = key.split(" ").filter(Boolean);
  const hit = (h: string, t: string, pref: boolean) => h === t || (pref && t.length >= 4 && h.startsWith(t));
  let cand: { p: Product; exact: boolean; anchor: boolean }[] = [];
  for (const p of L.P) {
    let ok = true, exact = true;
    for (const t of qt) {
      if (p.h3.includes(t)) continue;
      if (t.length >= 4 && p.h3.some((h) => h.startsWith(t))) { exact = false; continue; }
      ok = false; break;
    }
    if (ok) cand.push({ p, exact, anchor: qt.length > 1 || hit(p.h3[0], qt[0], true) });
  }
  const anyExact = cand.some((x) => x.exact); gexact.set(key, anyExact);
  if (anyExact) { cand = cand.filter((x) => x.exact); cand.forEach((x) => (x.anchor = qt.length > 1 || x.p.h3[0] === qt[0])); }
  let base = cand.filter((x) => x.anchor && x.exact);
  if (!base.length) base = cand.filter((x) => x.anchor);
  if (!base.length) base = cand.filter((x) => x.exact);
  if (!base.length) base = cand;
  const cc: Record<string, number> = {}; base.forEach((x) => (cc[x.p.cat] = (cc[x.p.cat] || 0) + 1));
  const cats = new Set(Object.keys(cc).filter((c) => cc[c] >= Math.max(1, base.length * 0.15)));
  const out = cand.filter((x) => cats.has(x.p.cat) && (x.anchor || x.exact)).map((x) => x.p);
  gcache.set(key, out); return out;
}
const ICA_CAT: Record<string, string[]> = { "Färskvaror": ["kott", "fisk", "mejeri", "ost", "fardig", "veg", "brod"], "Skafferivaror": ["skafferi", "krydd", "snacks", "dryck", "fardig"], "Frukt & Grönt": ["frukt"], "Djupfryst": ["fryst", "kott", "fisk", "veg", "fardig"], "Mejeri": ["mejeri", "ost"], "Bröd, kex & bageri": ["brod", "snacks"] };
export function offerGroup(ing: { q: string | null }, list: "ica" | "lidl"): any[] {
  if (!ing.q || !L) return [];
  const key = list + "|" + norm(ing.q); if (gcache.has(key)) return gcache.get(key);
  const qt = norm(ing.q).split(" ").filter(Boolean);
  const grp = groupFor(ing); const exactOnly = gexact.get(norm(ing.q));
  const hit = (h: string, t: string) => h === t || (!exactOnly && t.length >= 4 && h.startsWith(t));
  const cats = list === "ica" ? new Set(grp.map((p) => p.cat)) : null;
  const ok = (x: any) => {
    if (qt.length > 1 || hit(x.h3[0], qt[0])) return true;
    if (cats && cats.size) return (ICA_CAT[x.cat] || []).some((c) => cats.has(c));
    return false;
  };
  const out = (L[list] as any[]).filter((x) => qt.every((t) => x.h3.some((h: string) => hit(h, t))) && ok(x));
  gcache.set(key, out); return out;
}

function resolve(ing: Ingredient) {
  const hit = rcache.get(ing); if (hit) return hit;
  const res: Partial<Record<StoreCode, Cost | null>> = {}; const grp = groupFor(ing);
  for (const s of CHAIN_CODES) {
    const lockedP = ing.picks?.[s] ? L!.byKey.get(ing.picks[s] as string) : undefined;
    const pool = lockedP ? [lockedP] : grp.filter((p) => p.s === s);
    let best: Cost | null = null;
    for (const p of pool) {
      const b = buyFor(ing, p); if (!b) continue;
      if (!best || b.buy < best.buy - 1e-9 || (Math.abs(b.buy - best.buy) < 1e-9 && b.used < best.used)) best = { ...b, p, label: p.n, locked: !!lockedP };
    }
    res[s] = best;
  }
  rcache.set(ing, res); return res;
}
export function macroProduct(ing: Ingredient): Product | null {
  const r = resolve(ing);
  const got = Object.values(r).filter(Boolean).sort((a, b) => a!.buy - b!.buy) as Cost[];
  for (const x of got) if (prodMacros(x.p)) return x.p!;
  for (const p of groupFor(ing)) if (prodMacros(p)) return p;
  return got[0]?.p || null;
}
export function ingGrams(ing: Ingredient): number | null {
  const q = +ing.qty || 0;
  if (ing.unit === "st") { const w = pieceGrams(ing, macroProduct(ing)); return w ? q * w : null; }
  return q * unitG(ing.unit);
}
export function ingMacros(ing: Ingredient): number[] | null {
  const g = ingGrams(ing); if (g == null) return null;
  let m: number[] | null = null;
  if (ing.macro?.custom) m = ing.macro.custom;
  else if (ing.macro?.slv != null) m = L!.slv[ing.macro.slv]?.m || null;
  else m = prodMacros(macroProduct(ing));
  if (!m) { const s = slvGuess(ing.q || ing.label); if (s) m = s.m; }
  return m ? m.map((v) => (v * g) / 100) : null;
}
function packFrac(ing: Ingredient, g0: number | null) {
  const q = +ing.qty || 0;
  if (ing.unit === "st") { const w = pieceGrams(ing); return g0 && w ? (q * w) / g0 : q; }
  return g0 ? (q * unitG(ing.unit)) / g0 : null;
}
export function lidlBuy(ing: Ingredient, x: LidlOffer): Cost | null {
  const usePlus = x.plus != null && cfg.member && (x.p == null || x.plus < x.p);
  if (x.p == null && !usePlus) return null;
  const price = (usePlus ? x.plus : x.p) as number;
  if (x.kgpriced) { const g = ingGrams(ing); if (g == null) return null; const c = (price * g) / 1000; return { used: c, buy: c, packs: 0, grams: g, label: x.n, offer: true, member: usePlus }; }
  let frac = packFrac(ing, x.g), guess = false; if (frac == null) { frac = 1; guess = true; }
  const packs = Math.max(1, Math.ceil(frac - 1e-9));
  return { buy: packs * price, used: Math.min(frac, packs) * price, packs, label: x.n, offer: true, member: usePlus, guess };
}
export const icaStoreShort = (x: IcaOffer) => x.store.replace(/\s*\(.*\)$/, "");
export function icaBuy(ing: Ingredient, x: IcaOffer): Cost | null {
  const useOffer = !x.member || cfg.member;
  if (!useOffer && !x.reg) return null;
  const u = (useOffer ? x.unit : x.reg) as number; const short = icaStoreShort(x);
  if (x.kg) { const g = ingGrams(ing); if (g == null) return null; const c = (u * g) / 1000; return { used: c, buy: c, packs: 0, grams: g, label: `${x.n} · ${short}`, offer: useOffer, member: useOffer && x.member, store: short }; }
  let frac = packFrac(ing, x.g), guess = false; if (frac == null) { frac = 1; guess = true; }
  let packs = Math.max(1, Math.ceil(frac - 1e-9)), buy = packs * u, offer = useOffer, dealQty: number | null = null;
  if (useOffer && x.qty > 1) {
    if (packs < x.qty) {
      const deal = x.qty * u, regular = x.reg ? packs * x.reg : Infinity;
      if (regular < deal) { buy = regular; offer = false; } else { buy = deal; packs = x.qty; dealQty = x.qty; }
    } else dealQty = x.qty;
  }
  return { buy, used: Math.min(frac, packs) * (buy / packs), packs, label: `${x.n} · ${short}`, offer, member: offer && x.member, store: short, dealQty, guess };
}
function cheapestOffer(ing: Ingredient, pool: any[], fn: (i: Ingredient, x: any) => Cost | null, locked: boolean) {
  let best: Cost | null = null;
  for (const x of pool) { const b = fn(ing, x); if (b && (!best || b.buy < best.buy)) best = b; }
  if (best) best.locked = locked; return best;
}
function ownCost(ing: Ingredient, x: OwnPrice, s: StoreCode): Cost | null {
  const q = +ing.qty || 0; const lbl = t("own_price_label", { store: STORES[s] });
  if (x.perKg) { const g = ingGrams(ing); if (g == null) return null; const c = (x.price * g) / 1000; return { used: c, buy: c, packs: 0, label: lbl }; }
  let frac: number;
  if (ing.unit === "st") { const w = pieceGrams(ing); frac = +(x.pcs || 0) ? q / +(x.pcs as number) : +(x.grams || 0) && w ? (q * w) / +(x.grams as number) : q; }
  else { const g = q * unitG(ing.unit); frac = +(x.grams || 0) ? g / +(x.grams as number) : 1; }
  const packs = Math.max(1, Math.ceil(frac - 1e-9));
  return { buy: packs * x.price, used: Math.min(frac, packs) * x.price, packs, label: lbl };
}
export function ingCost(ing: Ingredient, s: StoreCode): Cost | null {
  if (ing.pantry) return { used: 0, buy: 0, packs: 0, pantry: true };
  if (s === "w" || s === "h" || s === "c") return resolve(ing)[s] || null;
  if (s === "o") return ing.oob?.price ? ownCost(ing, ing.oob, "o") : null;
  if (s === "i") {
    if (ing.ica?.price) return ownCost(ing, ing.ica, "i");
    const pool = ing.icaOffer ? L!.ica.filter((y) => y.key === ing.icaOffer) : offerGroup(ing, "ica");
    return cheapestOffer(ing, pool, icaBuy, !!ing.icaOffer);
  }
  const pool = ing.lidl ? L!.lidl.filter((y) => y.key === ing.lidl) : offerGroup(ing, "lidl");
  return cheapestOffer(ing, pool, lidlBuy, !!ing.lidl);
}

/* ---------- totals ---------- */
export const activeStores = () => STORE_CODES.filter((s) => cfg.stores[s] !== false);
export interface Line { ing: Ingredient; s: StoreCode | null; c: Cost | null; v?: number; }
export interface Totals { per: Record<string, { sum: number; used: number; missing: number; lines: Line[] }>; mac: number[]; macMissing: number; cheapest: { sum: number; used: number; missing: number; lines: Line[] }; combos: { set: StoreCode[]; sum: number; used: number; miss: number; lines: Line[] }[]; }
export function totals(ings: Ingredient[]): Totals {
  const stores = activeStores();
  const per: Totals["per"] = {}; stores.forEach((s) => (per[s] = { sum: 0, used: 0, missing: 0, lines: [] }));
  const mac = [0, 0, 0, 0]; let macMissing = 0;
  const cheapest = { sum: 0, used: 0, missing: 0, lines: [] as Line[] };
  const costs = ings.map((ing) => Object.fromEntries(stores.map((s) => [s, ingCost(ing, s)])) as Record<string, Cost | null>);
  ings.forEach((ing, i) => {
    const m = ingMacros(ing); if (m) m.forEach((v, k) => (mac[k] += v)); else macMissing++;
    let best: Line | null = null;
    for (const s of stores) {
      const c = costs[i][s];
      if (!c) { per[s].missing++; per[s].lines.push({ ing, c: null, s: null }); }
      else { per[s].sum += c.buy; per[s].used += c.used; per[s].lines.push({ ing, c, s, v: c.buy }); if (!best || c.buy < (best.c as Cost).buy - 1e-9) best = { ing, s, c, v: c.buy }; }
    }
    if (best) { cheapest.sum += best.v as number; cheapest.used += (best.c as Cost).used; cheapest.lines.push(best); }
    else { cheapest.missing++; cheapest.lines.push({ ing, s: null, c: null }); }
  });
  const combos: Totals["combos"] = [];
  for (let mask = 1; mask < 1 << stores.length; mask++) {
    const set = stores.filter((_, i) => mask & (1 << i));
    let sum = 0, used = 0, miss = 0; const lines: Line[] = [];
    ings.forEach((ing, i) => {
      let b: Line | null = null;
      for (const s of set) { const c = costs[i][s]; if (c && (!b || c.buy < (b.c as Cost).buy - 1e-9)) b = { ing, s, c, v: c.buy }; }
      if (b) { sum += b.v as number; used += (b.c as Cost).used; lines.push(b); } else { miss++; lines.push({ ing, s: null, c: null }); }
    });
    combos.push({ set, sum, used, miss, lines });
  }
  return { per, mac, macMissing, cheapest, combos };
}
export interface ModeResult { title: string; sum: number; used: number; miss: number; lines: Line[]; }
export function modeResult(tot: Totals, mode: Mode): ModeResult {
  if (mode === "cheap") return { title: t("title_cheap"), sum: tot.cheapest.sum, used: tot.cheapest.used, miss: tot.cheapest.missing, lines: tot.cheapest.lines };
  if (mode === "k") {
    const ok = tot.combos.filter((c) => c.set.length <= 2).sort((a, b) => a.miss - b.miss || a.sum - b.sum || a.set.length - b.set.length);
    const c = ok[0]; if (!c) return { title: t("title_k"), sum: 0, used: 0, miss: 0, lines: [] };
    return { title: t("title_k_set", { stores: c.set.map((s) => STORES[s]).join(" + ") }), sum: c.sum, used: c.used, miss: c.miss, lines: c.lines };
  }
  const s = cfg.stores[mode] === false ? activeStores()[0] : mode; const p = tot.per[s];
  if (!p) return { title: STORES[s], sum: 0, used: 0, miss: 0, lines: [] };
  return { title: t("title_all_from", { store: STORES[s] }), sum: p.sum, used: p.used, miss: p.missing, lines: p.lines };
}

/* ---------- offer notes: where an extra price applies and what it needs ---------- */
export function memberName(s: StoreCode): string {
  return { w: "Willys Plus", h: t("mem_h"), c: t("mem_c"), i: t("mem_i"), l: "Lidl Plus", o: "" }[s];
}
const storeFull = (s: StoreCode) => ({ w: "Willys Vällingby", h: "Hemköp Vällingby C", c: t("coop_online_sthlm"), l: "Lidl" } as Record<string, string>)[s];
export function offerWhere(s: StoreCode, c: { store?: string; p?: Product }) {
  if (s === "i") { const st = c.store || t("an_ica_store"); return { short: t("ow_only", { store: st }), long: t("ow_only_long", { store: st }) }; }
  if (s === "l") return { short: t("ow_all_lidl"), long: t("ow_all_lidl_long") };
  if (s === "c") return { short: t("ow_eshop"), long: t("ow_coop_long") };
  const os = c.p?.os;
  if (os === 1) return { short: t("ow_only", { store: storeFull(s).replace(/^\S+\s/, "") }), long: t("ow_only_long", { store: storeFull(s) }) };
  if (os === 0) return { short: t("ow_whole_chain"), long: t("ow_chain_long", { store: STORES[s] }) };
  return { short: storeFull(s), long: t("ow_fetched_for", { store: storeFull(s) }) };
}
export function offerNote(s: StoreCode | null, c: Cost | null) {
  if (!s || !c || !c.offer) return "";
  return [t("extra_price"), offerWhere(s, c).long, c.member && t("requires", { what: memberName(s) }), c.dealQty && t("deal_qty", { n: c.dealQty })].filter(Boolean).join(", ");
}
export function offerShort(s: StoreCode, c: Cost | null) {
  if (!c || !c.offer) return "";
  return [offerWhere(s, c).short, c.member && t("member_lc"), c.dealQty && t("deal_short", { n: c.dealQty })].filter(Boolean).join(" · ");
}

/* ---------- labels ---------- */
export function niceLabel(q: string) {
  const qt = norm(q).split(" ").filter(Boolean); if (!qt.length) return q;
  const last = qt[qt.length - 1]; const cnt: Record<string, number> = {};
  for (const p of groupFor({ q })) {
    for (const w of String(p.n).split(/\s+/).slice(0, 3)) { if (norm(w).startsWith(last)) { cnt[w] = (cnt[w] || 0) + 1; break; } }
  }
  const best = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
  if (!best || norm(best[0]) === last) return cap(q.trim());
  const words = q.trim().split(/\s+/); words[words.length - 1] = best[0].replace(/[,.;:]+$/, "").toLowerCase();
  return cap(words.join(" "));
}
