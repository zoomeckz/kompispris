import React from "react";
import { IcaOffer, LidlOffer, MEMBER_NAME, Product, STORES, cap, icaStoreShort, lib, offerWhere, prodMacros, settings, unitPrice } from "@/lib/engine";
import { cmpTxt, kr, num2, offerEnd } from "@/lib/format";
import { MacroLine, PriceTag, StoreChip } from "./ui";

export function ProductRow({ p, extra, onClick }: { p: Product; extra?: React.ReactNode; onClick?: () => void }) {
  const m = prodMacros(p); const others = (p.e && lib().byEan.get(p.e)) ? lib().byEan.get(p.e)!.filter((q) => q !== p) : [];
  const s = settings(); const active = p.o && s.offers && (!p.om || s.member);
  const body = (
    <>
      <div className="grow">
        <div className="row" style={{ gap: 6 }}>
          <StoreChip s={p.s} />
          {p.o ? <span className={`pill ${active ? "offer" : ""}`}>{p.ot || "Extrapris"}{p.om ? " · medlem" : ""}</span> : null}
        </div>
        {extra}
        <div className="t">{p.n}</div>
        <div className="s">{[p.b, p.sz].filter(Boolean).join(" · ")}</div>
        <MacroLine m={m} />
        {others.length > 0 && <div className="small muted">Samma vara: {others.map((q) => `${STORES[q.s]} ${kr(unitPrice(q))}`).join(" · ")}</div>}
      </div>
      <div className="right"><PriceTag p={p} /><span className="cmp">{cmpTxt(p)}</span></div>
    </>
  );
  return onClick ? <div className="item" role="button" tabIndex={0} style={{ cursor: "pointer" }} onClick={onClick} onKeyDown={(e) => e.key === "Enter" && onClick()}>{body}</div> : <div className="item">{body}</div>;
}

export function OfferRow({ p }: { p: Product }) {
  const pct = Math.round((1 - (p.o as number) / p.p) * 100);
  return (
    <div className="item">
      <div className="grow">
        <div className="row" style={{ gap: 6 }}><StoreChip s={p.s} />{p.om ? <span className="pill">Medlemspris</span> : null}{pct >= 1 && <span className="pill offer">-{pct} %</span>}</div>
        <div className="t">{p.n}</div>
        <div className="s">{[p.b, p.sz].filter(Boolean).join(" · ")}</div>
        <div className="small muted">{p.ot}{p.oe ? " · " + offerEnd(p.oe) : ""} · ord. {kr(p.p)}{p.pu === "kg" ? "/kg" : ""}</div>
        <div className="small" style={{ color: "var(--offer)" }}>{cap(offerWhere(p.s, { p }).long)}{p.om ? ", kräver " + MEMBER_NAME[p.s] : ""}</div>
      </div>
      <div className="right"><span className="tag off">{num2(p.o as number)}<small>{p.pu === "kg" ? " /kg" : ""}</small></span><span className="cmp">{cmpTxt(p)}</span></div>
    </div>
  );
}

export function IcaRow({ x, top, onClick }: { x: IcaOffer; top?: React.ReactNode; onClick?: () => void }) {
  const pct = x.reg ? Math.round((1 - x.unit / x.reg) * 100) : 0;
  const body = (
    <>
      <div className="grow">
        {top}
        <div className="row" style={{ gap: 6 }}><StoreChip s="i" /><span className="small muted">{icaStoreShort(x)}</span>{x.member && <span className="pill">ICA-kort</span>}{pct >= 1 && <span className="pill offer">-{pct} %</span>}</div>
        <div className="t">{x.n}</div>
        <div className="s">{[x.b, x.pack].filter(Boolean).join(" · ")}</div>
        <div className="small muted">{x.mech}{x.end ? " · " + offerEnd(x.end) : ""}{x.reg ? ` · ord. ${kr(x.reg)}` : ""}</div>
        <div className="small" style={{ color: "var(--offer)" }}>Gäller bara i {icaStoreShort(x)}{x.member ? ", kräver ICA-kort eller ICA-appen" : ""}</div>
      </div>
      <div className="right"><span className="tag off">{num2(x.unit)}<small>{x.kg ? " /kg" : ""}</small></span><span className="cmp">{x.cmp ? "Jfr " + x.cmp.replace(":", ",") : ""}</span></div>
    </>
  );
  return onClick ? <div className="item" role="button" tabIndex={0} style={{ cursor: "pointer" }} onClick={onClick}>{body}</div> : <div className="item">{body}</div>;
}

export function LidlRow({ x, top, onClick }: { x: LidlOffer; top?: React.ReactNode; onClick?: () => void }) {
  const pr = (x.p ?? x.plus) as number;
  const body = (
    <>
      <div className="grow">
        {top}
        <div className="row" style={{ gap: 6 }}><StoreChip s="l" />{x.plus != null && x.p != null ? <span className="pill">Lidl Plus {kr(x.plus)}</span> : x.plus != null ? <span className="pill">Lidl Plus-pris</span> : null}</div>
        <div className="t">{x.n}</div>
        <div className="s">{[x.pack, x.info].filter(Boolean).join(" · ")}</div>
        <div className="small muted">Gäller t.o.m. {x.end ? new Date(x.end * 1000).toLocaleDateString("sv-SE", { day: "numeric", month: "short" }) : "–"}{x.old ? ` · ord. ${kr(x.old)}` : ""}</div>
        <div className="small" style={{ color: "var(--offer)" }}>Gäller i alla Lidl-butiker i Stockholmsområdet{x.p == null ? ", kräver Lidl Plus" : ""}</div>
      </div>
      <div className="right"><span className="tag off">{num2(pr)}<small>{x.kgpriced ? " /kg" : ""}</small></span><span className="cmp">{x.cmp && x.cu ? `Jfr ${x.cmp.toLocaleString("sv-SE")} kr/${x.cu}` : ""}</span></div>
    </>
  );
  return onClick ? <div className="item" role="button" tabIndex={0} style={{ cursor: "pointer" }} onClick={onClick}>{body}</div> : <div className="item">{body}</div>;
}
