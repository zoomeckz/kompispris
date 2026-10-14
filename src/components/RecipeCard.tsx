import { memo } from "react";
import { Link } from "react-router-dom";
import { Recipe, modeResult, totals } from "@/lib/engine";
import { kr0 } from "@/lib/format";
import { MacroLine } from "./ui";
import { t, tp } from "@/i18n";

/** one recipe in the list; memoized because the list redraws on every step of a drag */
export const RecipeCard = memo(function RecipeCard({ r, example }: { r: Recipe; example?: boolean }) {
  const tot = totals(r.ings); const por = Math.max(1, +r.portions || 1); const c = modeResult(tot, "cheap");
  return (
    <Link to={`/recept/${example ? "exempel" : r.id}`} className="card" style={{ display: "block", textDecoration: "none", color: "inherit" }}>
      <div className="row between" style={{ alignItems: "flex-start" }}>
        <div className="grow"><div style={{ fontWeight: 600, fontSize: 16 }}>{r.name || t("unnamed_recipe")}</div>
          <div className="small muted">{tp("ingredients_n", r.ings.length)} · {tp("portions_n", por)}{example ? " · " + t("example_tag") : ""}</div></div>
        <div className="right"><span className="tag">{kr0(c.sum).replace(" kr", "")}<small> kr</small></span><span className="cmp">{t("to_buy_for")}</span><span className="cmp">{t("per_portion_amount", { amount: kr0(c.used / por) })}</span></div>
      </div>
      <div style={{ marginTop: 8 }}><MacroLine m={tot.mac.map((v) => v / por)} label={t("per_portion")} /></div>
    </Link>
  );
});
