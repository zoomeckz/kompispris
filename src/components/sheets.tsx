import { useMemo, useState } from "react";
import { Ingredient, OwnPrice, STORES, StoreCode, UNITS, Unit, buyFor, groupFor, ingCost, icaBuy, lidlBuy, lib, niceLabel, norm, offerGroup, offerNote, pcs, search, searchSlv, toks, activeStores, Recipe, ShoppingList } from "@/lib/engine";
import { cmpTxt, kr, num2, packTxt, uid } from "@/lib/format";
import { IcaRow, LidlRow } from "./rows";
import { MacroLine, RowButton, Sheet, StoreChip } from "./ui";
import { useApp } from "@/hooks/useApp";
import { t, tp, unitLabel } from "@/i18n";

const UNIT_KEYS = Object.keys(UNITS) as Unit[];
export const UnitOptions = () => <>{UNIT_KEYS.map((u) => <option key={u} value={u}>{unitLabel(u)}</option>)}</>;

/* ---------- add an ingredient / list item ---------- */
export function AddItemSheet({ onClose, onAdd }: { onClose: () => void; onAdd: (ing: Ingredient, locked: boolean) => void }) {
  const { logEvent } = useApp();
  const [q, setQ] = useState(""); const [qty, setQty] = useState(""); const [unit, setUnit] = useState<Unit>("g"); const [unitTouched, setUnitTouched] = useState(false);
  const term = q.trim();
  const grp = useMemo(() => (term ? groupFor({ q: term }) : []), [term]);
  const autoUnit: Unit = !unitTouched && grp.length && grp.filter((p) => pcs(p)).length > grp.length / 2 ? "st" : unitTouched ? unit : "g";
  const effUnit = unitTouched ? unit : autoUnit;
  const draft = (): Ingredient => ({ id: uid(), q: term, label: term, qty: +qty.replace(",", ".") || (effUnit === "st" ? 1 : 100), unit: effUnit, picks: {}, macro: null });
  const rows = useMemo(() => { const d = draft(); return grp.map((p) => ({ p, b: buyFor(d, p) })).filter((x) => x.b).sort((a, b) => a.b!.buy - b.b!.buy).slice(0, 40); }, [grp, qty, effUnit]);
  const add = (locked: boolean, pkey?: string) => {
    const d = draft();
    if (locked && pkey) { const p = lib().byKey.get(pkey)!; d.picks = { [p.s]: p.key }; d.label = p.n; }
    else d.label = niceLabel(term);
    logEvent("search", term); logEvent("add", d.label);
    onAdd(d, locked); onClose();
  };
  return (
    <Sheet title={t("add")} tall onClose={onClose} header={<>
      <input type="search" autoFocus placeholder={t("add_ph")} aria-label={t("product")} value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="row" style={{ flexWrap: "nowrap" }}>
        <input type="text" inputMode="decimal" placeholder={effUnit === "st" ? t("count_ph") : t("amount_ph")} aria-label={t("amount")} value={qty} onChange={(e) => setQty(e.target.value)} style={{ width: 90 }} />
        <select aria-label={t("unit")} value={effUnit} onChange={(e) => { setUnit(e.target.value as Unit); setUnitTouched(true); }} style={{ width: "auto" }}><UnitOptions /></select>
        <button className="btn primary grow" disabled={!grp.length} onClick={() => add(false)}>{grp.length ? t("add_cheapest_term", { term }) : term ? t("no_products_match") : t("add_cheapest")}</button>
      </div></>}>
      {!term && <div className="empty-state">{t("add_help")}</div>}
      {term && grp.length > 0 && <>
        <div className="small muted" style={{ marginTop: 10 }}>{tp("n_match", grp.length)}</div>
        <div className="list">{rows.map(({ p, b }) => (
          <RowButton key={p.key} onClick={() => add(true, p.key)}>
            <div className="grow"><div className="row" style={{ gap: 6 }}><StoreChip s={p.s} />{b!.offer && <span className="pill offer">{t("extra_price")}</span>}</div>
              <div className="t">{p.n}</div><div className="s">{[p.b, p.sz].filter(Boolean).join(" · ")}</div></div>
            <div className="right"><span className={`tag ${b!.offer ? "off" : ""}`}>{num2(b!.buy)}</span><span className="cmp">{packTxt(b!)} · {cmpTxt(p)}</span></div>
          </RowButton>))}</div></>}
      {term && !grp.length && <>
        <div className="empty-state">{t("no_starts", { term })}</div>
        <button className="btn small" onClick={() => { const d = draft(); d.q = null; d.label = term; onAdd(d, false); onClose(); }}>{t("add_own", { term })}</button></>}
    </Sheet>
  );
}

