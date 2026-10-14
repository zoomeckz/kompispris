import { Suspense, useMemo, useState } from "react";
import { lazyPage } from "@/lib/lazyPage";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/hooks/useApp";
import { RecipeCat, RecipeOrg } from "@/lib/engine";
import { exampleRecipe, uid } from "@/lib/format";
import { addCat, orgOf, removeCat, renameCat } from "@/lib/org";
import { Sheet } from "@/components/ui";
import { RecipeCard } from "@/components/RecipeCard";
import AccountCard from "@/components/AccountCard";
import { t } from "@/i18n";

const RecipeBoard = lazyPage(() => import("./RecipeBoard"));

export default function Recipes() {
  const { recipes, user, createRecipe, settings, setSettings, lib } = useApp();
  const nav = useNavigate();
  const all = useMemo(() => Object.values(recipes), [recipes]);
  // the example is only for getting started; it is built from the library, so only rebuild it when that changes
  const ex = useMemo(() => (all.length ? null : exampleRecipe()), [lib, all.length === 0]);
  const org = useMemo(() => orgOf(settings.org), [settings.org]);
  const save = (o: RecipeOrg) => setSettings({ ...settings, org: o });
  const [sheet, setSheet] = useState<{ kind: "new" } | { kind: "edit"; cat: RecipeCat } | null>(null);
  const hasCats = org.cats.length > 0;

  return (
    <div className="stack">
      <div className="row between"><h2>{t("recipes_title")}</h2>
        {user && <div className="row">
          <button className="btn" onClick={() => setSheet({ kind: "new" })}>{t("new_category")}</button>
          <button className="btn primary" onClick={async () => { const r = await createRecipe({ name: t("new_recipe"), portions: 4, notes: "", ings: [] }); if (r) nav(`/recept/${r.id}`); }}>{t("new_recipe")}</button>
        </div>}</div>
      <AccountCard />
      {user && !all.length && <div className="card empty-state">{t("no_recipes")}</div>}
      {all.length > 1 || hasCats ? <div className="small muted">{t("drag_hint")}</div> : null}

      {all.length > 0 || hasCats ? (
        <Suspense fallback={<div className="stack">{all.map((r) => <RecipeCard key={r.id} r={r} />)}</div>}>
          <RecipeBoard recipes={all} org={org} save={save} onEdit={(cat) => setSheet({ kind: "edit", cat })} />
        </Suspense>
      ) : null}

      {ex && <div className="stack"><h3>{t("example")}</h3><RecipeCard r={ex} example /></div>}

      {sheet?.kind === "new" && <CategorySheet title={t("new_category")} initial="" submit={t("create")} onClose={() => setSheet(null)}
        onSave={(name) => { save(addCat(org, uid(), name)); setSheet(null); }} />}
      {sheet?.kind === "edit" && <CategorySheet title={t("edit_category")} initial={sheet.cat.name} submit={t("save")} onClose={() => setSheet(null)}
        onSave={(name) => { save(renameCat(org, sheet.cat.id, name)); setSheet(null); }} onDelete={() => { save(removeCat(org, sheet.cat.id)); setSheet(null); }} />}
    </div>
  );
}

function CategorySheet({ title, initial, submit, onClose, onSave, onDelete }: { title: string; initial: string; submit: string; onClose: () => void; onSave: (name: string) => void; onDelete?: () => void }) {
  const [name, setName] = useState(initial); const [confirm, setConfirm] = useState(false);
  return (
    <Sheet title={title} onClose={onClose}>
      <form className="stack" style={{ paddingTop: 12 }} onSubmit={(e) => { e.preventDefault(); if (name.trim()) onSave(name.trim()); }}>
        <label className="small">{t("category_name")}<input type="text" autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={60} /></label>
        <button className="btn primary" disabled={!name.trim()}>{submit}</button>
        {onDelete && <>
          <button type="button" className="btn danger" onClick={() => (confirm ? onDelete() : setConfirm(true))}>{confirm ? t("tap_again_delete") : t("delete_category")}</button>
          <div className="small muted">{t("delete_cat_note")}</div>
        </>}
      </form>
    </Sheet>
  );
}
