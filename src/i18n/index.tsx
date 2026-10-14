import React, { createContext, useContext, useEffect, useState } from "react";
import { sv, type Dict, type Key } from "./sv";
import { en } from "./en";
import { de } from "./de";
import { fr } from "./fr";
import { es } from "./es";
import { bg } from "./bg";
import { uk } from "./uk";
import { ru } from "./ru";
import { fa } from "./fa";

export type { Key };
export type Lang = "sv" | "en" | "de" | "fr" | "es" | "bg" | "uk" | "ru" | "fa";
// flags are drawn with a flag-only emoji font (index.html), since Windows has no flag emojis of its own
export const LANGS: { code: Lang; name: string; flag: string }[] = [
  { code: "sv", name: "Svenska", flag: "🇸🇪" }, { code: "en", name: "English", flag: "🇬🇧" }, { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "fr", name: "Français", flag: "🇫🇷" }, { code: "es", name: "Español", flag: "🇪🇸" }, { code: "bg", name: "Български", flag: "🇧🇬" },
  { code: "uk", name: "Українська", flag: "🇺🇦" }, { code: "ru", name: "Русский", flag: "🇷🇺" }, { code: "fa", name: "فارسی", flag: "🇮🇷" },
];
const DICTS: Record<Lang, Dict> = { sv, en, de, fr, es, bg, uk, ru, fa };
// dates follow the language; Farsi keeps Latin digits and the Gregorian calendar so prices and dates match the rest of the app
const LOCALES: Record<Lang, string> = { sv: "sv-SE", en: "en-GB", de: "de-DE", fr: "fr-FR", es: "es-ES", bg: "bg-BG", uk: "uk-UA", ru: "ru-RU", fa: "fa-IR-u-nu-latn-ca-gregory" };
const RTL = new Set<Lang>(["fa"]);
const THREE_FORMS = new Set<Lang>(["ru", "uk"]);
const LS_LANG = "kompispris.lang";

function stored(): Lang {
  try { const l = localStorage.getItem(LS_LANG); if (l && l in DICTS) return l as Lang; } catch { /* ignore */ }
  return "sv";
}
let cur: Lang = stored();
function applyToPage(l: Lang) { document.documentElement.lang = l; document.documentElement.dir = RTL.has(l) ? "rtl" : "ltr"; }
applyToPage(cur);

export const lang = () => cur;
export const locale = () => LOCALES[cur];

/** translated text; {name} placeholders are filled from vars */
export function t(key: Key, vars?: Record<string, string | number>): string {
  const s = DICTS[cur][key] ?? sv[key];
  return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s;
}
/** plural: picks the right form of a "one|other" (or "one|few|many") key for n */
export function tp(key: Key, n: number, vars?: Record<string, string | number>): string {
  const forms = t(key, { n: n.toLocaleString("sv-SE"), ...vars }).split("|");
  const order = THREE_FORMS.has(cur) ? ["one", "few", "many"] : ["one", "other"];
  let i = order.indexOf(new Intl.PluralRules(LOCALES[cur]).select(n));
  if (i < 0) i = THREE_FORMS.has(cur) ? 1 : order.length - 1;
  return forms[Math.min(i, forms.length - 1)];
}
export const unitLabel = (u: string) => (("u_" + u) in sv ? t(("u_" + u) as Key) : u);
export const fmtDate = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleDateString(locale(), o);

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: cur, setLang: () => {} });
export const useLang = () => useContext(Ctx);

/** Changing language redraws everything below it, so every t() call picks up the new language. */
export function LangProvider({ children }: { children: React.ReactNode }) {
  const [l, setL] = useState<Lang>(cur);
  const setLang = (x: Lang) => { cur = x; try { localStorage.setItem(LS_LANG, x); } catch { /* ignore */ } setL(x); };
  useEffect(() => applyToPage(l), [l]);
  return <Ctx.Provider value={{ lang: l, setLang }}><React.Fragment key={l}>{children}</React.Fragment></Ctx.Provider>;
}
