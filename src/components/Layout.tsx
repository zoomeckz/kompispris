import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useApp } from "@/hooks/useApp";
import { Sheet } from "./ui";
import LanguageList from "./LanguageList";
import { LANGS, t, tp, useLang } from "@/i18n";

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
  const { lang } = useLang();
  const [langOpen, setLangOpen] = useState(false);
  const loc = useLocation();
  const tab = (to: string, label: string, icon: JSX.Element, end = false) => (
    <NavLink to={to} end={end} className={({ isActive }) => (isActive ? "on" : "")} aria-label={label}>{icon}{label}</NavLink>
  );
  return (
    <>
      <div className="wrap">
        <header className="top">
          <Link to="/" style={{ textDecoration: "none", color: "inherit" }}><h1 dir="ltr">Kompis<span>Pris</span></h1></Link>
          <div className="row" style={{ gap: 10, flexWrap: "nowrap" }}>
            <div className="status">{lib ? <>{tp("status_products", lib.P.length)}<br />{t("status_prices_from", { date: lib.updated })}</> : libError ? t("status_error") : t("status_loading")}</div>
            <button className="iconbtn lang" onClick={() => setLangOpen(true)} aria-label={t("language")} title={t("language")}><span className="flag" aria-hidden="true">{LANGS.find((l) => l.code === lang)?.flag}</span><span>{lang.toUpperCase()}</span></button>
            <NavLink to="/installningar" className={({ isActive }) => `iconbtn ${isActive ? "on" : ""}`} aria-label={user ? t("settings_and_account") : t("settings")} title={user ? t("settings_and_account") : t("settings")}>{I.set}</NavLink>
          </div>
        </header>
        <main>
          {libError ? <div className="card empty-state">{t("lib_error")}</div>
            : !lib && loc.pathname !== "/logga-in" ? <div className="loading">{t("lib_loading")}<div className="bar"><i /></div></div>
            : <div className="page" key={loc.pathname}><Outlet /></div>}
        </main>
      </div>
      <nav className="tabs" aria-label={t("nav_aria")}>
        <div className="in">
          {tab("/", t("nav_recipes"), I.recept, true)}
          {tab("/listor", t("nav_lists"), I.listor)}
          {tab("/erbjudanden", t("nav_offers"), I.erbj)}
          {tab("/varor", t("nav_products"), I.varor)}
          {isAdmin && tab("/admin", t("nav_admin"), I.admin)}
        </div>
      </nav>
      {langOpen && <Sheet title={t("language")} onClose={() => setLangOpen(false)}><LanguageList onPick={() => setLangOpen(false)} /></Sheet>}
    </>
  );
}
