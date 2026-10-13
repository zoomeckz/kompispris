import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/hooks/useApp";
import { lib } from "@/lib/engine";
import { Kpis, Seg } from "@/components/ui";

interface Overview { users: number; active_7d: number; new_7d: number; recipes: number; lists: number; searches: number; searches_7d: number; }
interface UserRow { id: string; email: string; display_name: string; provider: string; created_at: string; last_seen: string; is_admin: boolean; recipes: number; lists: number; searches: number; }
interface Run { id: string; status: string; source: string; summary: string | null; created_at: string; started_at: string | null; finished_at: string | null; }

const fmtDate = (t?: string | null) => (t ? new Date(t).toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "2-digit" }) : "–");
const fmtTime = (t?: string | null) => (t ? new Date(t).toLocaleString("sv-SE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "–");
const STATUS: Record<string, string> = { queued: "I kö", running: "Pågår", done: "Klar", failed: "Misslyckades" };

function BarList({ rows }: { rows: { term: string; n: number }[] }) {
  if (!rows.length) return <div className="small muted">Inget ännu.</div>;
  const top = rows[0].n || 1;
  return <div className="bars">{rows.map((r) => <div className="bar-row" key={r.term} title={`${r.term}: ${r.n}`}><span className="bl">{r.term}</span><span className="bt"><i style={{ width: `${Math.max(2, (r.n / top) * 100)}%` }} /></span><span className="bv num">{r.n.toLocaleString("sv-SE")}</span></div>)}</div>;
}

export default function Admin() {
  const { isAdmin, user, authReady, toast } = useApp();
  const [days, setDays] = useState<"7" | "30" | "90">("30");
  const [ov, setOv] = useState<Overview | null>(null);
  const [signups, setSignups] = useState<{ day: string; n: number }[]>([]);
  const [terms, setTerms] = useState<{ term: string; n: number }[]>([]);
  const [adds, setAdds] = useState<{ term: string; n: number }[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const loadRuns = async () => { const { data } = await supabase!.from("scrape_runs").select("*").order("created_at", { ascending: false }).limit(8); setRuns((data as Run[]) || []); };
  useEffect(() => {
    if (!supabase || !isAdmin) return;
    (async () => {
      const d = +days;
      const [o, s, t, a, u] = await Promise.all([
        supabase.rpc("admin_overview"), supabase.rpc("admin_signups", { days: 30 }),
        supabase.rpc("admin_top_terms", { _kind: "search", days: d, lim: 20 }), supabase.rpc("admin_top_terms", { _kind: "add", days: d, lim: 15 }),
        supabase.rpc("admin_users"),
      ]);
      if (o.error) { setErr(o.error.message); return; }
      setOv(o.data as Overview); setSignups((s.data as any[]) || []); setTerms((t.data as any[]) || []); setAdds((a.data as any[]) || []); setUsers((u.data as UserRow[]) || []);
    })();
    loadRuns();
  }, [isAdmin, days]);
  // follow a running scrape
  const active = runs.some((r) => r.status === "queued" || r.status === "running");
  useEffect(() => { if (!active) return; const t = setInterval(loadRuns, 30000); return () => clearInterval(t); }, [active]);

  if (!authReady) return <div className="loading">Kontrollerar behörighet…</div>;
  if (!user || !isAdmin) return <div className="card empty-state">Den här sidan är bara för administratörer. <Link to="/">Till startsidan</Link></div>;

  const scrape = async () => {
    setBusy(true);
    const { data, error } = await supabase!.functions.invoke("trigger-scrape");
    setBusy(false);
    if (error) { let msg = "Kunde inte starta."; try { msg = (await (error as any).context.json()).error || msg; } catch { /* keep */ } toast(msg); }
    else { toast("Scrape startad. Det tar ungefär 30 till 45 minuter."); }
    loadRuns(); return data;
  };
  const byStore: Record<string, number> = {}; lib().P.forEach((p) => (byStore[p.s] = (byStore[p.s] || 0) + 1));
  const offers = lib().P.filter((p) => p.o).length;
  const max = Math.max(1, ...signups.map((s) => +s.n));

  return (
    <div className="stack">
      <div className="row between"><h2>Admin</h2><span className="small muted">Bara administratörer ser den här sidan</span></div>
      {err && <div className="err">Statistiken kunde inte laddas: {err}</div>}
      {ov && <Kpis items={[[ov.users, "användare"], [ov.active_7d, "aktiva 7d"], [ov.recipes, "recept"], [ov.searches.toLocaleString("sv-SE"), "sökningar"]]} />}
      {ov && <div className="small muted">{ov.new_7d} nya konton och {ov.searches_7d.toLocaleString("sv-SE")} sökningar senaste 7 dagarna · {ov.lists} matlistor</div>}

      <div className="card stack"><h3>Nya konton, senaste 30 dagarna</h3>
        <div className="cols" role="img" aria-label="Nya konton per dag">{signups.map((d) => <span key={d.day} title={`${d.day}: ${d.n}`}><i style={{ height: `${+d.n ? Math.max(6, (+d.n / max) * 100) : 0}%` }} /></span>)}</div>
        <div className="row between small muted"><span>{signups[0] ? new Date(signups[0].day).toLocaleDateString("sv-SE", { day: "numeric", month: "short" }) : ""}</span><span>Max {max} per dag</span><span>idag</span></div>
      </div>

      <Seg label="Period" value={days} onChange={setDays} options={[["7", "7 dagar"], ["30", "30 dagar"], ["90", "90 dagar"]]} />
      <div className="card stack"><h3>Mest sökta</h3><BarList rows={terms.map((r) => ({ term: r.term, n: +r.n }))} /></div>
      <div className="card stack"><h3>Mest tillagda varor</h3><BarList rows={adds.map((r) => ({ term: r.term, n: +r.n }))} /></div>

      <div className="card stack"><h3>Användare ({users.length})</h3>
        <div className="scrollx"><table className="cmpt">
          <thead><tr><th>Namn</th><th>Gick med</th><th>Senast aktiv</th><th>Recept</th><th>Listor</th><th>Sökningar</th></tr></thead>
          <tbody>{users.map((u) => <tr key={u.id}><td>{u.display_name || "–"}{u.is_admin && <span className="pill" style={{ marginLeft: 6 }}>admin</span>}<div className="small muted">{u.email} · {u.provider}</div></td>
            <td>{fmtDate(u.created_at)}</td><td>{fmtDate(u.last_seen)}</td><td>{u.recipes}</td><td>{u.lists}</td><td>{u.searches}</td></tr>)}
            {!users.length && <tr><td colSpan={6} className="muted">Inga användare ännu.</td></tr>}</tbody>
        </table></div>
      </div>

      <div className="card stack"><h3>Prisdata</h3>
        <div className="small num">Senast hämtad <b>{lib().updated}</b> · Willys {byStore.w || 0} · Hemköp {byStore.h || 0} · Coop {byStore.c || 0} · Lidl {lib().lidl.length} erbjudanden · ICA {lib().ica.length} erbjudanden · {offers} erbjudanden hos Willys, Hemköp och Coop</div>
        <div className="row"><button className="btn primary" disabled={busy || active} onClick={scrape}>{active ? "Scrape pågår" : busy ? "Startar…" : "Scrape"}</button></div>
        <div className="small muted">Hämtar alla priser, erbjudanden och näringsvärden på nytt via GitHub Actions och ersätter prisbiblioteket. Tar ungefär 30 till 45 minuter och kostar inga Claude-tokens. Körs också automatiskt måndag och torsdag morgon.</div>
        {runs.length > 0 && <div className="list">{runs.map((r) => <div className="item" key={r.id}><div className="grow"><div className="t">{STATUS[r.status] || r.status} · {r.source === "schedule" ? "schemalagd" : "manuell"}</div><div className="s">{r.summary || ""}</div></div><div className="right small muted">{fmtTime(r.created_at)}</div></div>)}</div>}
      </div>
    </div>
  );
}
