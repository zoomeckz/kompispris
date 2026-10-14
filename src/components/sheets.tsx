import React, { useMemo, useState } from "react";
import { Ingredient, STORES, StoreCode, UNITS, Unit, buyFor, groupFor, ingCost, icaBuy, lidlBuy, lib, niceLabel, norm, offerGroup, offerNote, pcs, search, searchSlv, toks, activeStores, Recipe, ShoppingList } from "@/lib/engine";
import { cmpTxt, kr, num2, packTxt, uid } from "@/lib/format";
import { IcaRow, LidlRow, ProductRow } from "./rows";
import { MacroLine, RowButton, Sheet, StoreChip } from "./ui";
import { useApp } from "@/hooks/useApp";

const UNIT_KEYS = Object.keys(UNITS) as Unit[];

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
    <Sheet title="Lägg till" tall onClose={onClose} header={<>
      <input type="search" autoFocus placeholder="Skriv t.ex. ägg, majonnäs, kycklingfilé" aria-label="Vara" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="row" style={{ flexWrap: "nowrap" }}>
        <input type="text" inputMode="decimal" placeholder={effUnit === "st" ? "antal" : "mängd"} aria-label="Mängd" value={qty} onChange={(e) => setQty(e.target.value)} style={{ width: 90 }} />
        <select aria-label="Enhet" value={effUnit} onChange={(e) => { setUnit(e.target.value as Unit); setUnitTouched(true); }} style={{ width: "auto" }}>{UNIT_KEYS.map((u) => <option key={u}>{u}</option>)}</select>
        <button className="btn primary grow" disabled={!grp.length} onClick={() => add(false)}>{grp.length ? `Lägg till billigaste "${term}"` : term ? "Inga varor matchar" : "Lägg till billigaste"}</button>
      </div></>}>
      {!term && <div className="empty-state">Skriv vad du behöver och hur mycket. Appen väljer den billigaste förpackningen som räcker, i varje butik. Vill du ha en viss vara kan du trycka på den nedan för att låsa den.</div>}
      {term && grp.length > 0 && <>
        <div className="small muted" style={{ marginTop: 10 }}>{grp.length} varor matchar. Billigast att köpa först. Tryck på en vara för att låsa just den.</div>
        <div className="list">{rows.map(({ p, b }) => (
          <RowButton key={p.key} onClick={() => add(true, p.key)}>
            <div className="grow"><div className="row" style={{ gap: 6 }}><StoreChip s={p.s} />{b!.offer && <span className="pill offer">Extrapris</span>}</div>
              <div className="t">{p.n}</div><div className="s">{[p.b, p.sz].filter(Boolean).join(" · ")}</div></div>
            <div className="right"><span className={`tag ${b!.offer ? "off" : ""}`}>{num2(b!.buy)}</span><span className="cmp">{packTxt(b!)} · {cmpTxt(p)}</span></div>
          </RowButton>))}</div></>}
      {term && !grp.length && <>
        <div className="empty-state">Inga varor börjar med "{term}". Prova ett annat ord, eller lägg till det som egen vara.</div>
        <button className="btn small" onClick={() => { const d = draft(); d.q = null; d.label = term; onAdd(d, false); onClose(); }}>Lägg till "{term}" som egen</button></>}
    </Sheet>
  );
}

