"""Publishes the price library through the publish-library edge function and records the scrape run.
Usage:
  python3 upload.py start           mark the run as running (creates a row for scheduled runs)
  python3 upload.py publish FILE    upload FILE as library/products.json + meta.json, mark run done
  python3 upload.py fail "message"  mark run failed
Runs inside GitHub Actions: it signs in with the workflow's GitHub OIDC token (needs `permissions: id-token: write`),
so no Supabase key is stored in GitHub.
Env: SUPABASE_URL, RUN_ID (optional), RUN_SOURCE (manual|schedule)."""
import gzip, json, os, sys, urllib.error, urllib.parse, urllib.request

URL = os.environ["SUPABASE_URL"].rstrip("/") + "/functions/v1/publish-library"
STATE = ".run_id"


def oidc_token():
    r = urllib.request.Request(os.environ["ACTIONS_ID_TOKEN_REQUEST_URL"] + "&audience=kompispris",
                               headers={"Authorization": "Bearer " + os.environ["ACTIONS_ID_TOKEN_REQUEST_TOKEN"]})
    with urllib.request.urlopen(r, timeout=30) as resp:
        return json.loads(resp.read())["value"]


def call(action, params=None, body=None):
    q = {"action": action, **{k: v for k, v in (params or {}).items() if v}}
    h = {"Authorization": "Bearer " + oidc_token()}
    if body is not None: h["Content-Type"] = "application/gzip"
    r = urllib.request.Request(URL + "?" + urllib.parse.urlencode(q), data=body if body is not None else b"", method="POST", headers=h)
    try:
        with urllib.request.urlopen(r, timeout=300) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        sys.exit(f"publish-library {action} failed: {e.code} {e.read().decode(errors='replace')}")


def run_id():
    if os.environ.get("RUN_ID"): return os.environ["RUN_ID"]
    if os.path.exists(STATE): return open(STATE).read().strip()
    return None


cmd = sys.argv[1]
if cmd == "start":
    res = call("start", {"run_id": run_id(), "source": os.environ.get("RUN_SOURCE", "schedule")})
    open(STATE, "w").write(res["run_id"])
    print("run", res["run_id"])
elif cmd == "publish":
    path = sys.argv[2]
    summary = open("summary.txt").read().strip() if os.path.exists("summary.txt") else ""
    res = call("publish", {"run_id": run_id(), "summary": summary[:500]}, gzip.compress(open(path, "rb").read()))
    print("published", res["meta"])
elif cmd == "fail":
    call("fail", {"run_id": run_id(), "summary": (sys.argv[2] if len(sys.argv) > 2 else "Okänt fel")[:500]})
    print("marked failed")
