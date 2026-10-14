import { Link, useNavigate } from "react-router-dom";
import { useApp } from "@/hooks/useApp";
import { STORES, STORE_CODES, modeResult, totals } from "@/lib/engine";
import { kr0 } from "@/lib/format";
import AccountCard from "@/components/AccountCard";
import { fmtDate, t, tp } from "@/i18n";

export const listModes = (): [string, string][] => [["cheap", t("lm_cheap")], ["k", t("lm_k")], ...STORE_CODES.map((s) => [s, t("lm_only", { store: STORES[s] })] as [string, string])];
export const newListName = () => t("list_default_name", { date: fmtDate(new Date(), { day: "numeric", month: "short" }) });

export default function Lists() {
  const { lists, user, createList } = useApp();
  const nav = useNavigate();
  const ls = Object.values(lists).sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
  const modes = listModes();
  return (
    <div className="stack">
      <div className="row between"><h2>{t("nav_lists")}</h2>
        {user && <button className="btn primary" onClick={async () => { const l = await createList({ name: newListName(), mode: "cheap", items: [] }); if (l) nav(`/listor/${l.id}`); }}>{t("new_list")}</button>}</div>
      {!user && <><AccountCard what={t("acc_what_lists")} /><div className="card small muted">{t("lists_intro")}</div></>}
      {user && !ls.length && <div className="card empty-state">{t("no_lists")}</div>}
      {ls.map((l) => {
        const res = modeResult(totals(l.items), l.mode || "cheap"); const done = l.items.filter((i) => i.done).length;
        return (
          <Link key={l.id} to={`/listor/${l.id}`} className="card" style={{ display: "block", textDecoration: "none", color: "inherit" }}>
            <div className="row between" style={{ alignItems: "flex-start" }}>
              <div className="grow"><div style={{ fontWeight: 600, fontSize: 16 }}>{l.name || t("list")}</div>
                <div className="small muted">{tp("items", l.items.length)}{done ? ` · ${tp("n_checked", done)}` : ""} · {modes.find((m) => m[0] === (l.mode || "cheap"))?.[1]}</div></div>
              <div className="right"><span className="tag">{kr0(res.sum).replace(" kr", "")}<small> kr</small></span><span className="cmp">{t("to_pay")}</span></div>
            </div>
          </Link>);
      })}
    </div>
  );
}
