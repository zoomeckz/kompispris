import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
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

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: [T, React.ReactNode][]; onChange: (v: T) => void; label: string }) {
  // the highlight slides to the chosen button; measured so it also fits buttons of different widths
  const ref = useRef<HTMLDivElement>(null);
  const [ind, setInd] = useState<{ left: number; width: number } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const measure = () => { const b = el.querySelector<HTMLElement>("button[aria-pressed=true]"); setInd(b ? { left: b.offsetLeft, width: b.offsetWidth } : null); };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    return () => ro.disconnect();
  }, [value, options.length]);
  return (
    <div className="seg" role="group" aria-label={label} ref={ref}>
      {ind && <span className="ind" style={{ transform: `translateX(${ind.left}px)`, width: ind.width }} aria-hidden="true" />}
      {options.map(([k, v]) => <button key={k} type="button" aria-pressed={value === k} onClick={() => onChange(k)}>{v}</button>)}
    </div>
  );
}

/** Panel over the page: a sheet from the bottom on phones, a centered dialog on wider screens.
 *  `tall` keeps a fixed height for panels with search results, so it doesn't jump while you type. */
export function Sheet({ title, onClose, header, children, tall }: { title: React.ReactNode; onClose: () => void; header?: React.ReactNode; children: React.ReactNode; tall?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", k); const o = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", k); document.body.style.overflow = o; };
  }, [onClose]);
  // Sheets are closed from many places, so the exit animation plays on a copy that is left behind for a moment.
  useLayoutEffect(() => () => {
    const el = ref.current; if (!el || reducedMotion()) return;
    const ghost = el.cloneNode(true) as HTMLElement;
    const from = el.querySelectorAll<HTMLInputElement>("input,select,textarea"), to = ghost.querySelectorAll<HTMLInputElement>("input,select,textarea");
    from.forEach((n, i) => { if (to[i]) to[i].value = n.value; });
    ghost.classList.add("out"); ghost.setAttribute("aria-hidden", "true");
    document.body.appendChild(ghost);
    const done = () => ghost.remove();
    ghost.addEventListener("animationend", (e) => { if (e.target === ghost) done(); });
    window.setTimeout(done, 400);
  }, []);
  return createPortal(
    <div className="sheet-bg" ref={ref} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`sheet ${tall ? "tall" : ""}`} role="dialog" aria-modal="true">
        <div className="hd">
          <span className="grab" aria-hidden="true" />
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
