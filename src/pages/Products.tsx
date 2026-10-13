import { useEffect, useState } from "react";
import { useApp } from "@/hooks/useApp";
import { Product, lib, prodMacros, search } from "@/lib/engine";
import { Seg } from "@/components/ui";
import { ProductRow } from "@/components/rows";

const protPerKr = (p: Product) => { const m = prodMacros(p); if (!m || !p.cp || p.cu === "st") return -1; return (m[1] * 10) / p.cp; };
export default function Products() {
  const { logEvent } = useApp();
  const [q, setQ] = useState(""); const [cat, setCat] = useState(""); const [sort, setSort] = useState<"rel" | "cmp" | "prot">("rel");
  const [term, setTerm] = useState("");
  useEffect(() => { const t = setTimeout(() => { setTerm(q); if (q.trim().length >= 3) logEvent("search", q); }, 250); return () => clearTimeout(t); }, [q]);
  const res = term ? search(term, { cat: cat || null, limit: 80 }) : [];
  let list = res;
  if (sort === "cmp") list = [...res].sort((a, b) => (a.cp || 1e9) - (b.cp || 1e9));
  if (sort === "prot") list = [...res].sort((a, b) => protPerKr(b) - protPerKr(a));
  return (
    <div className="stack">
      <h2>Sök i sortimentet</h2>
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="t.ex. kvarg, laxfilé, havregryn" aria-label="Sök vara" />
      <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Kategori"><option value="">Alla kategorier</option>{Object.entries(lib().cats).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      <Seg label="Sortera" value={sort} onChange={setSort} options={[["rel", "Bäst träff"], ["cmp", "Lägst jämförpris"], ["prot", "Mest protein/kr"]]} />
      {!term ? <div className="card empty-state">Sök bland {lib().P.length.toLocaleString("sv-SE")} livsmedel från Willys, Hemköp och Coop. Samma vara visas i flera butiker så att du kan jämföra.</div>
        : <div className="card"><div className="small muted">{res.length === 80 ? "Visar de 80 bästa träffarna" : `${res.length} träffar`}</div>
          <div className="list">{list.map((p) => <ProductRow key={p.key} p={p} />)}{!list.length && <div className="empty-state">Inga träffar. Prova ett kortare ord.</div>}</div></div>}
    </div>
  );
}
