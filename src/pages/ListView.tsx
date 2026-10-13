import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useApp } from "@/hooks/useApp";
import { Ingredient, Line, Mode, STORES, StoreCode, modeResult, offerNote, totals } from "@/lib/engine";
import { downloadText, fmtQty, kr, kr0, lineQty, listText, mergeRecipe, pl } from "@/lib/format";
import { StoreChip, copyToClipboard } from "@/components/ui";
import { AddItemSheet, ItemSheet, PickSheet, RecipeToListSheet } from "@/components/sheets";
import { LIST_MODES } from "./Lists";

type Sheet = { kind: "add" } | { kind: "rec" } | { kind: "item"; i: number } | { kind: "pick"; i: number; s: StoreCode } | null;

export default function ListView() {
  const { id } = useParams(); const nav = useNavigate();
  const { lists, saveList, deleteList, toast, settings } = useApp();
  const l = lists[id || ""];
  const [sheet, setSheet] = useState<Sheet>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const t = useMemo(() => (l ? totals(l.items) : null), [l, settings]);
  if (!l || !t) return <div className="card empty-state">Listan finns inte. <Link to="/listor">Till matlistor</Link></div>;
  const mode = (l.mode || "cheap") as Mode;
  const res = modeResult(t, mode);
  const update = (patch: Partial<typeof l>, now?: boolean) => saveList({ ...l, ...patch }, now);
  const setItem = (i: number, ing: Ingredient) => update({ items: l.items.map((x, k) => (k === i ? ing : x)) });
  const open = res.lines.filter((x) => !x.ing.done), done = res.lines.filter((x) => x.ing.done);
  const left = open.reduce((a, x) => a + (x.c ? x.c.buy : 0), 0);
  const by: Record<string, Line[]> = {}; open.forEach((x) => { const k = x.s || "x"; (by[k] = by[k] || []).push(x); });

  const row = (x: Line) => {
    const i = l.items.indexOf(x.ing); const c = x.c; const note = offerNote(x.s, c);
    return (
      <div key={x.ing.id} className={`item li ${x.ing.done ? "done" : ""}`}>
        <input type="checkbox" checked={!!x.ing.done} aria-label={`Bocka av ${x.ing.label}`} onChange={(e) => setItem(i, { ...x.ing, done: e.target.checked })} />
        <div className="grow" role="button" tabIndex={0} style={{ cursor: "pointer" }} onClick={() => setSheet({ kind: "item", i })}>
          <div className="t">{fmtQty(x.ing)} {x.ing.label}</div>
          <div className="s">{c ? lineQty(x) + c.label : "Inget pris hittades. Tryck för att välja vara."}</div>
          {note && <div className="small" style={{ color: "var(--offer)" }}>{note}</div>}
          {x.ing.from?.length ? <div className="small muted">Från: {x.ing.from.join(", ")}</div> : null}
        </div>
        <div className="right">{c && <span className="num" style={{ fontWeight: 600 }}>{kr(c.buy)}</span>}</div>
      </div>);
  };

  return (
    <div className="stack">
      <div className="row"><Link className="btn ghost" to="/listor">← Matlistor</Link><span className="grow" />
        <button className="btn small danger" onClick={async () => { if (!confirmDel) return setConfirmDel(true); await deleteList(l.id); toast("Listan är borttagen"); nav("/listor"); }}>{confirmDel ? "Tryck igen för att ta bort" : "Ta bort lista"}</button></div>
      <div className="card stack">
        <input type="text" value={l.name} onChange={(e) => update({ name: e.target.value })} placeholder="Listans namn" aria-label="Listans namn" style={{ fontFamily: "var(--display)", fontSize: 22, fontWeight: 600 }} />
        <label className="small muted">Hämta priser från
          <select value={mode} onChange={(e) => update({ mode: e.target.value as Mode })}>{LIST_MODES.filter(([k]) => k === "cheap" || k === "k" || settings.stores[k as StoreCode] !== false).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      </div>
      <div className="card stack">
        <div className="row between" style={{ alignItems: "flex-end" }}>
          <div><div className="small muted">Att betala · {res.title}</div><div className="big num">{kr0(res.sum)}</div></div>
          <div className="right small muted num">Kvar att handla<br /><b style={{ color: "var(--ink)", fontSize: 16 }}>{kr0(left)}</b><br />{pl(open.length, "vara", "varor")}</div>
        </div>
        {res.miss > 0 && <div className="small" style={{ color: "var(--warn)" }}>{pl(res.miss, "vara", "varor")} saknar pris i {mode === "cheap" || mode === "k" ? "de valda butikerna" : STORES[mode as StoreCode]}.</div>}
        <div className="small muted">Priserna kommer från det senast hämtade prisbiblioteket. {settings.member ? "Medlemspriser räknas med." : 'Utan medlemskrav. Slå på "Jag är medlem" i inställningarna för att räkna med medlemspriser.'}</div>
        <div className="row"><button className="btn small primary" onClick={() => setSheet({ kind: "add" })}>Lägg till vara</button><button className="btn small" onClick={() => setSheet({ kind: "rec" })}>Lägg till recept</button></div>
      </div>
      {!l.items.length && <div className="card empty-state">Listan är tom. Lägg till varor, t.ex. "mjölk 1,5 l", eller ett helt recept.</div>}
      {Object.keys(by).map((s) => {
        const sub = by[s].reduce((a, x) => a + (x.c ? x.c.buy : 0), 0);
        return (<div className="card" key={s}><div className="row between">{s === "x" ? <h3>Saknar pris</h3> : <StoreChip s={s as StoreCode} />}{s !== "x" && <span className="small muted num">{kr(sub)}</span>}</div><div className="list">{by[s].map(row)}</div></div>);
      })}
      {done.length > 0 && <div className="card"><div className="row between"><h3>Avbockat ({done.length})</h3><button className="btn ghost small" onClick={() => update({ items: l.items.filter((x) => !x.done) })}>Ta bort avbockade</button></div><div className="list">{done.map(row)}</div></div>}
      {l.items.length > 0 && <div className="row">
        <button className="btn small" onClick={async () => { (await copyToClipboard(listText(l))) ? toast("Listan är kopierad") : toast("Kunde inte kopiera"); }}>Kopiera listan</button>
        <button className="btn small" onClick={() => downloadText(l.name, listText(l))}>Ladda ner som text</button>
        {done.length > 0 && <button className="btn small" onClick={() => update({ items: l.items.map((x) => ({ ...x, done: false })) })}>Bocka ur alla</button>}
      </div>}

      {sheet?.kind === "add" && <AddItemSheet onClose={() => setSheet(null)} onAdd={(ing) => update({ items: [...l.items, ing] }, true)} />}
      {sheet?.kind === "rec" && <RecipeToListSheet fromList={l} onClose={() => setSheet(null)} onDone={(_lid, rec, portions) => { update({ items: mergeRecipe(l.items, rec, portions) }, true); toast(`${rec.name} är tillagt`); }} />}
      {sheet?.kind === "item" && <ItemSheet ing={l.items[sheet.i]} onClose={() => setSheet(null)} onChange={(n) => setItem(sheet.i, n)} onRemove={() => update({ items: l.items.filter((_, k) => k !== sheet.i) })} onPick={(s) => setSheet({ kind: "pick", i: sheet.i, s })} />}
      {sheet?.kind === "pick" && <PickSheet ing={l.items[sheet.i]} s={sheet.s} onClose={() => setSheet(null)} onChange={(n) => setItem(sheet.i, n)} />}
    </div>
  );
}
