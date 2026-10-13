import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useApp } from "@/hooks/useApp";
import { Ingredient, Mode, Recipe, STORES, StoreCode, Totals, UNITS, Unit, activeStores, groupFor, ingCost, ingGrams, ingMacros, lib, modeResult, offerNote, offerShort, totals } from "@/lib/engine";
import { downloadText, exampleRecipe, kr, kr0, lineQty, mergeRecipe, n0, packTxt, recipeText } from "@/lib/format";
import { Kpis, MacroLine, Seg, StoreChip, copyToClipboard } from "@/components/ui";
import { AddItemSheet, MacroSheet, PickSheet, RecipeToListSheet } from "@/components/sheets";
import AccountCard from "@/components/AccountCard";

const UNIT_KEYS = Object.keys(UNITS) as Unit[];
type Sheet = { kind: "add" } | { kind: "pick"; i: number; s: StoreCode } | { kind: "macro"; i: number } | { kind: "tolist" } | null;

export function ModePicker({ mode, setMode }: { mode: Mode; setMode: (m: Mode) => void }) {
  const stores = activeStores();
  const top = mode === "cheap" || mode === "k" ? mode : "single";
  return (
    <>
      <Seg label="Hur du handlar" value={top} onChange={(v) => setMode(v === "single" ? stores[0] : (v as Mode))}
        options={[["cheap", "Billigast mix"], ["k", "Max 2 butiker"], ["single", "En butik"]]} />
      {top === "single" && <Seg label="Butik" value={mode} onChange={setMode} options={stores.map((s) => [s, STORES[s]] as [Mode, string])} />}
    </>
  );
}

