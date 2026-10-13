import { Link, useNavigate } from "react-router-dom";
import { useApp } from "@/hooks/useApp";
import { modeResult, totals } from "@/lib/engine";
import { kr0, pl } from "@/lib/format";
import AccountCard from "@/components/AccountCard";

export const LIST_MODES: [string, string][] = [["cheap", "Billigast, alla butiker"], ["k", "Billigast i max 2 butiker"], ["w", "Bara Willys"], ["h", "Bara Hemköp"], ["c", "Bara Coop"], ["i", "Bara ICA"], ["l", "Bara Lidl"]];
export const newListName = () => "Matlista " + new Date().toLocaleDateString("sv-SE", { day: "numeric", month: "short" });

export default function Lists() {
  const { lists, user, createList } = useApp();
  const nav = useNavigate();
  const ls = Object.values(lists).sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
  return (
    <div className="stack">
      <div className="row between"><h2>Matlistor</h2>
        {user && <button className="btn primary" onClick={async () => { const l = await createList({ name: newListName(), mode: "cheap", items: [] }); if (l) nav(`/listor/${l.id}`); }}>Ny matlista</button>}</div>
      {!user && <><AccountCard what="skapa matlistor" /><div className="card small muted">I en matlista samlar du recept och egna varor. Appen räknar fram det billigaste från de butiker du väljer för varje lista, utifrån det senast hämtade prisbiblioteket.</div></>}
      {user && !ls.length && <div className="card empty-state">Inga matlistor än. Skapa en och lägg till varor eller hela recept. Varje lista väljer själv var priserna ska hämtas.</div>}
      {ls.map((l) => {
        const res = modeResult(totals(l.items), l.mode || "cheap"); const done = l.items.filter((i) => i.done).length;
        return (
          <Link key={l.id} to={`/listor/${l.id}`} className="card" style={{ display: "block", textDecoration: "none", color: "inherit" }}>
            <div className="row between" style={{ alignItems: "flex-start" }}>
              <div className="grow"><div style={{ fontWeight: 600, fontSize: 16 }}>{l.name || "Matlista"}</div>
                <div className="small muted">{pl(l.items.length, "vara", "varor")}{done ? ` · ${done} avbockade` : ""} · {LIST_MODES.find((m) => m[0] === (l.mode || "cheap"))?.[1]}</div></div>
              <div className="right"><span className="tag">{kr0(res.sum).replace(" kr", "")}<small> kr</small></span><span className="cmp">att betala</span></div>
            </div>
          </Link>);
      })}
    </div>
  );
}
