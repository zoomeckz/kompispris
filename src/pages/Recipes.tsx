import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "@/hooks/useApp";
import { Recipe, modeResult, totals } from "@/lib/engine";
import { exampleRecipe, kr0 } from "@/lib/format";
import { MacroLine } from "@/components/ui";
import AccountCard from "@/components/AccountCard";
import { t, tp } from "@/i18n";

export function RecipeCard({ r, example }: { r: Recipe; example?: boolean }) {
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
}

export default function Recipes() {
  const { recipes, user, createRecipe, settings } = useApp();
  const nav = useNavigate();
  const ex = useMemo(() => exampleRecipe(), [settings]);
  const rs = Object.values(recipes).sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
  return (
    <div className="stack">
      <div className="row between"><h2>{t("recipes_title")}</h2>
        {user && <button className="btn primary" onClick={async () => { const r = await createRecipe({ name: t("new_recipe"), portions: 4, notes: "", ings: [] }); if (r) nav(`/recept/${r.id}`); }}>{t("new_recipe")}</button>}</div>
      <AccountCard />
      {user && !rs.length && <div className="card empty-state">{t("no_recipes")}</div>}
      {rs.map((r) => <RecipeCard key={r.id} r={r} />)}
      {/* the example is only for getting started: it goes away once you have a recipe of your own */}
      {!rs.length && <div className="stack"><h3>{t("example")}</h3><RecipeCard r={ex} example /></div>}
    </div>
  );
}
