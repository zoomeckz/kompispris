import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useApp } from "@/hooks/useApp";

const I = {
  recept: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 3h10l3 3v15H6z" /><path d="M9 9h7M9 13h7M9 17h4" /></svg>,
  listor: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 6h11M9 12h11M9 18h11" /><path d="m3.5 6 1.5 1.5L7.5 5M3.5 12l1.5 1.5L7.5 11M3.5 18l1.5 1.5L7.5 17" /></svg>,
  erbj: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 12V4h8l10 10-8 8z" /><circle cx="7.5" cy="8.5" r="1.5" /></svg>,
  varor: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="6" /><path d="m20 20-4.5-4.5" /></svg>,
  admin: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>,
  set: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></svg>,
};

export default function Layout() {
  const { lib, libError, isAdmin, user } = useApp();
  const loc = useLocation();
  const tab = (to: string, label: string, icon: JSX.Element, end = false) => (
    <NavLink to={to} end={end} className={({ isActive }) => (isActive ? "on" : "")} aria-label={label}>{icon}{label}</NavLink>
  );
  return (
    <>
      <div className="wrap">
        <header className="top">
          <Link to="/" style={{ textDecoration: "none", color: "inherit" }}><h1>Kompis<span>Pris</span></h1></Link>
          <div className="row" style={{ gap: 10, flexWrap: "nowrap" }}>
            <div className="status">{lib ? <>{lib.P.length.toLocaleString("sv-SE")} varor<br />priser från {lib.updated}</> : libError ? "Fel vid inläsning" : "Laddar varor…"}</div>
            <NavLink to="/installningar" className={({ isActive }) => `iconbtn ${isActive ? "on" : ""}`} aria-label="Inställningar och konto" title={user ? "Inställningar och konto" : "Inställningar"}>{I.set}</NavLink>
          </div>
        </header>
        <main>
          {libError ? <div className="card empty-state">Prisbiblioteket kunde inte laddas. Ladda om sidan.</div>
            : !lib && loc.pathname !== "/logga-in" ? <div className="loading">Hämtar prisbiblioteket…<div className="bar"><i /></div></div>
            : <div className="page" key={loc.pathname}><Outlet /></div>}
        </main>
      </div>
      <nav className="tabs" aria-label="Huvudmeny">
        <div className="in">
          {tab("/", "Recept", I.recept, true)}
          {tab("/listor", "Matlistor", I.listor)}
          {tab("/erbjudanden", "Erbjudanden", I.erbj)}
          {tab("/varor", "Varor", I.varor)}
          {isAdmin && tab("/admin", "Admin", I.admin)}
        </div>
      </nav>
    </>
  );
}
