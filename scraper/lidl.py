"""Lidl Sverige weekly offers (no full catalog online). Stockholm price region (Rosersberg)."""
import re, html, json, time, urllib.request

H = {"User-Agent": "Mozilla/5.0 (personal recipe app)"}


def get(u):
    return urllib.request.urlopen(urllib.request.Request(u, headers=H), timeout=60).read().decode("utf-8", "ignore")


home = get("https://www.lidl.se/")
pages = sorted(set(re.findall(r'href="(/c/[^"]+/a\d+)"', home)))
out = {}
for p in pages:
    try:
        s = get("https://www.lidl.se" + p)
    except Exception as e:
        print("fail", p, e); continue
    n = 0
    for m in re.findall(r'data-grid-data="([^"]*)"', s):
        try:
            x = json.loads(html.unescape(m))
        except Exception:
            continue
        if x.get("category") != "Food":
            continue
        rp = (x.get("regionsPrices") or {}).get("4") or {}
        cur = (rp.get("currentPrice") or {}).get("price") or x.get("price") or {}
        plus = (rp.get("currentLidlPlusPrice") or {}).get("price") or {}
        price = cur.get("price")
        plus_price = plus.get("price")
        if price is None and plus_price is None:
            continue
        kf = re.sub(r"<[^>]+>", " | ", html.unescape((x.get("keyfacts") or {}).get("description") or ""))
        kf = re.sub(r"\s*\|\s*(\|\s*)*", " | ", kf).strip(" |")
        bp = (cur.get("basePrice") or plus.get("basePrice") or {}).get("text", "")
        pk = cur.get("packaging") or plus.get("packaging") or {}
        out[x["productId"]] = {
            "id": x["productId"], "name": x.get("fullTitle"), "price": price, "plus": plus_price,
            "old": cur.get("oldPrice") or plus.get("oldPrice"), "unit": bp, "pack": pk.get("text") if isinstance(pk, dict) else "",
            "info": kf, "start": x.get("storeStartDate"), "end": x.get("storeEndDate"),
            "img": x.get("image"), "url": "https://www.lidl.se" + (x.get("canonicalUrl") or ""),
        }
        n += 1
    print(p, n, flush=True)
    time.sleep(0.5)
json.dump(list(out.values()), open("raw_lidl.json", "w"), ensure_ascii=False)
print("total", len(out))
