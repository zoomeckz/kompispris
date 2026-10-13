import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "@/hooks/useApp";
import { Recipe, modeResult, totals } from "@/lib/engine";
import { exampleRecipe, kr0 } from "@/lib/format";
import { MacroLine } from "@/components/ui";
import AccountCard from "@/components/AccountCard";

export function RecipeCard({ r, example }: { r: Recipe; example?: boolean }) {
  const t = totals(r.ings); const por = Math.max(1, +r.portions || 1); const c = modeResult(t, "cheap");
  return (
    <Link to={`/recept/${example ? "exempel" : r.id}`} className="card" style={{ display: "block", textDecoration: "none", color: "inherit" }}>
      <div className="row between" style={{ alignItems: "flex-start" }}>
        <div className="grow"><div style={{ fontWeight: 600, fontSize: 16 }}>{r.name || "Namnlöst recept"}</div>
          <div className="small muted">{r.ings.length} ingredienser · {por} portioner{example ? " · exempel" : ""}</div></div>
        <div className="right"><span className="tag">{kr0(c.sum).replace(" kr", "")}<small> kr</small></span><span className="cmp">att handla för</span><span className="cmp">{kr0(c.used / por)} per portion</span></div>
      </div>
      <div style={{ marginTop: 8 }}><MacroLine m={t.mac.map((v) => v / por)} label="per portion" /></div>
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
      <div className="row between"><h2>Dina recept</h2>
        {user && <button className="btn primary" onClick={async () => { const r = await createRecipe({ name: "Nytt recept", portions: 4, notes: "", ings: [] }); if (r) nav(`/recept/${r.id}`); }}>Nytt recept</button>}</div>
      <AccountCard />
      {user && !rs.length && <div className="card empty-state">Inga recept än. Skapa ett eget, eller öppna exemplet nedan för att se hur det fungerar.</div>}
      {rs.map((r) => <RecipeCard key={r.id} r={r} />)}
      <div className="stack"><h3>Exempel</h3><RecipeCard r={ex} example /></div>
    </div>
  );
}
