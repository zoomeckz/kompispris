// Starts the price scrape (GitHub Actions workflow "scrape.yml"). Admins only.
// Secrets (Lovable Cloud > Secrets): GITHUB_PAT (fine-grained token with Actions: read and write on the repo),
// optional GITHUB_REPO (default "zoomeckz/kompispris") and GITHUB_REF (default "main").
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const url = Deno.env.get("SUPABASE_URL")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const pat = Deno.env.get("GITHUB_PAT");
  const repo = Deno.env.get("GITHUB_REPO") ?? "zoomeckz/kompispris";
  const ref = Deno.env.get("GITHUB_REF") ?? "main";

  const auth = req.headers.get("Authorization") ?? "";
  const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: "Logga in först." }, 401);
  const admin = createClient(url, service);
  const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
  if (!isAdmin) return json({ error: "Bara admin kan starta en scrape." }, 403);
  if (!pat) return json({ error: "GITHUB_PAT saknas i Lovable Cloud-hemligheterna." }, 500);

  // one run at a time
  const { data: busy } = await admin.from("scrape_runs").select("id,created_at").in("status", ["queued", "running"])
    .gt("created_at", new Date(Date.now() - 2 * 3600e3).toISOString()).limit(1);
  if (busy && busy.length) return json({ error: "En scrape pågår redan.", run_id: busy[0].id }, 409);

  const { data: run, error } = await admin.from("scrape_runs").insert({ status: "queued", triggered_by: user.id, source: "manual" }).select().single();
  if (error) return json({ error: error.message }, 500);

  const gh = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/scrape.yml/dispatches`, {
    method: "POST",
    headers: { Authorization: `Bearer ${pat}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "kompispris" },
    body: JSON.stringify({ ref, inputs: { run_id: run.id } }),
  });
  if (!gh.ok) {
    const msg = await gh.text();
    await admin.from("scrape_runs").update({ status: "failed", summary: `GitHub svarade ${gh.status}: ${msg.slice(0, 300)}`, finished_at: new Date().toISOString() }).eq("id", run.id);
    return json({ error: `GitHub svarade ${gh.status}. Kontrollera GITHUB_PAT och GITHUB_REPO.` }, 502);
  }
  return json({ ok: true, run_id: run.id });
});