export default function RecipeEditor() {
  const { id } = useParams();
  const nav = useNavigate();
  const app = useApp();
  const { recipes, saveRecipe, deleteRecipe, createRecipe, createList, saveList, lists, user, toast } = app;
  const [example, setExample] = useState<Recipe | null>(() => (id === "exempel" ? exampleRecipe() : null));
  const r: Recipe | null = id === "exempel" ? example : recipes[id || ""] || null;
  const [mode, setMode] = useState<Mode>("cheap");
  const [sheet, setSheet] = useState<Sheet>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const isEx = id === "exempel";

  const update = (patch: Partial<Recipe>) => {
    if (!r) return; const n = { ...r, ...patch };
    if (isEx) setExample(n); else saveRecipe(n);
  };
  const setIng = (i: number, ing: Ingredient) => update({ ings: r!.ings.map((x, k) => (k === i ? ing : x)) });

  const t = useMemo(() => (r ? totals(r.ings) : null), [r, app.settings]);
  if (!r || !t) return <div className="card empty-state">Receptet finns inte. <Link to="/">Till dina recept</Link></div>;
  const por = Math.max(1, +r.portions || 1);
  const res = modeResult(t, mode);
  const stores = activeStores();

  return (
    <div className="stack">
      <div className="row">
        <Link className="btn ghost" to="/">← Recept</Link><span className="grow" />
        {isEx ? (user && <button className="btn small primary" onClick={async () => { const n = await createRecipe({ name: r.name.replace(/^Exempel: /, ""), portions: r.portions, notes: r.notes, ings: r.ings }); if (n) { toast("Sparat som ditt recept"); nav(`/recept/${n.id}`); } }}>Spara som mitt recept</button>)
          : <button className="btn small danger" onClick={async () => { if (!confirmDel) return setConfirmDel(true); await deleteRecipe(r.id); toast("Receptet är borttaget"); nav("/"); }}>{confirmDel ? "Tryck igen för att ta bort" : "Ta bort"}</button>}
      </div>
      {isEx && <div className="banner">Det här är ett exempel byggt på riktiga varor. {user ? "Ändringar sparas först när du sparar det som ditt recept." : "Skapa ett konto för att spara egna recept."}</div>}
      {isEx && !user && <AccountCard />}
      <div className="card stack">
        <input type="text" value={r.name} onChange={(e) => update({ name: e.target.value })} placeholder="Receptets namn" aria-label="Receptets namn" style={{ fontFamily: "var(--display)", fontSize: 22, fontWeight: 600 }} />
        <div className="row"><label className="muted small" htmlFor="por" style={{ flexDirection: "row" }}>Portioner</label>
          <input id="por" type="number" min={1} value={por} onChange={(e) => update({ portions: Math.max(1, +e.target.value || 1) })} style={{ width: 80 }} /></div>
      </div>

      <div className="card stack">
        <ModePicker mode={mode} setMode={setMode} />
        <div>
          <div className="small muted">Att handla för · {res.title}</div>
          <div className="big num">{kr0(res.sum)}</div>
          <div className="small muted num">Billigaste förpackningarna som räcker till receptet{app.settings.offers ? ", med erbjudanden" : ""}.{res.miss ? <span style={{ color: "var(--warn)" }}> {res.miss} saknar pris.</span> : null}</div>
        </div>
        <div className="row between num" style={{ borderTop: "1px dashed var(--line)", paddingTop: 10 }}>
          <div><div className="small muted">Per portion ({por})</div><div style={{ fontFamily: "var(--display)", fontSize: 24, fontWeight: 700 }}>{kr(res.used / por)}</div></div>
          <div className="right small muted">Det som går åt: {kr0(res.used)}{res.sum - res.used > 0.5 && <><br />Blir över: {kr0(res.sum - res.used)}</>}</div>
        </div>
        <Kpis items={[[n0(t.mac[0] / por), "kcal"], [<>{n0(t.mac[1] / por)}<small>g</small></>, "protein"], [<>{n0(t.mac[2] / por)}<small>g</small></>, "kolh."], [<>{n0(t.mac[3] / por)}<small>g</small></>, "fett"]]} />
        <div className="small muted num">Makron per portion. Hela receptet: {n0(t.mac[0])} kcal · P {n0(t.mac[1])} g · K {n0(t.mac[2])} g · F {n0(t.mac[3])} g{t.macMissing ? ` · ${t.macMissing} ingrediens(er) utan näringsvärde` : ""}</div>
        <div className="row small">{stores.map((s) => ({ s, ...t.per[s] })).sort((a, b) => a.missing - b.missing || a.sum - b.sum).map((x, i) => <span key={x.s} className={`pill ${i === 0 && !x.missing ? "okp" : ""}`}>{STORES[x.s]} {x.missing ? `${x.missing} saknas` : kr0(x.sum)}</span>)}</div>
      </div>

      <div className="card">
        <div className="row between"><h3>Ingredienser</h3><button className="btn small primary" onClick={() => setSheet({ kind: "add" })}>Lägg till</button></div>
        {r.ings.length ? r.ings.map((ing, i) => (
          <IngredientBlock key={ing.id} ing={ing} stores={stores}
            onChange={(n) => setIng(i, n)} onRemove={() => update({ ings: r.ings.filter((_, k) => k !== i) })}
            onPick={(s) => setSheet({ kind: "pick", i, s })} onMacro={() => setSheet({ kind: "macro", i })} />
        )) : <div className="empty-state">Lägg till din första ingrediens. Skriv t.ex. "ägg" eller "majonnäs", så väljs den billigaste förpackningen som räcker.</div>}
      </div>

      {r.ings.length > 0 && <div className="row">
        <button className="btn small" onClick={async () => { (await copyToClipboard(recipeText(r, mode))) ? toast("Receptet är kopierat") : toast("Kunde inte kopiera"); }}>Kopiera recept</button>
        <button className="btn small" onClick={() => downloadText(r.name, recipeText(r, mode))}>Ladda ner som text</button>
        {!isEx && user && <button className="btn small primary" onClick={() => setSheet({ kind: "tolist" })}>Lägg i matlista</button>}
      </div>}
      {r.ings.length > 0 && <Receipt r={r} res={res} />}
      {r.ings.length > 0 && <CompareTable r={r} t={t} stores={stores} />}
      <div className="card stack"><h3>Gör så här</h3><textarea value={r.notes || ""} onChange={(e) => update({ notes: e.target.value })} placeholder="Instruktioner, tider, tips…" /></div>

      {sheet?.kind === "add" && <AddItemSheet onClose={() => setSheet(null)} onAdd={(ing) => { update({ ings: [...r.ings, ing] }); toast("Tillagd. Billigaste förpackningen väljs i varje butik."); }} />}
      {sheet?.kind === "pick" && <PickSheet ing={r.ings[sheet.i]} s={sheet.s} onClose={() => setSheet(null)} onChange={(n) => setIng(sheet.i, n)} />}
      {sheet?.kind === "macro" && <MacroSheet ing={r.ings[sheet.i]} onClose={() => setSheet(null)} onChange={(n) => setIng(sheet.i, n)} />}
      {sheet?.kind === "tolist" && <RecipeToListSheet recipe={r} onClose={() => setSheet(null)} onDone={async (lid, rec, portions) => {
        let l = lid === "__new" ? await createList({ name: "Matlista " + new Date().toLocaleDateString("sv-SE", { day: "numeric", month: "short" }), mode: "cheap", items: [] }) : lists[lid];
        if (!l) return; const n = { ...l, items: mergeRecipe(l.items, rec, portions) }; saveList(n, true); toast(`${rec.name} är tillagt i ${l.name}`); nav(`/listor/${l.id}`);
      }} />}
    </div>
  );
}

