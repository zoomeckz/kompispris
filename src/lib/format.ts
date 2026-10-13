import { Cost, Ingredient, Line, Product, STORES, Recipe, ShoppingList, ingGrams, modeResult, offerNote, totals, Mode, lib, groupFor, Unit } from "./engine";

export const kr = (v?: number | null) => (v == null || isNaN(v) ? "–" : v.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " kr");
export const kr0 = (v?: number | null) => (v == null || isNaN(v) ? "–" : v.toLocaleString("sv-SE", { maximumFractionDigits: 0 }) + " kr");
export const num2 = (v: number) => v.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const n0 = (v?: number) => Math.round(v || 0).toLocaleString("sv-SE");
export const n1 = (v?: number) => (Math.round((v || 0) * 10) / 10).toLocaleString("sv-SE");
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
export const pl = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
export const fmtQty = (ing: Ingredient) => `${(Math.round((+ing.qty || 0) * 100) / 100).toLocaleString("sv-SE")} ${ing.unit}`;
export function packTxt(c: Cost | null) {
  if (!c) return ""; if (c.pantry) return "hemma";
  if (!c.packs) return c.grams ? `${n0(c.grams)} g` : "lösvikt";
  return `${c.packs} förp`;
}
export const cmpTxt = (p: Product) => (p.cp ? `Jfr ${p.cp.toLocaleString("sv-SE", { minimumFractionDigits: 2 })} kr/${p.cu || "st"}` : "");
export function lineQty(l: Line) {
  const c = l.c; if (!c) return `${fmtQty(l.ing)} `;
  if (c.packs) return c.packs + " st ";
  const g = c.grams || ingGrams(l.ing); return g ? n0(g) + " g " : "";
}
export const offerEnd = (ts?: number | null) => (ts ? "t.o.m. " + new Date(ts * 1000).toLocaleDateString("sv-SE", { day: "numeric", month: "short" }) : "");

/* ---------- text exports ---------- */
function buyLines(lines: Line[], skipDone = false) {
  const by: Record<string, Line[]> = {}; let txt = "";
  lines.forEach((l) => { if (l.ing.pantry) return; if (skipDone && l.ing.done) return; const k = l.s || "x"; (by[k] = by[k] || []).push(l); });
  for (const s of Object.keys(by)) {
    const name = s === "x" ? "Saknar pris" : STORES[s as keyof typeof STORES]; let sub = 0; txt += `\n${name.toUpperCase()}\n`;
    by[s].forEach((l) => {
      const c = l.c; const v = c ? c.buy : null; sub += v || 0;
      txt += `- ${lineQty(l)}${c?.label || l.ing.label}${v != null ? `: ${kr(v)}` : ""}${c?.offer ? ` (${offerNote(l.s, c)})` : ""}\n`;
    });
    if (s !== "x") txt += `  Delsumma ${kr(sub)}\n`;
  }
  return txt;
}
export function recipeText(r: Recipe, mode: Mode) {
  const t = totals(r.ings); const por = Math.max(1, +r.portions || 1); const res = modeResult(t, mode);
  let txt = `${r.name}\n${por} portioner\n\nPer portion: ${n0(t.mac[0] / por)} kcal · protein ${n0(t.mac[1] / por)} g · kolhydrater ${n0(t.mac[2] / por)} g · fett ${n0(t.mac[3] / por)} g\n`;
  txt += `Att handla för: ${kr(res.sum)} (${res.title}) · per portion ${kr(res.used / por)}\n\nINGREDIENSER\n`;
  r.ings.forEach((ing) => { txt += `- ${fmtQty(ing)} ${ing.label}${ing.pantry ? " (har hemma)" : ""}\n`; });
  if (r.notes) txt += `\nGÖR SÅ HÄR\n${r.notes}\n`;
  txt += `\nINKÖPSLISTA (${res.title})${buyLines(res.lines)}\nAtt betala: ${kr(res.sum)}\n\nPriser från ${lib().updated}. Skapat med KompisPris.\n`;
  return txt;
}
export function listText(l: ShoppingList) {
  const t = totals(l.items); const res = modeResult(t, l.mode || "cheap");
  const left = res.lines.filter((x) => !x.ing.done && !x.ing.pantry).reduce((a, x) => a + (x.c ? x.c.buy : 0), 0);
  return `${l.name}\n${res.title}\n${buyLines(res.lines, true)}\nAtt betala: ${kr(left)}\n\nPriser från ${lib().updated}. Skapat med KompisPris.\n`;
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

/* ---------- example recipe built from real products ---------- */
export function exampleRecipe(): Recipe {
  const spec: [string, string, number, Unit, boolean?][] = [["Kycklingfilé", "kycklingfilé", 600, "g"], ["Jasminris", "jasminris", 300, "g"], ["Krossade tomater", "krossade tomater", 400, "g"], ["Gul lök", "gul lök", 1, "st"], ["Matlagningsgrädde", "matlagningsgrädde", 2.5, "dl"], ["Vitlök", "vitlök", 2, "st", true], ["Paprika", "paprika", 1, "st"], ["Ägg", "ägg", 2, "st"], ["Majonnäs", "majonnäs", 2, "tsk"]];
  const r: Recipe = { id: "example", name: "Exempel: Kycklinggryta med ris", portions: 4, notes: "Bryn kycklingen, fräs lök, vitlök och paprika. Häll i tomater och grädde och låt puttra 15 min. Servera med ris. Kokta ägg med en klick majonnäs vid sidan om.", ings: [] };
  for (const [label, q, qty, unit, pantry] of spec) {
    const ing: Ingredient = { id: uid(), label, q, qty, unit, picks: {}, macro: null, pantry: !!pantry };
    if (groupFor(ing).length) r.ings.push(ing);
  }
  return r;
}
