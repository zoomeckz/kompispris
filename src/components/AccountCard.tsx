import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/hooks/useApp";

/** shown where saving needs an account */
export default function AccountCard({ what = "spara recept och matlistor" }: { what?: string }) {
  const { user, authReady } = useApp();
  if (user) return null;
  if (!supabase) return <div className="card small muted">Konton är inte aktiverade i den här versionen ännu.</div>;
  if (!authReady) return <div className="card small muted">Kontrollerar ditt konto…</div>;
  return (
    <div className="card stack" style={{ borderColor: "var(--accent)" }}>
      <h3>Skapa konto</h3>
      <div className="small">Skapa ett gratis konto för att {what}. Du kan registrera dig med e-post, Google eller Facebook.</div>
      <div className="small muted">Du kan söka varor, se erbjudanden och prova exemplet utan konto.</div>
      <div className="row"><Link className="btn primary" to="/logga-in?mode=signup">Skapa konto</Link><Link className="btn" to="/logga-in">Logga in</Link></div>
    </div>
  );
}
