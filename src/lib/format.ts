import { Cost, Ingredient, Line, Product, STORES, Recipe, ShoppingList, ingGrams, modeResult, offerNote, totals, Mode, lib, groupFor, Unit } from "./engine";
import { fmtDate, t, unitLabel } from "@/i18n";

export const kr = (v?: number | null) => (v == null || isNaN(v) ? "–" : v.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " kr");
export const kr0 = (v?: number | null) => (v == null || isNaN(v) ? "–" : v.toLocaleString("sv-SE", { maximumFractionDigits: 0 }) + " kr");
export const num2 = (v: number) => v.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const n0 = (v?: number) => Math.round(v || 0).toLocaleString("sv-SE");
export const n1 = (v?: number) => (Math.round((v || 0) * 10) / 10).toLocaleString("sv-SE");
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
export const fmtQty = (ing: Ingredient) => `${(Math.round((+ing.qty || 0) * 100) / 100).toLocaleString("sv-SE")} ${unitLabel(ing.unit)}`;
export function packTxt(c: Cost | null) {
  if (!c) return ""; if (c.pantry) return t("at_home");
  if (!c.packs) return c.grams ? `${n0(c.grams)} ${unitLabel("g")}` : t("loose_weight");
  return t("pack_short", { n: c.packs });
}
export const cmpTxt = (p: Product) => (p.cp ? t("cmp_prefix", { v: `${p.cp.toLocaleString("sv-SE", { minimumFractionDigits: 2 })} kr/${unitLabel(p.cu || "st")}` }) : "");
export function lineQty(l: Line) {
  const c = l.c; if (!c) return `${fmtQty(l.ing)} `;
  if (c.packs) return `${c.packs} ${unitLabel("st")} `;
  const g = c.grams || ingGrams(l.ing); return g ? `${n0(g)} ${unitLabel("g")} ` : "";
}
export const offerEnd = (ts?: number | null) => (ts ? t("until", { date: fmtDate(new Date(ts * 1000), { day: "numeric", month: "short" }) }) : "");

/* ---------- text exports ---------- */
function buyLines(lines: Line[], skipDone = false) {
  const by: Record<string, Line[]> = {}; let txt = "";
  lines.forEach((l) => { if (l.ing.pantry) return; if (skipDone && l.ing.done) return; const k = l.s || "x"; (by[k] = by[k] || []).push(l); });
  for (const s of Object.keys(by)) {
    const name = s === "x" ? t("missing_price") : STORES[s as keyof typeof STORES]; let sub = 0; txt += `\n${name.toUpperCase()}\n`;
    by[s].forEach((l) => {
      const c = l.c; const v = c ? c.buy : null; sub += v || 0;
      txt += `- ${lineQty(l)}${c?.label || l.ing.label}${v != null ? `: ${kr(v)}` : ""}${c?.offer ? ` (${offerNote(l.s, c)})` : ""}\n`;
    });
    if (s !== "x") txt += `  ${t("subtotal")} ${kr(sub)}\n`;
  }
  return txt;
}
export function recipeText(r: Recipe, mode: Mode) {
  const tot = totals(r.ings); const por = Math.max(1, +r.portions || 1); const res = modeResult(tot, mode);
  let txt = `${r.name}\n${t("ex_portions", { n: por })}\n\n${t("ex_per_portion", { kcal: n0(tot.mac[0] / por), p: n0(tot.mac[1] / por), k: n0(tot.mac[2] / por), f: n0(tot.mac[3] / por) })}\n`;
  txt += `${t("ex_to_buy", { sum: kr(res.sum), title: res.title, per: kr(res.used / por) })}\n\n${t("ex_ingredients")}\n`;
  r.ings.forEach((ing) => { txt += `- ${fmtQty(ing)} ${ing.label}${ing.pantry ? t("ex_have") : ""}\n`; });
  if (r.notes) txt += `\n${t("ex_how")}\n${r.notes}\n`;
  txt += `\n${t("ex_list", { title: res.title })}${buyLines(res.lines)}\n${t("ex_to_pay", { sum: kr(res.sum) })}\n\n${t("ex_footer", { date: lib().updated })}\n`;
  return txt;
}
export function listText(l: ShoppingList) {
  const res = modeResult(totals(l.items), l.mode || "cheap");
  const left = res.lines.filter((x) => !x.ing.done && !x.ing.pantry).reduce((a, x) => a + (x.c ? x.c.buy : 0), 0);
  return `${l.name}\n${res.title}\n${buyLines(res.lines, true)}\n${t("ex_to_pay", { sum: kr(left) })}\n\n${t("ex_footer", { date: lib().updated })}\n`;
}
export function downloadText(name: string, txt: string) {
  const file = (name || "kompispris").replace(/[\\/:*?"<>|]+/g, "").trim().slice(0, 80).replace(/[.\s]+$/, "") + ".txt";
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([txt], { type: "text/plain;charset=utf-8" })); a.download = file;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

/* ---------- lists ---------- */
export const UNIT_G: Record<string, number> = { g: 1, kg: 1000, ml: 1, dl: 100, l: 1000, msk: 15, tsk: 5, krm: 1 };
export function mergeRecipe(items: Ingredient[], r: Recipe, portions: number): Ingredient[] {
  const out = items.map((x) => ({ ...x }));
  const f = (+portions || +r.portions || 1) / Math.max(1, +r.portions || 1);
  const key = (x: Ingredient) => (x.q || x.label).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  for (const ing of r.ings) {
    if (ing.pantry) continue;
    const qty = (+ing.qty || 0) * f;
    const ex = out.find((x) => key(x) === key(ing) && !x.done && (x.unit === "st") === (ing.unit === "st"));
    if (ex) {
      ex.qty = ex.unit === ing.unit ? Math.round((+ex.qty + qty) * 100) / 100 : Math.round((+ex.qty + (qty * UNIT_G[ing.unit]) / UNIT_G[ex.unit]) * 100) / 100;
      ex.from = [...new Set([...(ex.from || []), r.name])];
    } else {
      const c: Ingredient = JSON.parse(JSON.stringify(ing)); c.id = uid(); c.qty = Math.round(qty * 100) / 100; c.done = false; c.from = [r.name]; delete c.macro;
      out.push(c);
    }
  }
  return out;
}

/* ---------- example recipe built from real products (ingredient names stay Swedish, they are product searches) ---------- */
export function exampleRecipe(): Recipe {
  const spec: [string, string, number, Unit, boolean?][] = [["Kycklingfilé", "kycklingfilé", 600, "g"], ["Jasminris", "jasminris", 300, "g"], ["Krossade tomater", "krossade tomater", 400, "g"], ["Gul lök", "gul lök", 1, "st"], ["Matlagningsgrädde", "matlagningsgrädde", 2.5, "dl"], ["Vitlök", "vitlök", 2, "st", true], ["Paprika", "paprika", 1, "st"], ["Ägg", "ägg", 2, "st"], ["Majonnäs", "majonnäs", 2, "tsk"]];
  const r: Recipe = { id: "example", name: t("example_prefix") + t("example_name"), portions: 4, notes: t("example_notes"), ings: [] };
  for (const [label, q, qty, unit, pantry] of spec) {
    const ing: Ingredient = { id: uid(), label, q, qty, unit, picks: {}, macro: null, pantry: !!pantry };
    if (groupFor(ing).length) r.ings.push(ing);
  }
  return r;
}
