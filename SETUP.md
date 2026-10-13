# Engångsinställningar för KompisPris

Gör stegen i ordning. Allt som står inom citattecken är exakta namn på knappar och fält.

## 1. Databasen (Supabase)

Projektet använder Lovable Cloud-databasen `mcwnxlnvoochuqldoksu` (se `.env`).

Databasändringen ligger i `supabase/migrations/20261013120000_kompispris.sql`. Den rensar bort det gamla projektets tabeller (Melody Maestro) och skapar KompisPris tabeller, regler för vem som ser vad, admin-statistiken och lagringsplatsen `library` för prisbiblioteket.
1. Öppna projektet i Lovable. Om Lovable inte kör filen själv: be Lovable-chatten "kör migrationen supabase/migrations/20261013120000_kompispris.sql".
2. Har du tillgång till Supabase direkt: **SQL Editor** > "New query", klistra in hela filen och tryck "Run".
3. Filen går att köra flera gånger utan att något går sönder.
4. Gå till **Project Settings** > **API**. Spara "Project URL", "anon public"-nyckeln och "service_role"-nyckeln. Service_role-nyckeln är hemlig och ska bara in i GitHub (steg 5), aldrig i appens kod.

Appen läser `VITE_SUPABASE_URL` och `VITE_SUPABASE_PUBLISHABLE_KEY`. Lovable fyller i dem när Supabase är kopplat; annars lägg dem i `.env` (se `.env.example`).

## 2. Admin

Registrera dig i appen med **sam.nowroozi@gmail.com** (e-post, Google eller Facebook). Kontot blir admin automatiskt och fliken **Admin** visas bara för dig. Inget lösenord ligger i koden. Fler admins läggs till med en rad i tabellen `admin_emails` innan personen registrerar sig.

## 3. Inloggning med Google och Facebook

I Supabase: **Authentication** > **URL Configuration**
- "Site URL": appens adress (t.ex. din Lovable-adress eller egen domän).
- "Redirect URLs": lägg till samma adress.

Callback-adressen som Google och Facebook frågar efter är:
`https://mcwnxlnvoochuqldoksu.supabase.co/auth/v1/callback`

**Google**
1. https://console.cloud.google.com > "APIs & Services" > "Credentials" > "Create credentials" > "OAuth client ID" > typ "Web application".
2. Under "Authorized redirect URIs" lägg in callback-adressen ovan.
3. Kopiera "Client ID" och "Client secret" till Supabase: **Authentication** > **Providers** > **Google** > slå på och spara.

**Facebook**
1. https://developers.facebook.com > "My Apps" > "Create app" > välj att låta folk logga in med Facebook.
2. Under "Facebook Login" > "Settings" lägg in callback-adressen i "Valid OAuth Redirect URIs".
3. Kopiera "App ID" och "App secret" (under "App settings" > "Basic") till Supabase: **Authentication** > **Providers** > **Facebook** > slå på och spara.

E-postinloggning fungerar direkt. Under **Authentication** > **Providers** > **Email** kan du välja om nya konton måste bekräfta sin e-post.

## 4. Scrape-knappen (Supabase Edge Functions)

Funktionerna ligger i `supabase/functions/`: `trigger-scrape` (startar hämtningen) och `delete-account` (låter användare radera sitt konto).
Lovable driftsätter dem när Supabase är kopplat. Annars: `supabase functions deploy trigger-scrape` och `supabase functions deploy delete-account`.

Skapa en GitHub-nyckel som bara får starta jobbet:
1. https://github.com/settings/personal-access-tokens > "Generate new token" (fine-grained).
2. "Repository access": "Only select repositories" > `zoomeckz/kompispris`.
3. "Permissions" > "Repository permissions" > "Actions": "Read and write". Inget annat.

Lägg in i Supabase: **Edge Functions** > **Secrets**:
- `GITHUB_PAT` = nyckeln ovan
- `GITHUB_REPO` = `zoomeckz/kompispris`

## 5. Hämtningen (GitHub Actions)

På GitHub: repot > **Settings** > **Secrets and variables** > **Actions** > "New repository secret":
- `SUPABASE_URL` = "Project URL" från steg 1
- `SUPABASE_SERVICE_ROLE_KEY` = "service_role"-nyckeln från steg 1

Första hämtningen: repot > **Actions** > "Scrape prices" > "Run workflow". Eller tryck **Scrape** i appens Admin-flik. Det tar ungefär 30 till 45 minuter. Sedan körs den automatiskt måndag och torsdag 04:00 UTC (ändra i `.github/workflows/scrape.yml`).

Varje körning bygger biblioteket från grunden, laddar upp det och skriver resultatet i tabellen `scrape_runs` som visas i Admin.
