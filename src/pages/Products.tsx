import { useEffect, useState } from "react";
import { useApp } from "@/hooks/useApp";
import { Product, lib, prodMacros, search } from "@/lib/engine";
import { Seg } from "@/components/ui";
import { ProductRow } from "@/components/rows";
import { t, tp } from "@/i18n";

const protPerKr = (p: Product) => { const m = prodMacros(p); if (!m || !p.cp || p.cu === "st") return -1; return (m[1] * 10) / p.cp; };
export default function Products() {
  const { logEvent } = useApp();
  const [q, setQ] = useState(""); const [cat, setCat] = useState(""); const [sort, setSort] = useState<"rel" | "cmp" | "prot">("rel");
  const [term, setTerm] = useState("");
  useEffect(() => { const tm = setTimeout(() => { setTerm(q); if (q.trim().length >= 3) logEvent("search", q); }, 250); return () => clearTimeout(tm); }, [q]);
  const res = term ? search(term, { cat: cat || null, limit: 80 }) : [];
  let list = res;
  if (sort === "cmp") list = [...res].sort((a, b) => (a.cp || 1e9) - (b.cp || 1e9));
  if (sort === "prot") list = [...res].sort((a, b) => protPerKr(b) - protPerKr(a));
  return (
    <div className="stack">
      <h2>{t("products_title")}</h2>
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("products_ph")} aria-label={t("search_product")} />
      <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label={t("category")}><option value="">{t("all_categories")}</option>{Object.entries(lib().cats).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      <Seg label={t("sort")} value={sort} onChange={setSort} options={[["rel", t("best_match")], ["cmp", t("lowest_cmp")], ["prot", t("most_protein")]]} />
      {!term ? <div className="card empty-state">{t("products_intro", { n: lib().P.length.toLocaleString("sv-SE") })}</div>
        : <div className="card"><div className="small muted">{res.length === 80 ? t("top_n_hits", { n: 80 }) : tp("n_hits", res.length)}</div>
          <div className="list">{list.map((p) => <ProductRow key={p.key} p={p} />)}{!list.length && <div className="empty-state">{t("no_hits")}</div>}</div></div>}
    </div>
  );
}
