/* The recipe list with categories and drag and drop. A separate file so the drag library (dnd-kit) is only
 * downloaded by people who have recipes; first-time visitors never need it. */
import { useMemo, useState } from "react";
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCenter, closestCorners, pointerWithin, useDroppable, useSensor, useSensors,
  type CollisionDetection, type DragEndEvent, type DragOverEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Recipe, RecipeCat, RecipeOrg } from "@/lib/engine";
import { NONE, fromLayout, sections, toggle } from "@/lib/org";
import { RecipeCard } from "@/components/RecipeCard";
import { t } from "@/i18n";

/* Drag ids: "r:<recipe>" for recipes, "c:<category>" for categories, "s:<section>" for the drop area of a section. */
type Layout = { id: string; items: string[] }[];
const kind = (id: unknown) => String(id).slice(0, 2);
const bare = (id: unknown) => String(id).slice(2);

// Recipes only land on recipes and sections, categories only on categories. With a mouse or finger the pointer decides;
// with the keyboard there is no pointer, so a recipe aims at the nearest recipe, or at a category that is still empty.
const collisionFor = (layout: Layout): CollisionDetection => (args) => {
  const isCat = kind(args.active.id) === "c:";
  const containers = args.droppableContainers.filter((c) => (isCat ? kind(c.id) === "c:" && bare(c.id) !== NONE : kind(c.id) === "r:" || kind(c.id) === "s:") && c.id !== args.active.id);
  if (isCat) return closestCenter({ ...args, droppableContainers: containers });
  if (args.pointerCoordinates) {
    const hits = pointerWithin({ ...args, droppableContainers: containers });
    if (hits.length) return [hits.find((h) => kind(h.id) === "r:") || hits[0]];
    return closestCorners({ ...args, droppableContainers: containers });
  }
  const empty = new Set(layout.filter((s) => !s.items.length).map((s) => "s:" + s.id));
  return closestCenter({ ...args, droppableContainers: containers.filter((c) => kind(c.id) === "r:" || empty.has(String(c.id))) });
};

export default function RecipeBoard({ recipes, org, save, onEdit }: { recipes: Recipe[]; org: RecipeOrg; save: (o: RecipeOrg) => void; onEdit: (cat: RecipeCat) => void }) {
  const secs = useMemo(() => sections(recipes, org), [recipes, org]);
  const [drag, setDrag] = useState<{ id: string; layout: Layout } | null>(null);
  const layout: Layout = drag?.layout ?? secs.map((s) => ({ id: s.id, items: s.items.map((r) => r.id) }));
  const hasCats = org.cats.length > 0;

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const onStart = (e: DragStartEvent) => setDrag({ id: String(e.active.id), layout: layout.map((s) => ({ ...s, items: [...s.items] })) });
  // moving a recipe into another category happens while dragging, so the list opens up under the finger
  const onOver = ({ active, over }: DragOverEvent) => {
    if (!drag || !over || kind(active.id) !== "r:") return;
    const rid = bare(active.id); const L = drag.layout;
    const from = L.findIndex((s) => s.items.includes(rid));
    const to = kind(over.id) === "s:" ? L.findIndex((s) => s.id === bare(over.id)) : L.findIndex((s) => s.items.includes(bare(over.id)));
    if (from < 0 || to < 0 || from === to) return;
    const next = L.map((s) => ({ ...s, items: s.items.filter((x) => x !== rid) }));
    const at = kind(over.id) === "r:" ? next[to].items.indexOf(bare(over.id)) : -1;
    next[to].items.splice(at < 0 ? next[to].items.length : at, 0, rid);
    setDrag({ ...drag, layout: next });
  };
  const onEnd = ({ active, over }: DragEndEvent) => {
    const L = drag?.layout; setDrag(null);
    if (!L || !over) return;
    if (kind(active.id) === "c:") {
      const from = L.findIndex((s) => s.id === bare(active.id)), to = L.findIndex((s) => s.id === bare(over.id));
      if (from >= 0 && to >= 0 && from !== to) save(fromLayout(org, arrayMove(L, from, to)));
      return;
    }
    const rid = bare(active.id); const si = L.findIndex((s) => s.items.includes(rid));
    if (si < 0) return;
    const next = L.map((s) => ({ ...s, items: [...s.items] }));
    if (kind(over.id) === "r:") { const a = next[si].items.indexOf(rid), b = next[si].items.indexOf(bare(over.id)); if (a >= 0 && b >= 0) next[si].items = arrayMove(next[si].items, a, b); }
    save(fromLayout(org, next));
  };

  const byId = new Map(recipes.map((r) => [r.id, r]));
  const meta = new Map(secs.map((s) => [s.id, s]));
  const activeRecipe = drag && kind(drag.id) === "r:" ? byId.get(bare(drag.id)) : null;
  const activeCat = drag && kind(drag.id) === "c:" ? org.cats.find((c) => c.id === bare(drag.id)) : null;
  // what screen readers hear while dragging, by name instead of internal ids
  const label = (id: unknown) => kind(id) === "r:" ? byId.get(bare(id))?.name || t("unnamed_recipe")
    : bare(id) === NONE ? t("uncategorized") : org.cats.find((c) => c.id === bare(id))?.name || "";
  const accessibility = {
    screenReaderInstructions: { draggable: t("dnd_help") },
    announcements: {
      onDragStart: ({ active }: DragStartEvent) => t("dnd_pick", { name: label(active.id) }),
      onDragOver: ({ active, over }: DragOverEvent) => (over ? t("dnd_over", { name: label(active.id), target: label(over.id) }) : undefined),
      onDragEnd: ({ active }: DragEndEvent) => t("dnd_drop", { name: label(active.id) }),
      onDragCancel: () => t("dnd_cancel"),
    },
  };

  return (
    <DndContext sensors={sensors} accessibility={accessibility} collisionDetection={collisionFor(layout)} onDragStart={onStart} onDragOver={onOver} onDragEnd={onEnd} onDragCancel={() => setDrag(null)}>
      <SortableContext items={org.cats.map((c) => "c:" + c.id)} strategy={verticalListSortingStrategy}>
        {layout.map((s) => {
          const m = meta.get(s.id); if (!m) return null;
          if (s.id === NONE && hasCats && !s.items.length && !activeRecipe) return null;
          return <SectionView key={s.id} id={s.id} cat={m.cat} open={m.open} items={s.items.map((id) => byId.get(id)).filter((r): r is Recipe => !!r)}
            showHead={hasCats} onToggle={() => save(toggle(org, s.id))} onEdit={() => m.cat && onEdit(m.cat)} />;
        })}
      </SortableContext>
      <DragOverlay>{activeRecipe ? <div className="drag-overlay"><RecipeCard r={activeRecipe} /></div>
        : activeCat ? <div className="drag-overlay card sec-head"><span className="nm">{activeCat.name}</span></div> : null}</DragOverlay>
    </DndContext>
  );
}

