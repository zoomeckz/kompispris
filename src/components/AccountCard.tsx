import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/hooks/useApp";
import { t } from "@/i18n";

/** shown where saving needs an account */
export default function AccountCard({ what = t("acc_what_save") }: { what?: string }) {
  const { user, authReady } = useApp();
  if (user) return null;
  if (!supabase) return <div className="card small muted">{t("acc_disabled")}</div>;
  if (!authReady) return <div className="card small muted">{t("acc_checking")}</div>;
  return (
    <div className="card stack" style={{ borderColor: "var(--accent)" }}>
      <h3>{t("create_account")}</h3>
      <div className="small">{t("acc_body", { what })}</div>
      <div className="small muted">{t("acc_without")}</div>
      <div className="row"><Link className="btn primary" to="/logga-in?mode=signup">{t("create_account")}</Link><Link className="btn" to="/logga-in">{t("log_in")}</Link></div>
    </div>
  );
}
