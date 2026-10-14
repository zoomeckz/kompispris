import { Link } from "react-router-dom";
import { t } from "@/i18n";
export default function NotFound() {
  return <div className="card empty-state">{t("page_not_found")} <Link to="/">{t("to_home")}</Link></div>;
}