/* ---------- choose the product for one store ---------- */
export function PickSheet({ ing, s, onClose, onChange }: { ing: Ingredient; s: StoreCode; onClose: () => void; onChange: (ing: Ingredient) => void }) {
  const [q, setQ] = useState("");
  const done = (patch: Partial<Ingredient>) => { onChange({ ...ing, ...patch }); onClose(); };
  if (s === "i" || s === "l") {
    const isI = s === "i"; const lockKey = isI ? "icaOffer" : "lidl";
    const list: any[] = isI ? lib().ica : lib().lidl;
    const auto = offerGroup(ing, isI ? "ica" : "lidl");
    const shown = q.trim() ? list.filter((o) => norm(q).split(" ").filter(Boolean).every((t) => o.nn.includes(t))).slice(0, 80)
      : [...auto].sort((a, b) => ((isI ? icaBuy(ing, a) : lidlBuy(ing, a))?.buy ?? 1e9) - ((isI ? icaBuy(ing, b) : lidlBuy(ing, b))?.buy ?? 1e9));
    const top = (o: any) => { const b = isI ? icaBuy(ing, o) : lidlBuy(ing, o); return b ? <div className="small" style={{ fontWeight: 600 }}>Kostar {kr(b.buy)} för det du behöver{(ing as any)[lockKey] === o.key ? " · låst" : ""}</div> : null; };
    return (
      <Sheet title={`${STORES[s]}: ${ing.label}`} tall onClose={onClose} header={<input type="search" placeholder={`Sök bland ${STORES[s]}s erbjudanden`} value={q} onChange={(e) => setQ(e.target.value)} />}>
        {(ing as any)[lockKey] && <button className="btn small primary" style={{ marginTop: 10 }} onClick={() => done({ [lockKey]: null } as any)}>Välj billigaste erbjudandet automatiskt igen</button>}
        {isI && <IcaOwnPrice ing={ing} onSave={(ica) => done({ ica })} />}
        <div className="small muted" style={{ marginTop: 10 }}>{q.trim() ? "" : auto.length ? `${auto.length} erbjudanden matchar, billigast först.` : "Inget erbjudande matchar just nu. Sök ovan."}</div>
        <div className="list">{shown.map((o) => isI ? <IcaRow key={o.key} x={o} top={top(o)} onClick={() => done({ icaOffer: o.key })} /> : <LidlRow key={o.key} x={o} top={top(o)} onClick={() => done({ lidl: o.key })} />)}</div>
      </Sheet>
    );
  }
  const locked = !!ing.picks?.[s];
  const pool = q.trim() ? search(q, { stores: [s], limit: 60 }) : groupFor(ing).filter((p) => p.s === s);
  const rows = pool.map((p) => ({ p, b: buyFor(ing, p) })).filter((x) => x.b).sort((a, b) => a.b!.buy - b.b!.buy).slice(0, 60);
  return (
    <Sheet title={`${STORES[s]}: ${ing.label}`} tall onClose={onClose} header={<input type="search" placeholder={`Sök annan vara i ${STORES[s]}`} value={q} onChange={(e) => setQ(e.target.value)} />}>
      {locked && ing.q && <button className="btn small primary" style={{ marginTop: 10 }} onClick={() => { const p = { ...ing.picks }; delete p[s]; done({ picks: p }); }}>Välj billigaste automatiskt igen</button>}
      <div className="small muted" style={{ marginTop: 10 }}>{rows.length ? "Billigast att köpa för mängden först. Tryck för att låsa en vara." : "Inga träffar. Sök ovan."}</div>
      <div className="list">{rows.map(({ p, b }) => (
        <RowButton key={p.key} onClick={() => done({ picks: { ...(ing.picks || {}), [s]: p.key } })}>
          <div className="grow">{ing.picks?.[s] === p.key && <span className="pill">Låst</span>} {b!.offer && <span className="pill offer">Extrapris</span>}
            <div className="t">{p.n}</div><div className="s">{[p.b, p.sz].filter(Boolean).join(" · ")}</div>
            {b!.offer && <div className="small" style={{ color: "var(--offer)" }}>{offerNote(s, { ...b!, p })}</div>}</div>
          <div className="right"><span className={`tag ${b!.offer ? "off" : ""}`}>{num2(b!.buy)}</span><span className="cmp">{packTxt(b!)} · {cmpTxt(p)}</span></div>
        </RowButton>))}</div>
    </Sheet>
  );
}
function IcaOwnPrice({ ing, onSave }: { ing: Ingredient; onSave: (v: Ingredient["ica"]) => void }) {
  const x = ing.ica || ({} as NonNullable<Ingredient["ica"]>);
  const [price, setPrice] = useState(x.price ? String(x.price) : ""); const [grams, setGrams] = useState(x.grams ? String(x.grams) : "");
  const [pcsV, setPcs] = useState(x.pcs ? String(x.pcs) : ""); const [perKg, setPerKg] = useState(!!x.perKg);
  return (
    <details className="card" style={{ marginTop: 10 }} open={!!x.price}>
      <summary style={{ cursor: "pointer", fontWeight: 600 }}>Eget ICA-pris (ersätter erbjudandena)</summary>
      <div className="stack" style={{ marginTop: 10 }}>
        <p className="small muted" style={{ margin: 0 }}>ICA:s vanliga hyllpriser går inte att hämta, bara veckans erbjudanden. Skriv in priset från hyllkanten eller ICA-appen om varan inte är på erbjudande.</p>
        <label className="small">Pris per förpackning (kr)<input type="text" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} /></label>
        <label className="small">Förpackningens vikt i gram<input type="text" inputMode="numeric" value={grams} onChange={(e) => setGrams(e.target.value)} /></label>
        <label className="small">eller antal st i förpackningen (t.ex. 6 ägg)<input type="text" inputMode="numeric" value={pcsV} onChange={(e) => setPcs(e.target.value)} /></label>
        <label className="toggle"><span>Priset gäller per kg (lösvikt)</span><input type="checkbox" checked={perKg} onChange={(e) => setPerKg(e.target.checked)} /></label>
        <div className="row">
          <button className="btn primary" onClick={() => { const p = +price.replace(",", "."); onSave(p ? { price: p, grams: +grams || null, pcs: +pcsV || null, perKg } : null); }}>Spara eget pris</button>
          {x.price ? <button className="btn danger" onClick={() => onSave(null)}>Ta bort eget pris</button> : null}
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
  return (
    <Sheet title="Näringsvärde" tall onClose={onClose} header={<input type="search" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Sök i Livsmedelsverkets databas" />}>
      <div className="card stack" style={{ marginTop: 12 }}>
        <h3>Eget värde per 100 g</h3>
        <div className="row">{["kcal", "P", "K", "F"].map((l, k) => <input key={l} type="text" inputMode="decimal" placeholder={l} aria-label={l} value={c[k]} style={{ width: 72 }} onChange={(e) => setC(c.map((v, i) => (i === k ? e.target.value : v)))} />)}
          <button className="btn small primary" onClick={() => done({ custom: c.map((v) => +String(v).replace(",", ".") || 0) })}>Spara</button></div>
        {ing.macro && <button className="btn small" onClick={() => done(null)}>Använd varans egna värden</button>}
      </div>
      <div className="small muted" style={{ marginTop: 12 }}>Livsmedelsverket, per 100 g</div>
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
    <Sheet title={fromList ? "Lägg till recept" : "Lägg i matlista"} onClose={onClose}>
      <div className="stack" style={{ paddingTop: 12 }}>
        {fromList ? <label className="small">Recept<select value={rid} onChange={(e) => { setRid(e.target.value); setPor(String(recipes[e.target.value]?.portions || 4)); }}>{recs.map((x) => <option key={x.id} value={x.id}>{x.name} ({x.portions} port.)</option>)}</select></label>
          : <label className="small">Matlista<select value={lid} onChange={(e) => setLid(e.target.value)}>{ls.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}<option value="__new">Ny matlista</option></select></label>}
        <label className="small">Antal portioner<input type="text" inputMode="numeric" value={por} onChange={(e) => setPor(e.target.value)} /></label>
        <div className="small muted">Ingredienserna räknas om till antalet portioner. Samma vara som redan finns i listan slås ihop. "Har hemma" hoppas över.</div>
        <button className="btn primary" disabled={!r} onClick={() => { if (r) { onDone(fromList ? fromList.id : lid, r, +por || r.portions); onClose(); } }}>Lägg till</button>
        {fromList && !recs.length && <div className="small muted">Du har inga sparade recept än.</div>}
      </div>
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
        <div className="row"><input type="text" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} style={{ width: 100 }} aria-label="Mängd" />
          <select value={unit} onChange={(e) => setUnit(e.target.value as Unit)} style={{ width: "auto" }} aria-label="Enhet">{UNIT_KEYS.map((u) => <option key={u}>{u}</option>)}</select></div>
        {ing.q != null && <label className="small">Billigaste av<input type="text" value={q} onChange={(e) => setQ(e.target.value)} /></label>}
        <button className="btn primary" onClick={() => { onChange({ ...ing, qty: +qty.replace(",", ".") || 0, unit, q: ing.q != null ? q.trim() : null }); onClose(); }}>Spara</button>
        <h3 style={{ marginTop: 6 }}>Pris per butik</h3>
        <div className="list">{stores.map((s) => { const c = ingCost(ing, s); return (
          <RowButton key={s} onClick={() => { onClose(); onPick(s); }}>
            <div className="grow"><StoreChip s={s} /><div className="t">{c?.label || "Inget pris"}</div>{c?.offer && <div className="small" style={{ color: "var(--offer)" }}>{offerNote(s, c)}</div>}</div>
            <div className="right">{c && <><b className="num">{kr(c.buy)}</b><span className="cmp">{packTxt(c)}{c.locked ? " · låst" : ""}</span></>}<span className="cmp">Välj vara ›</span></div>
          </RowButton>); })}</div>
        <button className="btn danger" onClick={() => { onRemove(); onClose(); }}>Ta bort från listan</button>
      </div>
    </Sheet>
  );
}
