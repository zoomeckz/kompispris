import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { lovable } from "@/integrations/lovable/index";
import { useApp } from "@/hooks/useApp";

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

  if (!supabase) return <div className="card empty-state">Konton är inte aktiverade ännu. Koppla Supabase till projektet för att slå på inloggning.</div>;
  const sb = supabase;
  const oauth = async (provider: "google" | "facebook") => {
    setErr(null);
    // Google goes through Lovable Cloud's managed sign-in; Lovable has no managed Facebook login
    const { error } = provider === "google"
      ? await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })
      : await sb.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin } });
    if (error) setErr(provider === "google" ? "Google-inloggning är inte aktiverad ännu." : "Facebook-inloggning är inte aktiverad ännu.");
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null); setInfo(null); setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await sb.auth.signInWithPassword({ email, password: pw });
        if (error) setErr(error.message.includes("Invalid") ? "Fel e-post eller lösenord." : error.message.includes("confirm") ? "Bekräfta din e-post först. Kolla inkorgen." : error.message);
      } else if (mode === "up") {
        if (pw.length < 8) { setErr("Lösenordet måste vara minst 8 tecken."); return; }
        const { data, error } = await sb.auth.signUp({ email, password: pw, options: { data: { full_name: name || undefined }, emailRedirectTo: window.location.origin } });
        if (error) setErr(error.message.includes("registered") ? "Det finns redan ett konto med den e-posten. Logga in i stället." : error.message);
        else if (!data.session) setInfo("Kontot är skapat. Vi har skickat ett mejl, klicka på länken i det för att bekräfta din e-post.");
        else toast("Välkommen till KompisPris!");
      } else if (mode === "reset") {
        const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/logga-in" });
        if (error) setErr(error.message); else setInfo("Om det finns ett konto med den e-posten har vi skickat en länk för att välja nytt lösenord.");
      } else {
        if (pw.length < 8) { setErr("Lösenordet måste vara minst 8 tecken."); return; }
        const { error } = await sb.auth.updateUser({ password: pw });
        if (error) setErr(error.message); else { toast("Lösenordet är bytt"); nav("/"); }
      }
    } finally { setBusy(false); }
  };
  const title = { in: "Logga in", up: "Skapa konto", reset: "Glömt lösenord", newpw: "Välj nytt lösenord" }[mode];
  return (
    <div className="stack" style={{ maxWidth: 420, margin: "0 auto" }}>
      <h2>{title}</h2>
      {(mode === "in" || mode === "up") && <div className="card stack">
        <button className="btn provider" onClick={() => oauth("google")}>{G} Fortsätt med Google</button>
        <button className="btn provider" onClick={() => oauth("facebook")}>{F} Fortsätt med Facebook</button>
        <div className="small muted" style={{ textAlign: "center" }}>eller med e-post</div>
      </div>}
      <form className="card stack" onSubmit={submit}>
        {mode === "up" && <label className="small">Namn (visas för dig)<input type="text" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>}
        {mode !== "newpw" && <label className="small">E-post<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>}
        {mode !== "reset" && <label className="small">{mode === "newpw" ? "Nytt lösenord" : "Lösenord"}<input type="password" required value={pw} onChange={(e) => setPw(e.target.value)} autoComplete={mode === "in" ? "current-password" : "new-password"} minLength={mode === "in" ? undefined : 8} /></label>}
        {err && <div className="err" role="alert">{err}</div>}
        {info && <div className="banner">{info}</div>}
        <button className="btn primary" disabled={busy}>{busy ? "Vänta…" : title}</button>
        <div className="row between small">
          {mode === "in" && <><button type="button" className="btn ghost small" onClick={() => setMode("up")}>Skapa konto</button><button type="button" className="btn ghost small" onClick={() => setMode("reset")}>Glömt lösenord?</button></>}
          {mode === "up" && <button type="button" className="btn ghost small" onClick={() => setMode("in")}>Har du redan ett konto? Logga in</button>}
          {mode === "reset" && <button type="button" className="btn ghost small" onClick={() => setMode("in")}>Tillbaka till inloggning</button>}
        </div>
      </form>
      <div className="small muted">Genom att skapa konto sparas dina recept, matlistor och inställningar. Appens ägare ser ditt namn, din e-post, när du gick med och vad du söker på, men inte dina recept. <Link to="/">Fortsätt utan konto</Link></div>
    </div>
  );
}
