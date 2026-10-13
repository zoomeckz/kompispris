"""Coop catalog scraper (Coop e-handel Stockholm, store 251300). Listing calls include nutrition."""
import json, time, urllib.request

K = "3becf0ce306f41a1ae94077c16798187"
U = "https://external.api.coop.se/personalization/search/entities/by-attribute?api-version=v1&store=251300&groups=CUSTOMER_PRIVATE&device=desktop&direct=false"
FOOD = {"21330": "Skafferi", "22410": "Dryck", "25854": "Frys", "6262": "Mejeri & Ägg",
        "24425": "Godis, Glass & Snacks", "24420": "Kryddor & Smaksättare", "11777": "Kött, Fågel & Chark",
        "16534": "Frukt & Grönsaker", "18121": "Bröd & Bageri", "6327": "Ost",
        "5377683": "Färdigmat & Mellanmål", "39033900": "Vegetariskt", "14754": "Fisk & Skaldjur",
        "48200": "Delikatesser"}


def post(body):
    for a in range(4):
        try:
            req = urllib.request.Request(U, data=json.dumps(body).encode(),
                                         headers={"ocp-apim-subscription-key": K, "Content-Type": "application/json"})
            return json.load(urllib.request.urlopen(req, timeout=60))
        except Exception as e:
            print("retry", e); time.sleep(3 * (a + 1))
    raise RuntimeError("failed")


out = {}
for code, name in FOOD.items():
    skip = 0
    while True:
        d = post({"attribute": {"name": "categoryIds", "value": code}, "resultsOptions": {"skip": skip, "take": 100}})
        items = d["results"]["items"]
        for it in items:
            it["_top"] = name
            out[it["id"]] = it
        skip += 100
        print(name, skip, d["results"]["count"], flush=True)
        if skip >= d["results"]["count"] or not items:
            break
        time.sleep(0.3)

json.dump(list(out.values()), open("raw_coop.json", "w"), ensure_ascii=False)
print("total", len(out))
