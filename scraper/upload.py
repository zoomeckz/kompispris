"""Publishes the price library to Supabase Storage and records the scrape run.
Usage:
  python3 upload.py start           mark the run as running (creates a row for scheduled runs)
  python3 upload.py publish FILE    upload FILE as library/products.json + meta.json, mark run done
  python3 upload.py fail "message"  mark run failed
Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RUN_ID (optional), RUN_SOURCE (manual|schedule)."""
import json, os, sys, time, urllib.request
from datetime import datetime, timezone

URL = os.environ["SUPABASE_URL"].rstrip("/")
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
H = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}
STATE = ".run_id"


def req(method, path, body=None, headers=None, raw=None):
    data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
    h = {**H, **({"Content-Type": "application/json"} if raw is None else {}), **(headers or {})}
    r = urllib.request.Request(URL + path, data=data, method=method, headers=h)
    with urllib.request.urlopen(r, timeout=120) as resp:
        t = resp.read().decode() or "null"
        return json.loads(t) if t.strip().startswith(("[", "{")) else t


def run_id():
    if os.environ.get("RUN_ID"): return os.environ["RUN_ID"]
    if os.path.exists(STATE): return open(STATE).read().strip()
    return None


def update(fields):
    rid = run_id()
    if rid: req("PATCH", f"/rest/v1/scrape_runs?id=eq.{rid}", fields, {"Prefer": "return=minimal"})


now = lambda: datetime.now(timezone.utc).isoformat()
cmd = sys.argv[1]
if cmd == "start":
    if run_id():
        update({"status": "running", "started_at": now()})
    else:
        rows = req("POST", "/rest/v1/scrape_runs", {"status": "running", "source": os.environ.get("RUN_SOURCE", "schedule"), "started_at": now()}, {"Prefer": "return=representation"})
        open(STATE, "w").write(rows[0]["id"])
    print("run", run_id())
elif cmd == "publish":
    path = sys.argv[2]
    d = json.load(open(path))
    raw = open(path, "rb").read()
    up = {"x-upsert": "true", "cache-control": "max-age=300", "Content-Type": "application/json"}
    req("POST", "/storage/v1/object/library/products.json", headers=up, raw=raw)
    version = str(int(time.time()))
    meta = {"version": version, "updated": d["updated"], "rows": len(d["rows"]), "lidl": len(d.get("lidl", [])), "ica": len(d.get("ica", []))}
    req("POST", "/storage/v1/object/library/meta.json", headers={**up, "cache-control": "max-age=30"}, raw=json.dumps(meta).encode())
    summary = open("summary.txt").read().strip() if os.path.exists("summary.txt") else f"{len(d['rows'])} varor"
    update({"status": "done", "finished_at": now(), "summary": summary[:500]})
    print("published", meta)
elif cmd == "fail":
    update({"status": "failed", "finished_at": now(), "summary": (sys.argv[2] if len(sys.argv) > 2 else "Okänt fel")[:500]})
    print("marked failed")
