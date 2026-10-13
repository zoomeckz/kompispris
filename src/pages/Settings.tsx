import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/hooks/useApp";
import { STORE_CODES, StoreCode, lib } from "@/lib/engine";
import { StoreChip } from "@/components/ui";

const DESC: Record<StoreCode, string> = { w: "Willys Stockholm Vällingby", h: "Hemköp Vällingby C", c: "Coop e-handel Stockholm", i: "Veckans erbjudanden i 4 butiker nära Vällingby, plus egna priser", l: "Bara veckans erbjudanden" };

export default function SettingsPage() {
  const { settings, setSettings, user, toast, recipes, lists } = useApp();
  const nav = useNavigate();
  const [confirm, setConfirm] = useState(false);
  const st = settings;
  const deleteAccount = async () => {
    if (!supabase) return;
    const { error } = await supabase.functions.invoke("delete-account");
    if (error) { toast("Kunde inte radera kontot. Försök igen."); return; }
    await supabase.auth.signOut(); toast("Ditt konto och all din data är raderad"); nav("/");
  };
  return (
    <div className="stack">
      <h2>Inställningar</h2>
      <div className="card stack">
        <h3>Konto</h3>
        {user ? <>
          <div className="small">Inloggad som <b>{user.email}</b> ({user.app_metadata?.provider || "e-post"}).</div>
          <div className="small muted">{Object.keys(recipes).length} recept · {Object.keys(lists).length} matlistor</div>
          <div className="row"><button className="btn small" onClick={async () => { await supabase!.auth.signOut(); toast("Utloggad"); nav("/"); }}>Logga ut</button>
            <button className="btn small danger" onClick={() => (confirm ? deleteAccount() : setConfirm(true))}>{confirm ? "Tryck igen för att radera allt" : "Radera mitt konto"}</button></div>
        </> : supabase ? <div className="row"><Link className="btn primary" to="/logga-in?mode=signup">Skapa konto</Link><Link className="btn" to="/logga-in">Logga in</Link></div>
          : <div className="small muted">Konton är inte aktiverade ännu.</div>}
      </div>
      <div className="card">
        <label className="toggle"><span><b>Räkna med erbjudanden</b><br /><span className="small muted">Använder kampanjpriset när en vara är på extrapris.</span></span><input type="checkbox" checked={st.offers} onChange={(e) => setSettings({ ...st, offers: e.target.checked })} /></label>
        <label className="toggle"><span><b>Jag är medlem</b><br /><span className="small muted">Willys Plus, Hemköp-kortet, Coop medlem, ICA-kortet och Lidl Plus. Av som standard, då räknas bara priser utan medlemskrav.</span></span><input type="checkbox" checked={st.member} onChange={(e) => setSettings({ ...st, member: e.target.checked })} /></label>
      </div>
      <div className="card"><h3>Butiker att jämföra</h3>
        {STORE_CODES.map((s) => <label key={s} className="toggle"><span><StoreChip s={s} /> <span className="small muted">{DESC[s]}</span></span><input type="checkbox" checked={st.stores[s] !== false} onChange={(e) => setSettings({ ...st, stores: { ...st.stores, [s]: e.target.checked } })} /></label>)}
      </div>
      <div className="card stack small"><h3>Om priserna</h3>
        <p style={{ margin: 0 }}>Alla priser kommer från prisbiblioteket som hämtades {lib().updated}. Appen hämtar aldrig något från butikerna när du söker eller använder en matlista. Biblioteket byggs om från grunden vid varje hämtning, så inget gammalt ligger kvar.</p>
        <p style={{ margin: 0 }}>Willys och Hemköp gäller butikerna i Vällingby. Coop gäller deras e-handel i Stockholm. ICA: veckans erbjudanden från ICA Söderberga, ICA Kvantum Åkermyntan, ICA Supermarket Hässelby Torg och ICA Supermarket Brommaplan; vanliga ICA-priser går inte att hämta, så de kan du skriva in själv. Lidl: bara veckans erbjudanden.</p>
        <p style={{ margin: 0 }}>Näringsvärden för varor som saknar det kommer från Livsmedelsverkets livsmedelsdatabas.</p>
      </div>
    </div>
  );
}
