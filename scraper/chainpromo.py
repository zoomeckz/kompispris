"""Which Willys/Hemköp offers are chain-wide? Lists the same food categories without a selected store
(the chain's default prices) and saves the promotion price per product. An offer seen for the
Vällingby store but not here is treated as store-specific."""
import json, sys, time, urllib.request
from axfood_cats import FOOD

H = [("Accept", "application/json"), ("User-Agent", "Mozilla/5.0 (personal recipe app)")]
for chain in ("willys", "hemkop"):
    op = urllib.request.build_opener(); op.addheaders = H
    base = f"https://www.{chain}.se"; out = {}
    for cat in FOOD[chain]:
        page = 0
        while True:
            for a in range(4):
                try: d = json.load(op.open(f"{base}/c/{cat}?page={page}&size=100", timeout=60)); break
                except Exception: time.sleep(2 * (a + 1)); d = None
            if not d: break
            for r in d["results"]:
                pp = r.get("potentialPromotions") or []
                if pp: out[r["code"]] = (pp[0].get("price") or {}).get("value")
            page += 1
            if page >= d["pagination"]["numberOfPages"]: break
            time.sleep(0.2)
    json.dump(out, open(f"chainpromo_{chain}.json", "w"))
    print(chain, len(out), flush=True)
print("done")