/* ---------- choose the product for one store ---------- */
export function PickSheet({ ing, s, onClose, onChange }: { ing: Ingredient; s: StoreCode; onClose: () => void; onChange: (ing: Ingredient) => void }) {
  const [q, setQ] = useState("");
  const done = (patch: Partial<Ingredient>) => { onChange({ ...ing, ...patch }); onClose(); };
  if (s === "o") return (
    <Sheet title={`${STORES.o}: ${ing.label}`} onClose={onClose}>
      <OwnPriceForm s="o" value={ing.oob} open onSave={(oob) => done({ oob })} />
    </Sheet>
  );
  if (s === "i" || s === "l") {
    const isI = s === "i"; const lockKey = isI ? "icaOffer" : "lidl";
    const list: any[] = isI ? lib().ica : lib().lidl;
    const auto = offerGroup(ing, isI ? "ica" : "lidl");
    const shown = q.trim() ? list.filter((o) => norm(q).split(" ").filter(Boolean).every((w) => o.nn.includes(w))).slice(0, 80)
      : [...auto].sort((a, b) => ((isI ? icaBuy(ing, a) : lidlBuy(ing, a))?.buy ?? 1e9) - ((isI ? icaBuy(ing, b) : lidlBuy(ing, b))?.buy ?? 1e9));
    const top = (o: any) => { const b = isI ? icaBuy(ing, o) : lidlBuy(ing, o); return b ? <div className="small" style={{ fontWeight: 600 }}>{t("costs_for_need", { amount: kr(b.buy) })}{(ing as any)[lockKey] === o.key ? " · " + t("locked_lc") : ""}</div> : null; };
    return (
      <Sheet title={`${STORES[s]}: ${ing.label}`} tall onClose={onClose} header={<input type="search" placeholder={t("search_offers_of", { store: STORES[s] })} value={q} onChange={(e) => setQ(e.target.value)} />}>
        {(ing as any)[lockKey] && <button className="btn small primary" style={{ marginTop: 10 }} onClick={() => done({ [lockKey]: null } as any)}>{t("auto_offer_again")}</button>}
        {isI && <OwnPriceForm s="i" value={ing.ica} onSave={(ica) => done({ ica })} />}
        <div className="small muted" style={{ marginTop: 10 }}>{q.trim() ? "" : auto.length ? tp("n_offers_match", auto.length) : t("no_offer_match")}</div>
        <div className="list">{shown.map((o) => isI ? <IcaRow key={o.key} x={o} top={top(o)} onClick={() => done({ icaOffer: o.key })} /> : <LidlRow key={o.key} x={o} top={top(o)} onClick={() => done({ lidl: o.key })} />)}</div>
      </Sheet>
    );
  }
  const locked = !!ing.picks?.[s];
  const pool = q.trim() ? search(q, { stores: [s], limit: 60 }) : groupFor(ing).filter((p) => p.s === s);
  const rows = pool.map((p) => ({ p, b: buyFor(ing, p) })).filter((x) => x.b).sort((a, b) => a.b!.buy - b.b!.buy).slice(0, 60);
  return (
    <Sheet title={`${STORES[s]}: ${ing.label}`} tall onClose={onClose} header={<input type="search" placeholder={t("search_other_in", { store: STORES[s] })} value={q} onChange={(e) => setQ(e.target.value)} />}>
      {locked && ing.q && <button className="btn small primary" style={{ marginTop: 10 }} onClick={() => { const p = { ...ing.picks }; delete p[s]; done({ picks: p }); }}>{t("auto_again")}</button>}
      <div className="small muted" style={{ marginTop: 10 }}>{rows.length ? t("pick_help") : t("no_hits_search")}</div>
      <div className="list">{rows.map(({ p, b }) => (
        <RowButton key={p.key} onClick={() => done({ picks: { ...(ing.picks || {}), [s]: p.key } })}>
          <div className="grow">{ing.picks?.[s] === p.key && <span className="pill">{t("locked")}</span>} {b!.offer && <span className="pill offer">{t("extra_price")}</span>}
            <div className="t">{p.n}</div><div className="s">{[p.b, p.sz].filter(Boolean).join(" · ")}</div>
            {b!.offer && <div className="small" style={{ color: "var(--offer)" }}>{offerNote(s, { ...b!, p })}</div>}</div>
          <div className="right"><span className={`tag ${b!.offer ? "off" : ""}`}>{num2(b!.buy)}</span><span className="cmp">{packTxt(b!)} · {cmpTxt(p)}</span></div>
        </RowButton>))}</div>
    </Sheet>
  );
}

