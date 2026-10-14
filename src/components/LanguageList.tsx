import { LANGS, Lang, useLang } from "@/i18n";
import { RowButton } from "./ui";

/** the languages with their flags; used in the header's language panel and in the settings */
export default function LanguageList({ onPick }: { onPick?: (l: Lang) => void }) {
  const { lang, setLang } = useLang();
  return (
    <div className="list">{LANGS.map((l) => (
      <RowButton key={l.code} className={`item langrow ${l.code === lang ? "on" : ""}`} onClick={() => { onPick?.(l.code); if (l.code !== lang) setLang(l.code); }}>
        <span className="flag" aria-hidden="true">{l.flag}</span>
        <div className="grow t"><bdi lang={l.code}>{l.name}</bdi></div>
        {l.code === lang && <span className="pill okp">✓</span>}
      </RowButton>))}</div>
  );
}
