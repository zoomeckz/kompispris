# KompisPris

Recept och matlistor som räknar ut vad det kostar att handla, med det billigaste från Willys, Hemköp, Coop, ICA (veckans erbjudanden) och Lidl (veckans erbjudanden), plus makron per portion.

## Hur det hänger ihop

- **Prisbiblioteket** (`products.json`) är den enda källan till priser. Appen läser det, den hämtar aldrig något från butikerna.
- **Scrapern** (`scraper/`) bygger ett nytt bibliotek från grunden och laddar upp det till Supabase Storage (`library/products.json`). Den körs i GitHub Actions (`.github/workflows/scrape.yml`) måndag och torsdag 04:00 UTC, och när en admin trycker på **Scrape** i appen. Det kostar inga Claude-tokens.
- **Supabase** sköter konton (e-post, Google, Facebook), recept, matlistor, inställningar, sökstatistik och admin-rollen.
- Om Storage ännu är tomt används kopian i `public/library/products.json`.

## Teknik

Vite, React, TypeScript, Tailwind, Supabase. Samma upplägg som Lovable använder.

```
src/lib/engine.ts        prismotorn: matchning, billigaste förpackning, erbjudanden, totaler
src/lib/format.ts        formatering, textexport, sammanslagning av recept i listor
src/hooks/useApp.tsx     bibliotek, konto, recept, listor, inställningar, statistik
src/pages/               Recept, Matlistor, Erbjudanden, Varor, Inställningar, Admin, Logga in
supabase/migrations/     databas, roller, regler, admin-statistik, lagring
supabase/functions/      trigger-scrape (startar GitHub-jobbet), delete-account
scraper/                 Python-skript för alla butiker + uppladdning
```

Kom igång lokalt: `npm install`, kopiera `.env.example` till `.env` och fyll i Supabase-uppgifterna, sedan `npm run dev`.

Inställningar som måste göras en gång finns i [SETUP.md](SETUP.md).

Lovable-projekt: https://lovable.dev/projects/b9cf8b15-95fb-4e3b-890c-86f9fb36686b · Live: https://kompispris.lovable.app