/* a price typed in from the shelf: ICA (when an item isn't on offer) and ÖoB (no prices can be fetched at all) */
function OwnPriceForm({ s, value, open, onSave }: { s: "i" | "o"; value?: OwnPrice | null; open?: boolean; onSave: (v: OwnPrice | null) => void }) {
  const x = value || ({} as OwnPrice);
  const [price, setPrice] = useState(x.price ? String(x.price) : ""); const [grams, setGrams] = useState(x.grams ? String(x.grams) : "");
  const [pcsV, setPcs] = useState(x.pcs ? String(x.pcs) : ""); const [perKg, setPerKg] = useState(!!x.perKg);
  return (
    <details className="card" style={{ marginTop: 10 }} open={open || !!x.price}>
      <summary style={{ cursor: "pointer", fontWeight: 600 }}>{s === "i" ? t("own_price_title_ica") : t("own_price_title", { store: STORES[s] })}</summary>
      <div className="stack" style={{ marginTop: 10 }}>
        <p className="small muted" style={{ margin: 0 }}>{s === "i" ? t("own_price_note_ica") : t("own_price_note_oob")}</p>
        <label className="small">{t("price_per_pack")}<input type="text" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} /></label>
        <label className="small">{t("pack_weight")}<input type="text" inputMode="numeric" value={grams} onChange={(e) => setGrams(e.target.value)} /></label>
        <label className="small">{t("or_pcs")}<input type="text" inputMode="numeric" value={pcsV} onChange={(e) => setPcs(e.target.value)} /></label>
        <label className="toggle"><span>{t("per_kg")}</span><input type="checkbox" checked={perKg} onChange={(e) => setPerKg(e.target.checked)} /></label>
        <div className="row">
          <button className="btn primary" onClick={() => { const p = +price.replace(",", "."); onSave(p ? { price: p, grams: +grams || null, pcs: +pcsV || null, perKg } : null); }}>{t("save_own")}</button>
          {x.price ? <button className="btn danger" onClick={() => onSave(null)}>{t("remove_own")}</button> : null}
        </div>
      </div>
    </details>
  );
}

/* ---------- nutrition source ---------- */
export function MacroSheet({ ing, onClose, onChange }: { ing: Ingredient; onClose: () => void; onChange: (ing: Ingredient) => void }) {
  const [q, setQ] = useState(toks(ing.label).slice(0, 2).join(" "));
  const [c, setC] = useState<string[]>((ing.macro?.custom || ["", "", "", ""]).map(String));
  const res = searchSlv(q);
  const done = (macro: Ingredient["macro"]) => { onChange({ ...ing, macro }); onClose(); };
  const labels = [t("m_kcal"), t("m_p"), t("m_k"), t("m_f")];
  return (
    <Sheet title={t("nutrition")} tall onClose={onClose} header={<input type="search" value={q} onChange={(e) => setQ(e.target.value)} aria-label={t("search_slv_aria")} />}>
      <div className="card stack" style={{ marginTop: 12 }}>
        <h3>{t("own_per_100")}</h3>
        <div className="row">{labels.map((l, k) => <input key={k} type="text" inputMode="decimal" placeholder={l} aria-label={l} value={c[k]} style={{ width: 72 }} onChange={(e) => setC(c.map((v, i) => (i === k ? e.target.value : v)))} />)}
          <button className="btn small primary" onClick={() => done({ custom: c.map((v) => +String(v).replace(",", ".") || 0) })}>{t("save")}</button></div>
        {ing.macro && <button className="btn small" onClick={() => done(null)}>{t("use_product_values")}</button>}
      </div>
      <div className="small muted" style={{ marginTop: 12 }}>{t("slv_per_100")}</div>
      <div className="list">{res.map((x) => <RowButton key={x.i} onClick={() => done({ slv: x.i })}><div className="grow"><div className="t">{x.n}</div><MacroLine m={x.m} /></div></RowButton>)}</div>
    </Sheet>
  );
}