function IngredientBlock({ ing, stores, onChange, onRemove, onPick, onMacro }: { ing: Ingredient; stores: StoreCode[]; onChange: (i: Ingredient) => void; onRemove: () => void; onPick: (s: StoreCode) => void; onMacro: () => void }) {
  const g = ingGrams(ing); const m = ingMacros(ing);
  const costs = stores.map((s) => ({ s, c: ingCost(ing, s) })); const vals = costs.map((x) => x.c?.buy).filter((v): v is number => v != null);
  const min = vals.length ? Math.min(...vals) : null;
  const needG = ing.unit === "st" && g == null;
  return (
    <div className="ing">
      <div className="row between"><div className="grow" style={{ fontWeight: 600 }}>{ing.label}</div><button className="btn ghost small" onClick={onRemove} aria-label={`Ta bort ${ing.label}`}>Ta bort</button></div>
      <div className="qty">
        <input type="number" value={ing.qty} min={0} step="any" aria-label="Mängd" onChange={(e) => onChange({ ...ing, qty: +e.target.value || 0 })} />
        <select aria-label="Enhet" value={ing.unit} onChange={(e) => onChange({ ...ing, unit: e.target.value as Unit })}>{UNIT_KEYS.map((u) => <option key={u}>{u}</option>)}</select>
        <span className="small muted num gr">{g != null && ing.unit !== "g" ? `≈ ${n0(g)} g` : ""}</span>
        <label className="small row" style={{ marginLeft: "auto", gap: 4, flexDirection: "row" }}><input type="checkbox" checked={!!ing.pantry} onChange={(e) => onChange({ ...ing, pantry: e.target.checked })} /> Har hemma</label>
      </div>
      {ing.q != null && <div className="row small"><span className="muted">Billigaste av</span>
        <input type="text" defaultValue={ing.q} onBlur={(e) => e.target.value.trim() !== ing.q && onChange({ ...ing, q: e.target.value.trim() })} style={{ flex: 1, minWidth: 120, minHeight: 34, padding: "5px 9px" }} aria-label="Sökord" />
        <span className="muted">{groupFor(ing).length} varor</span></div>}
      {(needG || ing.gPerSt) && <div className="row small"><span className="muted">Gram per st</span><input type="number" value={ing.gPerSt || ""} onChange={(e) => onChange({ ...ing, gPerSt: +e.target.value || null })} style={{ width: 90 }} aria-label="Gram per st" /></div>}
      {m ? <MacroLine m={m} label="i receptet" /> : <div className="row small"><span className="muted">Näringsvärde saknas.</span><button className="btn ghost small" onClick={onMacro}>Välj från Livsmedelsverket</button></div>}
      {m && !ing.macro?.custom && <div className="small muted">{ing.macro?.slv != null ? "Näring: Livsmedelsverket, " + lib().slv[ing.macro.slv]?.n : "Näring från billigaste varan"} · <button className="btn ghost small" onClick={onMacro}>Ändra</button></div>}
      {!ing.pantry && <div className="slots">{costs.map(({ s, c }) => {
        const v = c?.buy;
        return (
          <button key={s} className={`slot ${v == null ? "empty" : ""} ${v != null && v === min && vals.length > 1 ? "best" : ""}`} onClick={() => onPick(s)}>
            <span className="row between"><StoreChip s={s} /><span>{c?.locked && <span className="pill">Låst</span>}{c?.offer && <span className="pill offer">Extrapris</span>}</span></span>
            <span className="nm" title={c?.label || ""}>{c?.label || (s === "i" ? "Inget erbjudande · ange pris" : s === "l" ? "Inget erbjudande" : "Ingen träff")}</span>
            <span className="pr">{v != null ? `${packTxt(c)} · ${kr(v)}` : "–"}{c?.guess ? " *" : ""}</span>
            {c?.offer && <span className="sc" title={offerNote(s, c)}>{offerShort(s, c)}</span>}
          </button>);
      })}</div>}
    </div>
  );
}

