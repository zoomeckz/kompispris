"""Livsmedelsverket food database: generic macros per 100 g (fallback for loose produce etc)."""
import json, time, urllib.request
from concurrent.futures import ThreadPoolExecutor

B = "https://dataportal.livsmedelsverket.se/livsmedel/api/v1"


def get(u):
    for a in range(4):
        try:
            return json.load(urllib.request.urlopen(u, timeout=60))
        except Exception:
            time.sleep(2 * (a + 1))


foods = get(f"{B}/livsmedel?offset=0&limit=3000&sprak=1")["livsmedel"]
print(len(foods))


def nut(f):
    d = get(f"{B}/livsmedel/{f['nummer']}/naringsvarden?sprak=1") or []
    m = {}
    for x in d:
        k = x.get("euroFIRkod")
        if k == "ENERC" and x.get("enhet") == "kcal": m["kcal"] = x["varde"]
        elif k == "PROT": m["p"] = x["varde"]
        elif k == "CHO": m["c"] = x["varde"]
        elif k == "FAT": m["f"] = x["varde"]
        elif k == "FIBT": m["fib"] = x["varde"]
    return {"n": f["namn"], "nr": f["nummer"], **m}


with ThreadPoolExecutor(4) as ex:
    out = list(ex.map(nut, foods))
json.dump(out, open("raw_slv.json", "w"), ensure_ascii=False)
print("done", len(out), out[:2])
