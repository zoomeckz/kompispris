import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { Product, STORES, StoreCode, unitPrice } from "@/lib/engine";
import { n0, n1, num2 } from "@/lib/format";

export const StoreChip = ({ s }: { s: StoreCode }) => <span className={`chip ${s}`}>{STORES[s]}</span>;

export function PriceTag({ p }: { p: Product }) {
  const up = unitPrice(p); const off = up !== p.p;
  return <span className={`tag ${off ? "off" : ""}`}>{num2(up)}<small>{p.pu === "kg" ? " /kg" : ""}</small></span>;
}
export const Tag = ({ value, off, unit }: { value: number; off?: boolean; unit?: string }) => (
  <span className={`tag ${off ? "off" : ""}`}>{num2(value)}{unit && <small>{unit}</small>}</span>
);

export function MacroLine({ m, label = "per 100 g" }: { m: number[] | null; label?: string }) {
  if (!m) return <span className="small muted">Näringsvärde saknas</span>;
  return (
    <div className="macros">
      <span><b>{n0(m[0])}</b> kcal</span><span>P <b>{n1(m[1])}</b></span><span>K <b>{n1(m[2])}</b></span><span>F <b>{n1(m[3])}</b></span><span>{label}</span>
    </div>
  );
}

export function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: [T, React.ReactNode][]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map(([k, v]) => <button key={k} type="button" aria-pressed={value === k} onClick={() => onChange(k)}>{v}</button>)}
    </div>
  );
}

export function Sheet({ title, onClose, header, children }: { title: React.ReactNode; onClose: () => void; header?: React.ReactNode; children: React.ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", k); const o = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", k); document.body.style.overflow = o; };
  }, [onClose]);
  return createPortal(
    <div className="sheet-bg" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" role="dialog" aria-modal="true">
        <div className="hd">
          <div className="row between"><h2>{title}</h2><button className="btn ghost" onClick={onClose}>Stäng</button></div>
          {header}
        </div>
        <div className="bd">{children}</div>
      </div>
    </div>, document.body);
}

export function Kpis({ items }: { items: [React.ReactNode, string][] }) {
  return <div className="kpis">{items.map(([v, l], i) => <div className="kpi" key={i}><b className="num">{v}</b><span>{l}</span></div>)}</div>;
}

/** clickable row that also works with the keyboard */
export function RowButton({ onClick, children, className = "item" }: { onClick: () => void; children: React.ReactNode; className?: string }) {
  return <div className={className} role="button" tabIndex={0} style={{ cursor: "pointer" }} onClick={onClick} onKeyDown={(e) => { if (e.key === "Enter") onClick(); }}>{children}</div>;
}

export async function copyToClipboard(txt: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(txt); return true; } catch { return false; }
}