function Receipt({ r, res }: { r: Recipe; res: ReturnType<typeof modeResult> }) {
  const by: Record<string, typeof res.lines> = {};
  res.lines.forEach((l) => { if (l.ing.pantry) return; const k = l.s || "x"; (by[k] = by[k] || []).push(l); });
  const pantry = r.ings.filter((i) => i.pantry); const por = Math.max(1, +r.portions || 1);
  return (
    <div className="receipt">
      <div style={{ textAlign: "center", fontWeight: 600, letterSpacing: ".1em" }}>INKÖPSLISTA</div>
      <div style={{ textAlign: "center" }} className="small">{r.name} · {res.title}</div><hr />
      {Object.keys(by).map((s) => {
        const sub = by[s].reduce((a, l) => a + (l.c ? l.c.buy : 0), 0);
        return (<div key={s}>
          <div className="st">{s === "x" ? "SAKNAR PRIS" : STORES[s as StoreCode].toUpperCase()}</div>
          {by[s].map((l) => (<div className="ln" key={l.ing.id}><span>{lineQty(l)}{l.c?.label || l.ing.label}{l.c?.offer && <><br /><span className="small" style={{ color: "var(--offer)" }}>{offerNote(l.s, l.c)}</span></>}</span><span>{l.c ? kr(l.c.buy).replace(" kr", "") : ""}</span></div>))}
          {s !== "x" && <div className="ln small"><span>Delsumma</span><span>{kr(sub).replace(" kr", "")}</span></div>}
        </div>);
      })}
      {pantry.length > 0 && <><div className="st">HAR HEMMA</div>{pantry.map((i) => <div className="ln" key={i.id}><span>{i.label}</span><span /></div>)}</>}
      <hr /><div className="ln tot"><span>ATT BETALA</span><span>{kr(res.sum)}</span></div>
      <div className="ln small"><span>Per portion ({por}), det som går åt</span><span>{kr(res.used / por)}</span></div>
    </div>
  );
}

function CompareTable({ r, t, stores }: { r: Recipe; t: Totals; stores: StoreCode[] }) {
  const cols = stores.filter((s) => ["w", "h", "c"].includes(s) || r.ings.some((ing) => !ing.pantry && ingCost(ing, s)));
  return (
    <div className="card stack"><h3>Att handla för, per butik</h3>
      <div className="scrollx"><table className="cmpt">
        <thead><tr><th>Ingrediens</th>{cols.map((s) => <th key={s}>{STORES[s]}</th>)}</tr></thead>
        <tbody>{r.ings.map((ing) => {
          if (ing.pantry) return <tr key={ing.id}><td>{ing.label}</td>{cols.map((s) => <td key={s} className="na">hemma</td>)}</tr>;
          const vs = cols.map((s) => ingCost(ing, s)?.buy ?? null); const ok = vs.filter((v): v is number => v != null); const mn = ok.length ? Math.min(...ok) : null;
          return <tr key={ing.id}><td>{ing.label}</td>{vs.map((v, k) => v == null ? <td key={k} className="na">–</td> : <td key={k} className={v === mn && ok.length > 1 ? "best" : ""}>{kr(v).replace(" kr", "")}</td>)}</tr>;
        })}</tbody>
        <tfoot><tr><td><b>Totalt</b></td>{cols.map((s) => <td key={s}><b>{t.per[s].missing ? <span className="small muted">{t.per[s].missing} saknas</span> : kr0(t.per[s].sum)}</b></td>)}</tr></tfoot>
      </table></div>
      <div className="small muted">Hela förpackningar. Gult = billigast. * = förpackningens storlek är okänd, priset gäller en förpackning.</div>
    </div>
  );
}
