# Engångsinställningar för KompisPris

Gör stegen i ordning. Allt som står inom citattecken är exakta namn på knappar och fält.

## 1. Databasen och funktionerna (Lovable Cloud)

Projektet använder Lovable Cloud-databasen `mcwnxlnvoochuqldoksu` (se `.env`). Appen läser `VITE_SUPABASE_URL` och `VITE_SUPABASE_PUBLISHABLE_KEY`, som Lovable fyller i.

Databasändringen ligger i `supabase/migrations/20261013120000_kompispris.sql`. Den rensar bort det gamla projektets tabeller (Melody Maestro) och skapar KompisPris tabeller, regler för vem som ser vad, admin-statistiken och lagringsplatsen `library` för prisbiblioteket. Filen går att köra flera gånger utan att något går sönder.

Lovable kör inte migrationer eller driftsätter funktioner som kommer via GitHub av sig själv. Skriv i Lovable-chatten (kostar krediter, de fylls på varje dag):

> Run the migration supabase/migrations/20261013120000_kompispris.sql, deploy the edge functions publish-library, trigger-scrape and delete-account, and enable leaked password protection. Don't change any app code.

## 2. Admin

Registrera dig i appen med **sam.nowroozi@gmail.com** (e-post, Google eller Facebook). Kontot blir admin automatiskt och fliken **Admin** visas bara för dig. Fanns kontot redan när migrationen kördes blir det admin direkt. Inget lösenord ligger i koden. Fler admins läggs till med en rad i tabellen `admin_emails` innan personen registrerar sig.

## 3. Inloggning med Google och Facebook

Google sköts av Lovable Cloud och fungerar utan egen inställning.

Facebook har Lovable ingen färdig inloggning för. Knappen visar "Facebook-inloggning är inte aktiverad ännu" tills Facebook är inställt i databasens inloggningsinställningar (kräver åtkomst till Supabase-inställningarna). Vill du inte ha Facebook kan knappen tas bort.

## 4. Hämtningen av priser (GitHub Actions)

Inga hemligheter behövs. Arbetsflödet `.github/workflows/scrape.yml` bevisar för funktionen `publish-library` att det är just det här repots arbetsflöde på `main` (GitHub OIDC), och funktionen laddar upp biblioteket och skriver resultatet i `scrape_runs`.

Första hämtningen, efter steg 1: repot på GitHub > **Actions** > "Scrape prices" > "Run workflow". Det tar ungefär en och en halv timme. Sedan körs den automatiskt måndag och torsdag 04:00 UTC (ändra i `.github/workflows/scrape.yml`).

Varje körning bygger biblioteket från grunden, laddar upp det och skriver resultatet i tabellen `scrape_runs` som visas i Admin. Tills första körningen är klar använder appen kopian i `public/library/products.json`.

## 5. Scrape-knappen i Admin (valfritt)

Knappen startar samma arbetsflöde via funktionen `trigger-scrape`, som behöver en GitHub-nyckel:
1. https://github.com/settings/personal-access-tokens > "Generate new token" (fine-grained).
2. "Repository access": "Only select repositories" > `zoomeckz/kompispris`.
3. "Permissions" > "Repository permissions" > "Actions": "Read and write". Inget annat.

Lägg in den som hemligheten `GITHUB_PAT` i Lovable Cloud (be Lovable-chatten "add the secret GITHUB_PAT" så får du ett formulär). Utan den fungerar allt annat; starta då hämtningen från GitHub som i steg 4.