const Chevron = () => <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>;

function SectionView({ id, cat, open, items, showHead, onToggle, onEdit }: { id: string; cat: RecipeCat | null; open: boolean; items: Recipe[]; showHead: boolean; onToggle: () => void; onEdit: () => void }) {
  const sortable = useSortable({ id: "c:" + id, disabled: !cat });
  const drop = useDroppable({ id: "s:" + id });
  const name = cat ? cat.name : t("uncategorized");
  const closed = showHead && !open;
  const style = { transform: CSS.Translate.toString(sortable.transform), transition: sortable.transition };
  return (
    <section ref={sortable.setNodeRef} style={style} className={`sec ${closed ? "closed" : ""} ${sortable.isDragging ? "dragging" : ""} ${drop.isOver ? "over" : ""}`}>
      <div ref={drop.setNodeRef}>
        {showHead && <div className="sec-head">
          {cat ? <button className="grip" {...sortable.attributes} {...sortable.listeners} aria-label={t("drag_handle", { name })}>⠿</button> : <span className="grip-space" />}
          <button className="sec-toggle" onClick={onToggle} aria-expanded={!closed}><Chevron /><span className="nm">{name}</span><span className="ct">{items.length}</span></button>
          {cat && <button className="btn ghost small" onClick={onEdit} aria-label={t("edit_category")}>{t("change")}</button>}
        </div>}
        <div className="sec-body" {...(closed ? { inert: "" } : {})}>
          <div>
            <SortableContext items={items.map((r) => "r:" + r.id)} strategy={verticalListSortingStrategy}>
              {items.map((r) => <SortableRecipe key={r.id} r={r} />)}
            </SortableContext>
            {showHead && !items.length && <div className="drop-empty">{t("empty_category")}</div>}
          </div>
        </div>
      </div>
    </section>
  );
}

function SortableRecipe({ r }: { r: Recipe }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: "r:" + r.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }} className={`srt ${isDragging ? "dragging" : ""}`}>
      <button className="grip" {...attributes} {...listeners} aria-label={t("drag_handle", { name: r.name || t("unnamed_recipe") })}>⠿</button>
      <RecipeCard r={r} />
    </div>
  );
}