/* ---------- add a recipe to a list ---------- */
export function RecipeToListSheet({ fromList, recipe, onClose, onDone }: { fromList?: ShoppingList; recipe?: Recipe; onClose: () => void; onDone: (listId: string | "__new", recipe: Recipe, portions: number) => void }) {
  const { recipes, lists } = useApp();
  const recs = Object.values(recipes).sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
  const ls = Object.values(lists).sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
  const [rid, setRid] = useState(recipe?.id || recs[0]?.id || "");
  const [lid, setLid] = useState(ls[0]?.id || "__new");
  const r = recipe || recipes[rid];
  const [por, setPor] = useState(String(r?.portions || 4));
  return (
    <Sheet title={fromList ? t("add_recipe") : t("add_to_list")} onClose={onClose}>
      <div className="stack" style={{ paddingTop: 12 }}>
        {fromList ? <label className="small">{t("recipe")}<select value={rid} onChange={(e) => { setRid(e.target.value); setPor(String(recipes[e.target.value]?.portions || 4)); }}>{recs.map((x) => <option key={x.id} value={x.id}>{x.name} ({t("port_short", { n: x.portions })})</option>)}</select></label>
          : <label className="small">{t("list")}<select value={lid} onChange={(e) => setLid(e.target.value)}>{ls.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}<option value="__new">{t("new_list")}</option></select></label>}
        <label className="small">{t("n_portions_label")}<input type="text" inputMode="numeric" value={por} onChange={(e) => setPor(e.target.value)} /></label>
        <div className="small muted">{t("merge_note")}</div>
        <button className="btn primary" disabled={!r} onClick={() => { if (r) { onDone(fromList ? fromList.id : lid, r, +por || r.portions); onClose(); } }}>{t("add")}</button>
        {fromList && !recs.length && <div className="small muted">{t("no_saved_recipes")}</div>}
      </div>
    </Sheet>
  );
}

/* ---------- copy a recipe under a new name ---------- */
export function DuplicateSheet({ recipe, onClose, onDone }: { recipe: Recipe; onClose: () => void; onDone: (name: string) => Promise<void> }) {
  const [name, setName] = useState(recipe.name + t("dup_suffix"));
  const [busy, setBusy] = useState(false);
  return (
    <Sheet title={t("duplicate")} onClose={onClose}>
      <form className="stack" style={{ paddingTop: 12 }} onSubmit={async (e) => { e.preventDefault(); if (!name.trim() || busy) return; setBusy(true); await onDone(name.trim()); setBusy(false); }}>
        <label className="small">{t("dup_name")}<input type="text" autoFocus value={name} onChange={(e) => setName(e.target.value)} onFocus={(e) => e.target.select()} /></label>
        <button className="btn primary" disabled={busy || !name.trim()}>{busy ? t("wait") : t("dup_create")}</button>
      </form>
    </Sheet>
  );
}

/* ---------- edit a list item ---------- */
export function ItemSheet({ ing, onClose, onChange, onRemove, onPick }: { ing: Ingredient; onClose: () => void; onChange: (i: Ingredient) => void; onRemove: () => void; onPick: (s: StoreCode) => void }) {
  const [qty, setQty] = useState(String(ing.qty)); const [unit, setUnit] = useState<Unit>(ing.unit); const [q, setQ] = useState(ing.q || "");
  const stores = activeStores();
  return (
    <Sheet title={ing.label} onClose={onClose}>
      <div className="stack" style={{ paddingTop: 12 }}>
        <div className="row"><input type="text" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} style={{ width: 100 }} aria-label={t("amount")} />
          <select value={unit} onChange={(e) => setUnit(e.target.value as Unit)} style={{ width: "auto" }} aria-label={t("unit")}><UnitOptions /></select></div>
        {ing.q != null && <label className="small">{t("cheapest_of")}<input type="text" value={q} onChange={(e) => setQ(e.target.value)} /></label>}
        <button className="btn primary" onClick={() => { onChange({ ...ing, qty: +qty.replace(",", ".") || 0, unit, q: ing.q != null ? q.trim() : null }); onClose(); }}>{t("save")}</button>
        <h3 style={{ marginTop: 6 }}>{t("price_per_store")}</h3>
        <div className="list">{stores.map((s) => { const c = ingCost(ing, s); return (
          <RowButton key={s} onClick={() => { onClose(); onPick(s); }}>
            <div className="grow"><StoreChip s={s} /><div className="t">{c?.label || (s === "o" ? t("set_price") : t("no_price"))}</div>{c?.offer && <div className="small" style={{ color: "var(--offer)" }}>{offerNote(s, c)}</div>}</div>
            <div className="right">{c && <><b className="num">{kr(c.buy)}</b><span className="cmp">{packTxt(c)}{c.locked ? " · " + t("locked_lc") : ""}</span></>}<span className="cmp">{t("choose_product")}</span></div>
          </RowButton>); })}</div>
        <button className="btn danger" onClick={() => { onRemove(); onClose(); }}>{t("remove_from_list")}</button>
      </div>
    </Sheet>
  );
}
