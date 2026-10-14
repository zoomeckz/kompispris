import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/hooks/useApp";
import { STORE_CODES, StoreCode, lib } from "@/lib/engine";
import { StoreChip } from "@/components/ui";
import { LANGS, Lang, t, tp, useLang } from "@/i18n";

const desc = (s: StoreCode) => ({ w: "Willys Stockholm Vällingby", h: "Hemköp Vällingby C", c: t("desc_c"), i: t("desc_i"), l: t("desc_l"), o: t("desc_o") }[s]);

export default function SettingsPage() {
  const { settings, setSettings, user, toast, recipes, lists } = useApp();
  const { lang, setLang } = useLang();
  const nav = useNavigate();
  const [confirm, setConfirm] = useState(false);
  const st = settings;
  const deleteAccount = async () => {
    if (!supabase) return;
    const { error } = await supabase.functions.invoke("delete-account");
    if (error) { toast(t("delete_failed")); return; }
    await supabase.auth.signOut(); toast(t("account_deleted")); nav("/");
  };
  return (
    <div className="stack">
      <h2>{t("settings")}</h2>
      <div className="card stack">
        <h3>{t("language")}</h3>
        <select value={lang} onChange={(e) => setLang(e.target.value as Lang)} aria-label={t("language")}>{LANGS.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}</select>
      </div>
      <div className="card stack">
        <h3>{t("account")}</h3>
        {user ? <>
          <div className="small">{t("logged_in_as")} <b>{user.email}</b> ({user.app_metadata?.provider || t("provider_email")}).</div>
          <div className="small muted">{tp("recipes_n", Object.keys(recipes).length)} · {tp("lists_n", Object.keys(lists).length)}</div>
          <div className="row"><button className="btn small" onClick={async () => { await supabase!.auth.signOut(); toast(t("logged_out")); nav("/"); }}>{t("log_out")}</button>
            <button className="btn small danger" onClick={() => (confirm ? deleteAccount() : setConfirm(true))}>{confirm ? t("tap_again_delete_all") : t("delete_account")}</button></div>
        </> : supabase ? <div className="row"><Link className="btn primary" to="/logga-in?mode=signup">{t("create_account")}</Link><Link className="btn" to="/logga-in">{t("log_in")}</Link></div>
          : <div className="small muted">{t("accounts_disabled")}</div>}
      </div>
      <div className="card">
        <label className="toggle"><span><b>{t("offers_toggle")}</b><br /><span className="small muted">{t("offers_toggle_desc")}</span></span><input type="checkbox" checked={st.offers} onChange={(e) => setSettings({ ...st, offers: e.target.checked })} /></label>
        <label className="toggle"><span><b>{t("member_toggle")}</b><br /><span className="small muted">{t("member_toggle_desc")}</span></span><input type="checkbox" checked={st.member} onChange={(e) => setSettings({ ...st, member: e.target.checked })} /></label>
      </div>
      <div className="card"><h3>{t("stores_title")}</h3>
        {STORE_CODES.map((s) => <label key={s} className="toggle"><span><StoreChip s={s} /> <span className="small muted">{desc(s)}</span></span><input type="checkbox" checked={st.stores[s] !== false} onChange={(e) => setSettings({ ...st, stores: { ...st.stores, [s]: e.target.checked } })} /></label>)}
      </div>
      <div className="card stack small"><h3>{t("about_prices")}</h3>
        <p style={{ margin: 0 }}>{t("about_p1", { date: lib().updated })}</p>
        <p style={{ margin: 0 }}>{t("about_p2")}</p>
        <p style={{ margin: 0 }}>{t("about_p3")}</p>
      </div>
    </div>
  );
}
