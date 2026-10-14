import React from "react";
import { IcaOffer, LidlOffer, Product, STORES, cap, icaStoreShort, lib, memberName, offerWhere, prodMacros, settings, unitPrice } from "@/lib/engine";
import { cmpTxt, kr, num2, offerEnd } from "@/lib/format";
import { MacroLine, PriceTag, StoreChip } from "./ui";
import { fmtDate, t } from "@/i18n";

export function ProductRow({ p, extra, onClick }: { p: Product; extra?: React.ReactNode; onClick?: () => void }) {
  const m = prodMacros(p); const others = (p.e && lib().byEan.get(p.e)) ? lib().byEan.get(p.e)!.filter((q) => q !== p) : [];
  const s = settings(); const active = p.o && s.offers && (!p.om || s.member);
  const body = (
    <>
      <div className="grow">
        <div className="row" style={{ gap: 6 }}>
          <StoreChip s={p.s} />
          {p.o ? <span className={`pill ${active ? "offer" : ""}`}>{p.ot || t("extra_price")}{p.om ? " · " + t("member_lc") : ""}</span> : null}
        </div>
        {extra}
        <div className="t">{p.n}</div>
        <div className="s">{[p.b, p.sz].filter(Boolean).join(" · ")}</div>
        <MacroLine m={m} />
        {others.length > 0 && <div className="small muted">{t("same_product", { list: others.map((q) => `${STORES[q.s]} ${kr(unitPrice(q))}`).join(" · ") })}</div>}
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
        <div className="row" style={{ gap: 6 }}><StoreChip s={p.s} />{p.om ? <span className="pill">{t("member_price")}</span> : null}{pct >= 1 && <span className="pill offer">-{pct} %</span>}</div>
        <div className="t">{p.n}</div>
        <div className="s">{[p.b, p.sz].filter(Boolean).join(" · ")}</div>
        <div className="small muted">{[p.ot, p.oe && offerEnd(p.oe), t("regular_price", { price: kr(p.p) + (p.pu === "kg" ? "/kg" : "") })].filter(Boolean).join(" · ")}</div>
        <div className="small" style={{ color: "var(--offer)" }}>{cap(offerWhere(p.s, { p }).long)}{p.om ? ", " + t("requires", { what: memberName(p.s) }) : ""}</div>
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
        <div className="row" style={{ gap: 6 }}><StoreChip s="i" /><span className="small muted">{icaStoreShort(x)}</span>{x.member && <span className="pill">{t("ica_card")}</span>}{pct >= 1 && <span className="pill offer">-{pct} %</span>}</div>
        <div className="t">{x.n}</div>
        <div className="s">{[x.b, x.pack].filter(Boolean).join(" · ")}</div>
        <div className="small muted">{[x.mech, x.end && offerEnd(x.end), x.reg && t("regular_price", { price: kr(x.reg) })].filter(Boolean).join(" · ")}</div>
        <div className="small" style={{ color: "var(--offer)" }}>{t("offer_only_in", { store: icaStoreShort(x) })}{x.member ? ", " + t("requires", { what: memberName("i") }) : ""}</div>
      </div>
      <div className="right"><span className="tag off">{num2(x.unit)}<small>{x.kg ? " /kg" : ""}</small></span><span className="cmp">{x.cmp ? t("cmp_prefix", { v: x.cmp.replace(":", ",") }) : ""}</span></div>
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
        <div className="row" style={{ gap: 6 }}><StoreChip s="l" />{x.plus != null && x.p != null ? <span className="pill">Lidl Plus {kr(x.plus)}</span> : x.plus != null ? <span className="pill">{t("lidl_plus_price")}</span> : null}</div>
        <div className="t">{x.n}</div>
        <div className="s">{[x.pack, x.info].filter(Boolean).join(" · ")}</div>
        <div className="small muted">{t("valid_until", { date: x.end ? fmtDate(new Date(x.end * 1000), { day: "numeric", month: "short" }) : "–" })}{x.old ? " · " + t("regular_price", { price: kr(x.old) }) : ""}</div>
        <div className="small" style={{ color: "var(--offer)" }}>{t("lidl_all_stores")}{x.p == null ? ", " + t("requires", { what: "Lidl Plus" }) : ""}</div>
      </div>
      <div className="right"><span className="tag off">{num2(pr)}<small>{x.kgpriced ? " /kg" : ""}</small></span><span className="cmp">{x.cmp && x.cu ? t("cmp_prefix", { v: `${x.cmp.toLocaleString("sv-SE")} kr/${x.cu}` }) : ""}</span></div>
    </>
  );
  return onClick ? <div className="item" role="button" tabIndex={0} style={{ cursor: "pointer" }} onClick={onClick}>{body}</div> : <div className="item">{body}</div>;
}
