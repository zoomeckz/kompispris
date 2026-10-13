"""ICA weekly offers (public store offer pages on ica.se) for stores near Vällingby.
ICA's online shop sits behind bot protection and is not collected."""
import re, json, time, urllib.request

STORES = {
    "ica-soderberga-1003669": "ICA Söderberga (Vällingby/Råcksta)",
    "ica-kvantum-akermyntan-1003997": "ICA Kvantum Åkermyntan (Hässelby)",
    "ica-supermarket-hasselby-torg-1004531": "ICA Supermarket Hässelby Torg",
    "ica-supermarket-brommaplan-1004577": "ICA Supermarket Brommaplan",
}
H = {"User-Agent": "Mozilla/5.0 (personal recipe app)"}


def page_state(slug):
    s = urllib.request.urlopen(urllib.request.Request(f"https://www.ica.se/erbjudanden/{slug}/", headers=H), timeout=60).read().decode("utf-8", "ignore")
    i = s.index("window.__INITIAL_DATA__")
    j = s.index("{", i)
    depth = 0; k = j; instr = False; esc = False
    while True:  # find matching brace
        c = s[k]
        if instr:
            if esc: esc = False
            elif c == "\\": esc = True
            elif c == '"': instr = False
        else:
            if c == '"': instr = True
            elif c == "{": depth += 1
            elif c == "}":
                depth -= 1
                if depth == 0: break
        k += 1
    raw = s[j:k + 1]
    raw = re.sub(r"(?<=[:\[,])\s*undefined\b", "null", raw)
    raw = re.sub(r"new (?:Map|Set)\(\[[^\]]*\]\)", "null", raw)
    raw = re.sub(r"new Date\(([^)]*)\)", r"\1", raw)
    raw = re.sub(r"(?<=[:\[,])\s*(?:NaN|-?Infinity)\b", "null", raw)
    return json.loads(raw)


def find_offers(o):
    if isinstance(o, dict):
        if "weeklyOffers" in o and isinstance(o["weeklyOffers"], list): return o["weeklyOffers"]
        for v in o.values():
            r = find_offers(v)
            if r is not None: return r
    elif isinstance(o, list):
        for v in o:
            r = find_offers(v)
            if r is not None: return r
    return None


if __name__ == "__main__":
    out = []
    for slug, name in STORES.items():
        try:
            st = page_state(slug)
        except Exception as e:
            print("fail", slug, e); continue
        offers = find_offers(st) or []
        for x in offers:
            x["_store"] = slug; x["_storeName"] = name
        out += offers
        print(name, len(offers), flush=True)
        time.sleep(1)
    json.dump(out, open("raw_ica.json", "w"), ensure_ascii=False)
    print("total", len(out))
