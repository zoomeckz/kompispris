// Receives the scrape results from the GitHub Actions workflow "scrape.yml" and publishes them.
// The workflow proves who it is with a GitHub OIDC token, so no Supabase key has to be stored in GitHub;
// this function writes with the service role key that the edge runtime already has.
//   POST ?action=start[&run_id=..][&source=schedule|manual]   mark the run as running (creates a row if no run_id)
//   POST ?action=publish&run_id=..[&summary=..]  body: gzipped products.json   upload library + meta, mark done
//   POST ?action=fail&run_id=..[&summary=..]     mark the run as failed
// Optional secret: GITHUB_REPO (default "zoomeckz/kompispris").
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { createRemoteJWKSet, jwtVerify } from "https://esm.sh/jose@5.9.6";

const ISSUER = "https://token.actions.githubusercontent.com";
const AUDIENCE = "kompispris";
const jwks = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks`));
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const repo = Deno.env.get("GITHUB_REPO") ?? "zoomeckz/kompispris";

  // only the scrape workflow on main in this repo may publish
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  try {
    const { payload } = await jwtVerify(token, jwks, { issuer: ISSUER, audience: AUDIENCE });
    if (payload.repository !== repo || payload.ref !== "refs/heads/main" ||
        !String(payload.workflow_ref ?? "").startsWith(`${repo}/.github/workflows/scrape.yml@`)) {
      return json({ error: "Fel repo, gren eller arbetsflöde." }, 403);
    }
  } catch {
    return json({ error: "Ogiltig GitHub-token." }, 401);
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const q = new URL(req.url).searchParams;
  const action = q.get("action");
  const runId = q.get("run_id") || null;
  const summary = (q.get("summary") ?? "").slice(0, 500);
  const now = () => new Date().toISOString();
  const update = async (fields: Record<string, unknown>) => {
    if (!runId) return;
    const { error } = await admin.from("scrape_runs").update(fields).eq("id", runId);
    if (error) throw new Error(error.message);
  };

  try {
    if (action === "start") {
      if (runId) { await update({ status: "running", started_at: now() }); return json({ run_id: runId }); }
      const source = q.get("source") === "manual" ? "manual" : "schedule";
      const { data, error } = await admin.from("scrape_runs").insert({ status: "running", source, started_at: now() }).select("id").single();
      if (error) throw new Error(error.message);
      return json({ run_id: data.id });
    }

    if (action === "publish") {
      if (!req.body) return json({ error: "Tom fil." }, 400);
      const raw = new Uint8Array(await new Response(req.body.pipeThrough(new DecompressionStream("gzip"))).arrayBuffer());
      const d = JSON.parse(new TextDecoder().decode(raw));
      if (!Array.isArray(d.rows) || !d.updated) return json({ error: "products.json saknar rows eller updated." }, 400);
      const lib = admin.storage.from("library");
      const up1 = await lib.upload("products.json", raw, { upsert: true, contentType: "application/json", cacheControl: "300" });
      if (up1.error) throw new Error(up1.error.message);
      const meta = { version: String(Math.floor(Date.now() / 1000)), updated: d.updated, rows: d.rows.length, lidl: (d.lidl ?? []).length, ica: (d.ica ?? []).length };
      const up2 = await lib.upload("meta.json", new TextEncoder().encode(JSON.stringify(meta)), { upsert: true, contentType: "application/json", cacheControl: "30" });
      if (up2.error) throw new Error(up2.error.message);
      await update({ status: "done", finished_at: now(), summary: summary || `${meta.rows} varor` });
      return json({ ok: true, meta });
    }

    if (action === "fail") {
      await update({ status: "failed", finished_at: now(), summary: summary || "Okänt fel" });
      return json({ ok: true });
    }

    return json({ error: "Okänd action." }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
