import { useApp } from "@/hooks/useApp";
import { t } from "@/i18n";

/** Shows that a recipe or list is saved to the account, and lets people save right away instead of waiting. */
export default function SaveStatus({ k, onSave }: { k: string; onSave: () => void }) {
  const { saveState, flushSave } = useApp();
  const s = saveState[k];
  const busy = s === "pending" || s === "saving";
  return (
    <div className="row save-status" style={{ gap: 8, flexWrap: "nowrap" }}>
      <span className={`small ${s === "error" ? "err" : busy ? "muted" : "ok-txt"}`} role="status" aria-live="polite">
        {busy ? t("saving") : s === "error" ? t("save_error") : t("saved_auto")}
      </span>
      <button className="btn small" disabled={s === "saving"} onClick={() => (s === "pending" ? flushSave(k) : onSave())}>{s === "error" ? t("try_again") : t("save")}</button>
    </div>
  );
}
