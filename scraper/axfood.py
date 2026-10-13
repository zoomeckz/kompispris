"""Willys / Hemköp catalog scraper. Usage: python3 axfood.py willys|hemkop
Phase 1: list food categories. Phase 2: detail calls (nutrition) for EANs not already covered by Coop."""
import json, sys, time, os, urllib.request, http.cookiejar
from concurrent.futures import ThreadPoolExecutor

chain = sys.argv[1]
BASE = f"https://www.{chain}.se"
STORE = {"willys": "2345", "hemkop": "4273"}[chain]
from axfood_cats import FOOD as _FOOD
FOOD = _FOOD[chain]

cj = http.cookiejar.CookieJar()
op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
op.addheaders = [("Accept", "application/json"), ("User-Agent", "Mozilla/5.0 (personal recipe app)")]


def get(url, method="GET", headers=None):
    for a in range(5):
        try:
            req = urllib.request.Request(url, method=method, headers=headers or {})
            return json.load(op.open(req, timeout=60))
        except Exception as e:
            if getattr(e, "code", None) == 404:
                return None
            time.sleep(2 * (a + 1))
    return None


# activate Vällingby store in session
tok = get(BASE + "/axfood/rest/csrf-token")
get(f"{BASE}/axfood/rest/v2/store/activate?storeId={STORE}&activelySelected=true", "POST", {"X-CSRF-TOKEN": tok})
print("store", (get(BASE + "/axfood/rest/v2/store/active") or {}).get("name"), flush=True)

listfile = f"list_{chain}.json"
if os.path.exists(listfile):
    prods = json.load(open(listfile))
else:
    prods = {}
    for cat in FOOD:
        page = 0
        while True:
            d = get(f"{BASE}/c/{cat}?page={page}&size=100")
            if not d: break
            for r in d["results"]:
                r["_top"] = cat
                prods[r["code"]] = r
            page += 1
            print(cat, page, d["pagination"]["numberOfPages"], flush=True)
            if page >= d["pagination"]["numberOfPages"]: break
            time.sleep(0.2)
    json.dump(prods, open(listfile, "w"), ensure_ascii=False)
print("listed", len(prods), flush=True)

# phase 2: details only where Coop lacks nutrition for the same EAN
coop_eans = set()
if os.path.exists("raw_coop.json"):
    for it in json.load(open("raw_coop.json")):
        if it.get("nutrientLinks"):
            coop_eans.add(str(it.get("ean")).lstrip("0"))
other = f"detail_{'hemkop' if chain == 'willys' else 'willys'}.json"
other_eans = set()
if os.path.exists(other):
    other_eans = {str(v.get("ean", "")).lstrip("0") for v in json.load(open(other)).values() if v}

detfile = f"detail_{chain}.json"
det = json.load(open(detfile)) if os.path.exists(detfile) else {}
todo = []
for code, r in prods.items():
    if code in det: continue
    img = (r.get("image") or {}).get("url") or ""
    ean_guess = img.rsplit("/", 1)[-1].split("_")[0].lstrip("0")
    if ean_guess and (ean_guess in coop_eans or ean_guess in other_eans):
        continue
    todo.append(code)
print("details todo", len(todo), flush=True)


def fetch(code):
    d = get(f"{BASE}/axfood/rest/p/{code}")
    if not d: return code, None
    keep = {k: d.get(k) for k in ["ean", "nutrientHeaders", "breadCrumbs", "servingSize", "averageWeight"]}
    return code, keep


with ThreadPoolExecutor(5) as ex:
    for i, (code, v) in enumerate(ex.map(fetch, todo)):
        det[code] = v
        if i % 250 == 0:
            print("detail", i, len(todo), flush=True)
            json.dump(det, open(detfile, "w"), ensure_ascii=False)
json.dump(det, open(detfile, "w"), ensure_ascii=False)
print("done", len(det), flush=True)
