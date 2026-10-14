import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useApp } from "@/hooks/useApp";
import { Ingredient, Mode, Recipe, STORES, StoreCode, Totals, Unit, activeStores, groupFor, ingCost, ingGrams, ingMacros, lib, modeResult, offerNote, offerShort, totals } from "@/lib/engine";
import { downloadText, exampleRecipe, kr, kr0, lineQty, mergeRecipe, n0, packTxt, recipeText } from "@/lib/format";
import { Kpis, MacroLine, Seg, StoreChip, copyToClipboard } from "@/components/ui";
import { AddItemSheet, MacroSheet, PickSheet, RecipeToListSheet, UnitOptions } from "@/components/sheets";
import AccountCard from "@/components/AccountCard";
import SaveStatus from "@/components/SaveStatus";
import { newListName } from "./Lists";
import { t, tp, unitLabel } from "@/i18n";

type Sheet = { kind: "add" } | { kind: "pick"; i: number; s: StoreCode } | { kind: "macro"; i: number } | { kind: "tolist" } | null;

export function ModePicker({ mode, setMode }: { mode: Mode; setMode: (m: Mode) => void }) {
  const stores = activeStores();
  const top = mode === "cheap" || mode === "k" ? mode : "single";
  return (
    <>
      <Seg label={t("how_you_shop")} value={top} onChange={(v) => setMode(v === "single" ? stores[0] : (v as Mode))}
        options={[["cheap", t("mode_cheap")], ["k", t("mode_k")], ["single", t("mode_single")]]} />
      {top === "single" && <Seg label={t("store")} value={mode} onChange={setMode} options={stores.map((s) => [s, STORES[s]] as [Mode, string])} />}
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

  const tot = useMemo(() => (r ? totals(r.ings) : null), [r, app.settings]);
  if (!r || !tot) return <div className="card empty-state">{t("recipe_not_found")} <Link to="/">{t("to_your_recipes")}</Link></div>;
  const por = Math.max(1, +r.portions || 1);
  const res = modeResult(tot, mode);
  const stores = activeStores();
  const prefix = t("example_prefix");

  return (
    <div className="stack">
      <div className="row">
        <Link className="btn ghost" to="/">{t("back_recipes")}</Link><span className="grow" />
        {isEx ? (user && <button className="btn small primary" onClick={async () => { const n = await createRecipe({ name: r.name.startsWith(prefix) ? r.name.slice(prefix.length) : r.name, portions: r.portions, notes: r.notes, ings: r.ings }); if (n) { toast(t("saved_as_yours")); nav(`/recept/${n.id}`); } }}>{t("save_as_mine")}</button>)
          : <button className="btn small danger" onClick={async () => { if (!confirmDel) return setConfirmDel(true); await deleteRecipe(r.id); toast(t("recipe_deleted")); nav("/"); }}>{confirmDel ? t("tap_again_delete") : t("delete")}</button>}
      </div>
      {isEx && <div className="banner">{user ? t("example_banner_user") : t("example_banner_guest")}</div>}
      {isEx && !user && <AccountCard />}
      <div className="card stack">
        <input type="text" value={r.name} onChange={(e) => update({ name: e.target.value })} placeholder={t("recipe_name_ph")} aria-label={t("recipe_name_ph")} style={{ fontFamily: "var(--display)", fontSize: 22, fontWeight: 600 }} />
        <div className="row between">
          <div className="row"><label className="muted small" htmlFor="por" style={{ flexDirection: "row" }}>{t("portions_label")}</label>
            <input id="por" type="number" min={1} value={por} onChange={(e) => update({ portions: Math.max(1, +e.target.value || 1) })} style={{ width: 80 }} /></div>
          {!isEx && <SaveStatus k={"r" + r.id} onSave={() => saveRecipe(r, true)} />}
        </div>
      </div>

      <div className="card stack">
        <ModePicker mode={mode} setMode={setMode} />
        <div>
          <div className="small muted">{t("to_buy_title", { title: res.title })}</div>
          <div className="big num">{kr0(res.sum)}</div>
          <div className="small muted num">{t("cheapest_packs")}{app.settings.offers ? t("with_offers") : ""}.{res.miss ? <span style={{ color: "var(--warn)" }}> {t("missing_price_n", { n: res.miss })}</span> : null}</div>
          {r.ings.length > 0 && r.ings.every((i) => i.pantry) && <div className="banner" style={{ marginTop: 8 }}>{t("all_pantry")}</div>}
        </div>
        <div className="row between num" style={{ borderTop: "1px dashed var(--line)", paddingTop: 10 }}>
          <div><div className="small muted">{t("per_portion_n", { n: por })}</div><div style={{ fontFamily: "var(--display)", fontSize: 24, fontWeight: 700 }}>{kr(res.used / por)}</div></div>
          <div className="right small muted">{t("used_amount", { amount: kr0(res.used) })}{res.sum - res.used > 0.5 && <><br />{t("leftover", { amount: kr0(res.sum - res.used) })}</>}</div>
        </div>
        <Kpis items={[[n0(tot.mac[0] / por), t("m_kcal")], [<>{n0(tot.mac[1] / por)}<small>{unitLabel("g")}</small></>, t("kpi_protein")], [<>{n0(tot.mac[2] / por)}<small>{unitLabel("g")}</small></>, t("kpi_carbs")], [<>{n0(tot.mac[3] / por)}<small>{unitLabel("g")}</small></>, t("kpi_fat")]]} />
        <div className="small muted num">{t("macros_summary", { kcal: n0(tot.mac[0]), p: n0(tot.mac[1]), k: n0(tot.mac[2]), f: n0(tot.mac[3]) })}{tot.macMissing ? " · " + tp("ing_no_macro", tot.macMissing) : ""}</div>
        <div className="row small">{stores.map((s) => ({ s, ...tot.per[s] })).sort((a, b) => a.missing - b.missing || a.sum - b.sum).map((x, i) => <span key={x.s} className={`pill ${i === 0 && !x.missing ? "okp" : ""}`}>{STORES[x.s]} {x.missing ? t("n_missing", { n: x.missing }) : kr0(x.sum)}</span>)}</div>
      </div>

      <div className="card">
        <div className="row between"><h3>{t("ingredients")}</h3><button className="btn small primary" onClick={() => setSheet({ kind: "add" })}>{t("add")}</button></div>
        {r.ings.length ? r.ings.map((ing, i) => (
          <IngredientBlock key={ing.id} ing={ing} stores={stores}
            onChange={(n) => setIng(i, n)} onRemove={() => update({ ings: r.ings.filter((_, k) => k !== i) })}
            onPick={(s) => setSheet({ kind: "pick", i, s })} onMacro={() => setSheet({ kind: "macro", i })} />
        )) : <div className="empty-state">{t("first_ingredient")}</div>}
      </div>

      {r.ings.length > 0 && <div className="row">
        <button className="btn small" onClick={async () => { (await copyToClipboard(recipeText(r, mode))) ? toast(t("recipe_copied")) : toast(t("copy_failed")); }}>{t("copy_recipe")}</button>
        <button className="btn small" onClick={() => downloadText(r.name, recipeText(r, mode))}>{t("download_text")}</button>
        {!isEx && user && <button className="btn small primary" onClick={() => setSheet({ kind: "tolist" })}>{t("add_to_list")}</button>}
      </div>}
      {r.ings.length > 0 && <Receipt r={r} res={res} />}
      {r.ings.length > 0 && <CompareTable r={r} tot={tot} stores={stores} />}
      <div className="card stack"><h3>{t("how_to")}</h3><textarea value={r.notes || ""} onChange={(e) => update({ notes: e.target.value })} placeholder={t("notes_ph")} /></div>

      {sheet?.kind === "add" && <AddItemSheet onClose={() => setSheet(null)} onAdd={(ing) => { update({ ings: [...r.ings, ing] }); toast(t("added_toast")); }} />}
      {sheet?.kind === "pick" && <PickSheet ing={r.ings[sheet.i]} s={sheet.s} onClose={() => setSheet(null)} onChange={(n) => setIng(sheet.i, n)} />}
      {sheet?.kind === "macro" && <MacroSheet ing={r.ings[sheet.i]} onClose={() => setSheet(null)} onChange={(n) => setIng(sheet.i, n)} />}
      {sheet?.kind === "tolist" && <RecipeToListSheet recipe={r} onClose={() => setSheet(null)} onDone={async (lid, rec, portions) => {
        const l = lid === "__new" ? await createList({ name: newListName(), mode: "cheap", items: [] }) : lists[lid];
        if (!l) return; const n = { ...l, items: mergeRecipe(l.items, rec, portions) }; saveList(n, true); toast(t("added_to_list", { recipe: rec.name, list: l.name })); nav(`/listor/${l.id}`);
      }} />}
    </div>
  );
}

function IngredientBlock({ ing, stores, onChange, onRemove, onPick, onMacro }: { ing: Ingredient; stores: StoreCode[]; onChange: (i: Ingredient) => void; onRemove: () => void; onPick: (s: StoreCode) => void; onMacro: () => void }) {
  const g = ingGrams(ing); const m = ingMacros(ing);
  const costs = stores.map((s) => ({ s, c: ingCost(ing, s) })); const vals = costs.map((x) => x.c?.buy).filter((v): v is number => v != null);
  const min = vals.length ? Math.min(...vals) : null;
  const needG = ing.unit === "st" && g == null;
  const empty = (s: StoreCode) => (s === "i" ? t("no_offer_set_price") : s === "l" ? t("no_offer") : s === "o" ? t("set_price") : t("no_match"));
  return (
    <div className="ing">
      <div className="row between"><div className="grow" style={{ fontWeight: 600 }}>{ing.label}</div><button className="btn ghost small" onClick={onRemove} aria-label={t("remove_aria", { name: ing.label })}>{t("delete")}</button></div>
      <div className="qty">
        <input type="number" value={ing.qty} min={0} step="any" aria-label={t("amount")} onChange={(e) => onChange({ ...ing, qty: +e.target.value || 0 })} />
        <select aria-label={t("unit")} value={ing.unit} onChange={(e) => onChange({ ...ing, unit: e.target.value as Unit })}><UnitOptions /></select>
        <span className="small muted num gr">{g != null && ing.unit !== "g" ? `≈ ${n0(g)} ${unitLabel("g")}` : ""}</span>
        <label className="small row" style={{ marginInlineStart: "auto", gap: 4, flexDirection: "row" }}><input type="checkbox" checked={!!ing.pantry} onChange={(e) => onChange({ ...ing, pantry: e.target.checked })} /> {t("pantry")}</label>
      </div>
      {ing.q != null && <div className="row small"><span className="muted">{t("cheapest_of")}</span>
        <input type="text" defaultValue={ing.q} onBlur={(e) => e.target.value.trim() !== ing.q && onChange({ ...ing, q: e.target.value.trim() })} style={{ flex: 1, minWidth: 120, minHeight: 34, padding: "5px 9px" }} aria-label={t("search_word")} />
        <span className="muted">{tp("items", groupFor(ing).length)}</span></div>}
      {(needG || ing.gPerSt) && <div className="row small"><span className="muted">{t("grams_per_piece")}</span><input type="number" value={ing.gPerSt || ""} onChange={(e) => onChange({ ...ing, gPerSt: +e.target.value || null })} style={{ width: 90 }} aria-label={t("grams_per_piece")} /></div>}
      {m ? <MacroLine m={m} label={t("in_recipe")} /> : <div className="row small"><span className="muted">{t("nutrition_missing_short")}</span><button className="btn ghost small" onClick={onMacro}>{t("choose_slv")}</button></div>}
      {m && !ing.macro?.custom && <div className="small muted">{ing.macro?.slv != null ? t("nutr_slv", { name: lib().slv[ing.macro.slv]?.n }) : t("nutr_product")} · <button className="btn ghost small" onClick={onMacro}>{t("change")}</button></div>}
      {!ing.pantry && <div className="slots">{costs.map(({ s, c }) => {
        const v = c?.buy;
        return (
          <button key={s} className={`slot ${v == null ? "empty" : ""} ${v != null && v === min && vals.length > 1 ? "best" : ""}`} onClick={() => onPick(s)}>
            <span className="row between"><StoreChip s={s} /><span>{c?.locked && <span className="pill">{t("locked")}</span>}{c?.offer && <span className="pill offer">{t("extra_price")}</span>}</span></span>
            <span className="nm" title={c?.label || ""}>{c?.label || empty(s)}</span>
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
      <div style={{ textAlign: "center", fontWeight: 600, letterSpacing: ".1em" }}>{t("receipt_title")}</div>
      <div style={{ textAlign: "center" }} className="small">{r.name} · {res.title}</div><hr />
      {Object.keys(by).map((s) => {
        const sub = by[s].reduce((a, l) => a + (l.c ? l.c.buy : 0), 0);
        return (<div key={s}>
          <div className="st">{s === "x" ? t("missing_price_caps") : STORES[s as StoreCode].toUpperCase()}</div>
          {by[s].map((l) => (<div className="ln" key={l.ing.id}><span>{lineQty(l)}{l.c?.label || l.ing.label}{l.c?.offer && <><br /><span className="small" style={{ color: "var(--offer)" }}>{offerNote(l.s, l.c)}</span></>}</span><span>{l.c ? kr(l.c.buy).replace(" kr", "") : ""}</span></div>))}
          {s !== "x" && <div className="ln small"><span>{t("subtotal")}</span><span>{kr(sub).replace(" kr", "")}</span></div>}
        </div>);
      })}
      {pantry.length > 0 && <><div className="st">{t("at_home_caps")}</div>{pantry.map((i) => <div className="ln" key={i.id}><span>{i.label}</span><span /></div>)}</>}
      <hr /><div className="ln tot"><span>{t("to_pay_caps")}</span><span>{kr(res.sum)}</span></div>
      <div className="ln small"><span>{t("per_portion_used", { n: por })}</span><span>{kr(res.used / por)}</span></div>
    </div>
  );
}

function CompareTable({ r, tot, stores }: { r: Recipe; tot: Totals; stores: StoreCode[] }) {
  const cols = stores.filter((s) => ["w", "h", "c"].includes(s) || r.ings.some((ing) => !ing.pantry && ingCost(ing, s)));
  return (
    <div className="card stack"><h3>{t("compare_title")}</h3>
      <div className="scrollx"><table className="cmpt">
        <thead><tr><th>{t("ingredient")}</th>{cols.map((s) => <th key={s}>{STORES[s]}</th>)}</tr></thead>
        <tbody>{r.ings.map((ing) => {
          if (ing.pantry) return <tr key={ing.id}><td>{ing.label}</td>{cols.map((s) => <td key={s} className="na">{t("at_home")}</td>)}</tr>;
          const vs = cols.map((s) => ingCost(ing, s)?.buy ?? null); const ok = vs.filter((v): v is number => v != null); const mn = ok.length ? Math.min(...ok) : null;
          return <tr key={ing.id}><td>{ing.label}</td>{vs.map((v, k) => v == null ? <td key={k} className="na">–</td> : <td key={k} className={v === mn && ok.length > 1 ? "best" : ""}>{kr(v).replace(" kr", "")}</td>)}</tr>;
        })}</tbody>
        <tfoot><tr><td><b>{t("total")}</b></td>{cols.map((s) => <td key={s}><b>{tot.per[s].missing ? <span className="small muted">{t("n_missing", { n: tot.per[s].missing })}</span> : kr0(tot.per[s].sum)}</b></td>)}</tr></tfoot>
      </table></div>
      <div className="small muted">{t("compare_note")}</div>
    </div>
  );
}
