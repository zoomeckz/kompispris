import { useMemo, useState } from "react";
import { useApp } from "@/hooks/useApp";
import { STORES, lib, norm } from "@/lib/engine";
import { Seg } from "@/components/ui";
import { IcaRow, LidlRow, OfferRow } from "@/components/rows";
import { t, tp } from "@/i18n";

type Src = "all" | "w" | "h" | "c" | "i" | "l";
export default function Offers() {
  useApp();
  const L = lib();
  const [src, setSrc] = useState<Src>("all"); const [sort, setSort] = useState<"pct" | "price">("pct");
  const [q, setQ] = useState(""); const [noMember, setNoMember] = useState(true);
  const all = useMemo(() => [
    ...L.P.filter((p) => p.o).map((p) => ({ kind: "p" as const, x: p as any, s: p.s, pct: 1 - (p.o as number) / p.p, price: p.o as number, member: !!p.om })),
    ...L.lidl.map((x) => ({ kind: "l" as const, x: x as any, s: "l", pct: x.old ? 1 - ((x.p ?? x.plus) as number) / x.old : 0, price: (x.p ?? x.plus) as number, member: x.p == null })),
    ...L.ica.map((x) => ({ kind: "i" as const, x: x as any, s: "i", pct: x.reg ? 1 - x.unit / x.reg : 0, price: x.unit, member: x.member })),
  ], [L]);
  const counts: Record<string, number> = { all: 0 };
  all.forEach((it) => { if (noMember && it.member) return; counts.all++; counts[it.s] = (counts[it.s] || 0) + 1; });
  let items = all.filter((it) => (src === "all" || it.s === src) && !(noMember && it.member));
  const qt = norm(q).split(" ").filter(Boolean);
  if (qt.length) items = items.filter((it) => qt.every((w) => it.x.nn.includes(w)));
  items.sort(sort === "price" ? (a, b) => a.price - b.price : (a, b) => b.pct - a.pct);
  return (
    <div className="stack">
      <div className="row between"><h2>{t("offers_title")}</h2><span className="small muted">{counts.all}</span></div>
      <Seg label={t("store")} value={src} onChange={setSrc} options={(["all", "w", "h", "c", "i", "l"] as Src[]).map((k) => [k, <>{k === "all" ? t("all") : STORES[k]} <span className="muted">{counts[k] || 0}</span></>])} />
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("filter_offers_ph")} aria-label={t("filter_offers_aria")} />
      <div className="row">
        <div className="grow"><Seg label={t("sort")} value={sort} onChange={setSort} options={[["pct", t("biggest_discount")], ["price", t("lowest_price")]]} /></div>
        <label className="small row" style={{ gap: 6, flexDirection: "row" }}><input type="checkbox" checked={noMember} onChange={(e) => setNoMember(e.target.checked)} /> {t("no_member_req")}</label>
      </div>
      <div className="card">
        <div className="small muted">{tp("n_offers", items.length)}{items.length > 200 ? t("showing_first_n", { n: 200 }) : ""}. {t("ica_four_stores")}</div>
        <div className="list">{items.slice(0, 200).map((it) => it.kind === "l" ? <LidlRow key={it.x.key} x={it.x} /> : it.kind === "i" ? <IcaRow key={it.x.key} x={it.x} /> : <OfferRow key={it.x.key} p={it.x} />)}
          {!items.length && <div className="empty-state">{t("no_offers_match")}</div>}</div>
      </div>
    </div>
  );
}
