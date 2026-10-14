import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useApp } from "@/hooks/useApp";
import { Ingredient, Line, Mode, STORES, StoreCode, modeResult, offerNote, totals } from "@/lib/engine";
import { downloadText, fmtQty, kr, kr0, lineQty, listText, mergeRecipe } from "@/lib/format";
import { StoreChip, copyToClipboard } from "@/components/ui";
import { AddItemSheet, ItemSheet, PickSheet, RecipeToListSheet } from "@/components/sheets";
import { listModes } from "./Lists";
import { t, tp } from "@/i18n";

type Sheet = { kind: "add" } | { kind: "rec" } | { kind: "item"; i: number } | { kind: "pick"; i: number; s: StoreCode } | null;

export default function ListView() {
  const { id } = useParams(); const nav = useNavigate();
  const { lists, saveList, deleteList, toast, settings } = useApp();
  const l = lists[id || ""];
  const [sheet, setSheet] = useState<Sheet>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const tot = useMemo(() => (l ? totals(l.items) : null), [l, settings]);
  if (!l || !tot) return <div className="card empty-state">{t("page_not_found")} <Link to="/listor">{t("nav_lists")}</Link></div>;
  const mode = (l.mode || "cheap") as Mode;
  const res = modeResult(tot, mode);
  const update = (patch: Partial<typeof l>, now?: boolean) => saveList({ ...l, ...patch }, now);
  const setItem = (i: number, ing: Ingredient) => update({ items: l.items.map((x, k) => (k === i ? ing : x)) });
  const open = res.lines.filter((x) => !x.ing.done), done = res.lines.filter((x) => x.ing.done);
  const left = open.reduce((a, x) => a + (x.c ? x.c.buy : 0), 0);
  const by: Record<string, Line[]> = {}; open.forEach((x) => { const k = x.s || "x"; (by[k] = by[k] || []).push(x); });

  const row = (x: Line) => {
    const i = l.items.indexOf(x.ing); const c = x.c; const note = offerNote(x.s, c);
    return (
      <div key={x.ing.id} className={`item li ${x.ing.done ? "done" : ""}`}>
        <input type="checkbox" checked={!!x.ing.done} aria-label={t("check_off_aria", { name: x.ing.label })} onChange={(e) => setItem(i, { ...x.ing, done: e.target.checked })} />
        <div className="grow" role="button" tabIndex={0} style={{ cursor: "pointer" }} onClick={() => setSheet({ kind: "item", i })}>
          <div className="t">{fmtQty(x.ing)} {x.ing.label}</div>
          <div className="s">{c ? lineQty(x) + c.label : t("no_price_tap")}</div>
          {note && <div className="small" style={{ color: "var(--offer)" }}>{note}</div>}
          {x.ing.from?.length ? <div className="small muted">{t("from_recipes", { names: x.ing.from.join(", ") })}</div> : null}
        </div>
        <div className="right">{c && <span className="num" style={{ fontWeight: 600 }}>{kr(c.buy)}</span>}</div>
      </div>);
  };

  return (
    <div className="stack">
      <div className="row"><Link className="btn ghost" to="/listor">{t("back_lists")}</Link><span className="grow" />
        <button className="btn small danger" onClick={async () => { if (!confirmDel) return setConfirmDel(true); await deleteList(l.id); toast(t("list_deleted")); nav("/listor"); }}>{confirmDel ? t("tap_again_delete") : t("delete_list")}</button></div>
      <div className="card stack">
        <input type="text" value={l.name} onChange={(e) => update({ name: e.target.value })} placeholder={t("list_name_ph")} aria-label={t("list_name_ph")} style={{ fontFamily: "var(--display)", fontSize: 22, fontWeight: 600 }} />
        <label className="small muted">{t("prices_from_label")}
          <select value={mode} onChange={(e) => update({ mode: e.target.value as Mode })}>{listModes().filter(([k]) => k === "cheap" || k === "k" || settings.stores[k as StoreCode] !== false).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      </div>
      <div className="card stack">
        <div className="row between" style={{ alignItems: "flex-end" }}>
          <div><div className="small muted">{t("to_pay_with", { title: res.title })}</div><div className="big num">{kr0(res.sum)}</div></div>
          <div className="right small muted num">{t("left_to_buy")}<br /><b style={{ color: "var(--ink)", fontSize: 16 }}>{kr0(left)}</b><br />{tp("items", open.length)}</div>
        </div>
        {res.miss > 0 && <div className="small" style={{ color: "var(--warn)" }}>{t("missing_price_in", { items: tp("items", res.miss), where: mode === "cheap" || mode === "k" ? t("chosen_stores") : STORES[mode as StoreCode] })}</div>}
        <div className="small muted">{t("prices_note")} {settings.member ? t("member_on") : t("member_off")}</div>
        <div className="row"><button className="btn small primary" onClick={() => setSheet({ kind: "add" })}>{t("add_item")}</button><button className="btn small" onClick={() => setSheet({ kind: "rec" })}>{t("add_recipe")}</button></div>
      </div>
      {!l.items.length && <div className="card empty-state">{t("list_empty")}</div>}
      {Object.keys(by).map((s) => {
        const sub = by[s].reduce((a, x) => a + (x.c ? x.c.buy : 0), 0);
        return (<div className="card" key={s}><div className="row between">{s === "x" ? <h3>{t("missing_price")}</h3> : <StoreChip s={s as StoreCode} />}{s !== "x" && <span className="small muted num">{kr(sub)}</span>}</div><div className="list">{by[s].map(row)}</div></div>);
      })}
      {done.length > 0 && <div className="card"><div className="row between"><h3>{t("checked_count", { n: done.length })}</h3><button className="btn ghost small" onClick={() => update({ items: l.items.filter((x) => !x.done) })}>{t("remove_checked")}</button></div><div className="list">{done.map(row)}</div></div>}
      {l.items.length > 0 && <div className="row">
        <button className="btn small" onClick={async () => { (await copyToClipboard(listText(l))) ? toast(t("list_copied")) : toast(t("copy_failed")); }}>{t("copy_list")}</button>
        <button className="btn small" onClick={() => downloadText(l.name, listText(l))}>{t("download_text")}</button>
        {done.length > 0 && <button className="btn small" onClick={() => update({ items: l.items.map((x) => ({ ...x, done: false })) })}>{t("uncheck_all")}</button>}
      </div>}

      {sheet?.kind === "add" && <AddItemSheet onClose={() => setSheet(null)} onAdd={(ing) => update({ items: [...l.items, ing] }, true)} />}
      {sheet?.kind === "rec" && <RecipeToListSheet fromList={l} onClose={() => setSheet(null)} onDone={(_lid, rec, portions) => { update({ items: mergeRecipe(l.items, rec, portions) }, true); toast(t("recipe_added", { name: rec.name })); }} />}
      {sheet?.kind === "item" && <ItemSheet ing={l.items[sheet.i]} onClose={() => setSheet(null)} onChange={(n) => setItem(sheet.i, n)} onRemove={() => update({ items: l.items.filter((_, k) => k !== sheet.i) })} onPick={(s) => setSheet({ kind: "pick", i: sheet.i, s })} />}
      {sheet?.kind === "pick" && <PickSheet ing={l.items[sheet.i]} s={sheet.s} onClose={() => setSheet(null)} onChange={(n) => setItem(sheet.i, n)} />}
    </div>
  );
}
