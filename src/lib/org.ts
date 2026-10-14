/* Recipe categories. Stored in the account's settings, so no database change is needed:
 *   cats  the categories in the order they are shown, each folded open or closed
 *   of    recipe id -> category id (recipes not in it, or in a removed category, are "uncategorized")
 *   order recipe ids in the order they are shown; recipes not in it yet (new ones) come first, newest first */
import type { Recipe, RecipeCat, RecipeOrg } from "./engine";

export const NONE = "_none";
export const orgOf = (o?: RecipeOrg): RecipeOrg => ({ cats: [], of: {}, order: [], noneOpen: true, ...o });

export interface Section { id: string; cat: RecipeCat | null; open: boolean; items: Recipe[] }
export function sections(recipes: Recipe[], o: RecipeOrg): Section[] {
  const known = new Set(o.cats.map((c) => c.id));
  const pos = new Map(o.order.map((id, i) => [id, i]));
  const sorted = [...recipes].sort((a, b) => {
    const pa = pos.get(a.id), pb = pos.get(b.id);
    if (pa == null && pb == null) return String(b.updated_at).localeCompare(String(a.updated_at));
    return pa == null ? -1 : pb == null ? 1 : pa - pb;
  });
  const by: Record<string, Recipe[]> = {};
  for (const r of sorted) { const c = known.has(o.of[r.id]) ? o.of[r.id] : NONE; (by[c] = by[c] || []).push(r); }
  return [...o.cats.map((c) => ({ id: c.id, cat: c, open: c.open, items: by[c.id] || [] })), { id: NONE, cat: null, open: o.noneOpen !== false, items: by[NONE] || [] }];
}

/** writes a finished drag back: sections in their new order, each with its recipe ids in order */
export function fromLayout(o: RecipeOrg, layout: { id: string; items: string[] }[]): RecipeOrg {
  const of: Record<string, string> = {}; const order: string[] = [];
  for (const s of layout) for (const id of s.items) { order.push(id); if (s.id !== NONE) of[id] = s.id; }
  const cats = layout.filter((s) => s.id !== NONE).map((s) => o.cats.find((c) => c.id === s.id)).filter((c): c is RecipeCat => !!c);
  return { ...o, cats, of, order };
}

export const addCat = (o: RecipeOrg, id: string, name: string): RecipeOrg => ({ ...o, cats: [...o.cats, { id, name, open: true }] });
export const renameCat = (o: RecipeOrg, id: string, name: string): RecipeOrg => ({ ...o, cats: o.cats.map((c) => (c.id === id ? { ...c, name } : c)) });
/** removing a category keeps its recipes; they become uncategorized */
export const removeCat = (o: RecipeOrg, id: string): RecipeOrg => ({ ...o, cats: o.cats.filter((c) => c.id !== id), of: Object.fromEntries(Object.entries(o.of).filter(([, c]) => c !== id)) });
export const toggle = (o: RecipeOrg, id: string): RecipeOrg => (id === NONE ? { ...o, noneOpen: o.noneOpen === false } : { ...o, cats: o.cats.map((c) => (c.id === id ? { ...c, open: !c.open } : c)) });
export function setCat(o: RecipeOrg, recipeId: string, catId: string): RecipeOrg {
  const of = { ...o.of }; if (catId === NONE) delete of[recipeId]; else of[recipeId] = catId;
  return { ...o, of };
}
