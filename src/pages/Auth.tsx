import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { lovable } from "@/integrations/lovable/index";
import { useApp } from "@/hooks/useApp";
import { t } from "@/i18n";

const G = <svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8z" /><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z" /><path fill="#FBBC05" d="M5.8 14.2a6.6 6.6 0 0 1 0-4.3V7H2.1a11 11 0 0 0 0 9.9z" /><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7l3.7 2.9C6.7 7.3 9.1 5.4 12 5.4z" /></svg>;
const F = <svg viewBox="0 0 24 24"><path fill="#1877F2" d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12z" /></svg>;

export default function Auth() {
  const [params] = useSearchParams(); const nav = useNavigate();
  const { user, toast } = useApp();
  const [mode, setMode] = useState<"in" | "up" | "reset" | "newpw">(params.get("mode") === "signup" ? "up" : "in");
  const [email, setEmail] = useState(""); const [pw, setPw] = useState(""); const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null); const [info, setInfo] = useState<string | null>(null); const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((ev) => { if (ev === "PASSWORD_RECOVERY") setMode("newpw"); });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => { if (user && mode !== "newpw") nav("/"); }, [user]);

  if (!supabase) return <div className="card empty-state">{t("accounts_connect")}</div>;
  const sb = supabase;
  const oauth = async (provider: "google" | "facebook") => {
    setErr(null);
    // Google goes through Lovable Cloud's managed sign-in; Lovable has no managed Facebook login
    const { error } = provider === "google"
      ? await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })
      : await sb.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin } });
    if (error) setErr(provider === "google" ? t("google_disabled") : t("facebook_disabled"));
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null); setInfo(null); setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await sb.auth.signInWithPassword({ email, password: pw });
        if (error) setErr(error.message.includes("Invalid") ? t("wrong_login") : error.message.includes("confirm") ? t("confirm_email_first") : error.message);
      } else if (mode === "up") {
        if (pw.length < 8) { setErr(t("pw_min")); return; }
        const { data, error } = await sb.auth.signUp({ email, password: pw, options: { data: { full_name: name || undefined }, emailRedirectTo: window.location.origin } });
        if (error) setErr(error.message.includes("registered") ? t("already_registered") : error.message);
        else if (!data.session) setInfo(t("account_created_confirm"));
        else toast(t("welcome"));
      } else if (mode === "reset") {
        const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/logga-in" });
        if (error) setErr(error.message); else setInfo(t("reset_sent"));
      } else {
        if (pw.length < 8) { setErr(t("pw_min")); return; }
        const { error } = await sb.auth.updateUser({ password: pw });
        if (error) setErr(error.message); else { toast(t("pw_changed")); nav("/"); }
      }
    } finally { setBusy(false); }
  };
  const title = { in: t("log_in"), up: t("create_account"), reset: t("forgot_pw"), newpw: t("new_pw_title") }[mode];
  return (
    <div className="stack" style={{ maxWidth: 420, margin: "0 auto" }}>
      <h2>{title}</h2>
      {(mode === "in" || mode === "up") && <div className="card stack">
        <button className="btn provider" onClick={() => oauth("google")}>{G} {t("continue_google")}</button>
        <button className="btn provider" onClick={() => oauth("facebook")}>{F} {t("continue_facebook")}</button>
        <div className="small muted" style={{ textAlign: "center" }}>{t("or_email")}</div>
      </div>}
      <form className="card stack" onSubmit={submit}>
        {mode === "up" && <label className="small">{t("name_label")}<input type="text" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>}
        {mode !== "newpw" && <label className="small">{t("email")}<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" dir="ltr" /></label>}
        {mode !== "reset" && <label className="small">{mode === "newpw" ? t("new_password") : t("password")}<input type="password" required value={pw} onChange={(e) => setPw(e.target.value)} autoComplete={mode === "in" ? "current-password" : "new-password"} minLength={mode === "in" ? undefined : 8} dir="ltr" /></label>}
        {err && <div className="err" role="alert">{err}</div>}
        {info && <div className="banner">{info}</div>}
        <button className="btn primary" disabled={busy}>{busy ? t("wait") : title}</button>
        <div className="row between small">
          {mode === "in" && <><button type="button" className="btn ghost small" onClick={() => setMode("up")}>{t("create_account")}</button><button type="button" className="btn ghost small" onClick={() => setMode("reset")}>{t("forgot_pw_q")}</button></>}
          {mode === "up" && <button type="button" className="btn ghost small" onClick={() => setMode("in")}>{t("have_account")}</button>}
          {mode === "reset" && <button type="button" className="btn ghost small" onClick={() => setMode("in")}>{t("back_to_login")}</button>}
        </div>
      </form>
      <div className="small muted">{t("auth_footer")} <Link to="/">{t("continue_without")}</Link></div>
    </div>
  );
}
