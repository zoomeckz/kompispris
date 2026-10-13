"""Normalize scraped data into one compact products.json for the app."""
import json, re, os, time
from datetime import datetime
from collections import Counter

CAT = {  # unified categories
    "kott": "Kött & fågel", "fisk": "Fisk & skaldjur", "mejeri": "Mejeri & ägg", "ost": "Ost",
    "frukt": "Frukt & grönt", "skafferi": "Skafferi", "krydd": "Kryddor & såser", "brod": "Bröd & bageri",
    "fryst": "Fryst", "veg": "Vegetariskt", "snacks": "Godis & snacks", "dryck": "Dryck", "fardig": "Färdigmat",
}
AX_CAT = {"kott-chark-och-fagel": "kott", "kott-fagel-och-chark": "kott", "frukt-och-gront": "frukt",
          "mejeri-ost-och-agg": "mejeri", "skafferi": "skafferi", "brod-och-kakor": "brod", "fryst": "fryst",
          "fisk-och-skaldjur": "fisk", "vegetariskt": "veg", "glass-godis-och-snacks": "snacks",
          "godis-snacks-och-glass": "snacks", "dryck": "dryck", "fardigmat": "fardig", "delikatessen": "fardig"}
COOP_CAT = {"Skafferi": "skafferi", "Dryck": "dryck", "Frys": "fryst", "Mejeri & Ägg": "mejeri",
            "Godis, Glass & Snacks": "snacks", "Kryddor & Smaksättare": "krydd", "Kött, Fågel & Chark": "kott",
            "Frukt & Grönsaker": "frukt", "Bröd & Bageri": "brod", "Ost": "ost", "Färdigmat & Mellanmål": "fardig",
            "Vegetariskt": "veg", "Fisk & Skaldjur": "fisk", "Delikatesser": "fardig"}


def fnum(s):
    if s is None: return None
    if isinstance(s, (int, float)): return float(s)
    m = re.search(r"-?\d+(?:[.,]\d+)?", str(s).replace("\xa0", ""))
    return float(m.group(0).replace(",", ".")) if m else None


def ean_norm(e):
    return str(e or "").strip().lstrip("0")


# ---------- macros by EAN from all sources ----------
macros = {}  # ean -> (kcal,p,c,f)


def ax_macros(det):
    for h in (det or {}).get("nutrientHeaders") or []:
        if str(h.get("nutrientBasisQuantity")) not in ("100", "100.0"): continue
        m = {}
        for x in h.get("nutrientDetails") or []:
            t = (x.get("nutrientTypeCode") or "").lower(); u = (x.get("measurementUnitCode") or "").lower()
            v = fnum(x.get("quantityContained"))
            if v is None: continue
            if t == "energi" and u.startswith("kilokalori"): m["kcal"] = v
            elif t == "energi" and u.startswith("kilojoule") and "kj" not in m: m["kj"] = v
            elif t == "protein": m["p"] = v
            elif t.startswith("kolhydrat"): m["c"] = v
            elif t == "fett": m["f"] = v
        if "kcal" not in m and "kj" in m: m["kcal"] = round(m["kj"] / 4.184)
        if all(k in m for k in ("kcal", "p", "c", "f")):
            return (m["kcal"], m["p"], m["c"], m["f"])
    return None


def coop_macros(it):
    m = {}
    for x in it.get("nutrientLinks") or []:
        d = (x.get("description") or "").lower(); u = (x.get("unit") or "").lower()
        v = fnum((x.get("amount") or [None])[0])
        if v is None: continue
        if d == "energi" and u.startswith("kilokalori"): m["kcal"] = v
        elif d == "energi" and u.startswith("kilojoule"): m["kj"] = v
        elif d == "protein": m["p"] = v
        elif d.startswith("kolhydrat"): m["c"] = v
        elif d == "fett": m["f"] = v
    if "kcal" not in m and "kj" in m: m["kcal"] = round(m["kj"] / 4.184)
    if all(k in m for k in ("kcal", "p", "c", "f")):
        return (m["kcal"], m["p"], m["c"], m["f"])
    return None


coop = json.load(open("raw_coop.json"))
for it in coop:
    mm = coop_macros(it)
    if mm: macros.setdefault(ean_norm(it.get("ean")), mm)
ax_det = {}
for ch in ("willys", "hemkop"):
    if os.path.exists(f"detail_{ch}.json"):
        ax_det[ch] = json.load(open(f"detail_{ch}.json"))
        for code, d in ax_det[ch].items():
            mm = ax_macros(d)
            if mm and d.get("ean"): macros.setdefault(ean_norm(d["ean"]), mm)

rows = []


def add(s, pid, name, brand, size, price, punit, cmp, cunit, ean, cat, offer, offer_txt, member, grams, oend=None, store_only=None):
    mm = macros.get(ean_norm(ean))
    rows.append([s, pid, name, brand or "", size or "", round(price, 2) if price else None, punit,
                 round(cmp, 2) if cmp else None, cunit, ean_norm(ean), cat,
                 list(mm) if mm else None,
                 round(offer, 2) if offer else None, offer_txt or "", 1 if member else 0,
                 round(grams) if grams else None, int(oend) if offer and oend else None,
                 (1 if store_only else 0) if offer and store_only is not None else None])


# ---------- Willys / Hemköp ----------
for ch, s in (("willys", "w"), ("hemkop", "h")):
    lst = json.load(open(f"list_{ch}.json"))
    chainp = json.load(open(f"chainpromo_{ch}.json")) if os.path.exists(f"chainpromo_{ch}.json") else None
    det = ax_det.get(ch, {})
    for code, r in lst.items():
        img = (r.get("image") or {}).get("url") or ""
        ean = (det.get(code) or {}).get("ean") or img.rsplit("/", 1)[-1].split("_")[0]
        if not re.fullmatch(r"\d{8,14}", ean or ""): ean = ""
        price = r.get("priceValue")
        punit = "kg" if r.get("priceUnit") == "kr/kg" else "st"
        cmp = fnum(r.get("comparePrice")); cu = r.get("comparePriceUnit") or ""
        cu = {"kg": "kg", "l": "l", "st": "st"}.get(cu, "")
        grams = None
        if punit == "st" and cmp and cu in ("kg", "l") and price:
            grams = price / cmp * 1000
        elif punit == "kg":
            grams = (r.get("averageWeight") or 0) * 1000 or None
        offer = offer_txt = None; member = False; oend = None
        for p in r.get("potentialPromotions") or []:
            v = (p.get("price") or {}).get("value")
            if v and price and v < price:
                offer = v
                q = p.get("qualifyingCount")
                offer_txt = (f"{q} för {fnum(p.get('rewardLabel')):.2f}".replace(".", ",") if q and q > 1 and p.get('rewardLabel') else (p.get("rewardLabel") or p["price"].get("formattedValue")))
                if p.get("redeemLimitLabel"): offer_txt += f" ({p['redeemLimitLabel']})"
                member = p.get("campaignType") == "LOYALTY"
                oend = (p.get("validUntil") or 0) / 1000 or None
                break
        add(s, code, r.get("name"), r.get("manufacturer"), r.get("displayVolume"), price, punit, cmp, cu,
            ean, AX_CAT.get(r["_top"], "skafferi"), offer, offer_txt, member, grams, oend,
            None if chainp is None or not offer else (code not in chainp or abs((chainp.get(code) or 0) - offer) > 0.01))

# ---------- Coop ----------
for it in coop:
    sp = (it.get("salesPriceData") or {}).get("b2cPrice")
    if not sp: continue
    weight = it.get("salesUnit") == "Vikt"
    cmp = (it.get("comparativePriceData") or {}).get("b2cPrice")
    cu = {"kg": "kg", "liter": "l", "styck": "st"}.get((it.get("comparativePriceUnit") or {}).get("unit"), "")
    ps, pu = it.get("packageSize"), (it.get("packageSizeUnit") or "").lower()
    grams = None
    if ps:
        if pu.startswith("gram") or pu in ("gr", "grm", "milliliter", "ml"): grams = ps
        elif pu in ("kg", "kilogram", "l", "ltr", "liter"): grams = ps * 1000
        elif pu == "cl": grams = ps * 10
    if not grams and not weight and cmp and cu in ("kg", "l"): grams = sp / cmp * 1000
    size = it.get("packageSizeInformation") or ""
    offer = offer_txt = None; member = False; oend = None
    for p in it.get("onlinePromotions") or []:
        tot = (p.get("priceData") or {}).get("b2cPrice"); n = p.get("numberOfProductRequired") or 1
        if tot and tot / n < sp:
            offer = tot / n; offer_txt = p.get("message", "").split("-", 1)[-1].strip() or f"{n} för {tot}"
            member = bool(p.get("medMeraRequired"))
            try: oend = datetime.fromisoformat(p["endDate"].replace("Z", "+00:00")).timestamp()
            except Exception: oend = None
            break
    add("c", it["id"], it.get("name"), it.get("manufacturerName"), size, sp, "kg" if weight else "st", cmp, cu,
        it.get("ean"), COOP_CAT.get(it["_top"], "skafferi"), offer, offer_txt, member, grams, oend)

# ---------- Lidl offers ----------
lidl = []
if os.path.exists("raw_lidl.json"):
    for x in json.load(open("raw_lidl.json")):
        if re.search(r"hund|katt|djur|blomm", (x["name"] or "").lower()): continue
        price = x["price"] if x["price"] is not None else x["plus"]
        cmp = fnum(x["unit"]); cu = "kg" if "/kg" in (x["unit"] or "") else ("l" if "/l" in (x["unit"] or "") else "")
        lidl.append({"id": x["id"], "n": x["name"], "p": price, "plus": x["plus"] if x["price"] is not None else None,
                     "old": x["old"], "cmp": cmp, "cu": cu, "pack": x["pack"] or "", "info": x["info"],
                     "end": x["end"], "url": x["url"], "kgpriced": (x["unit"] or "").strip() in ("/kg",)})

# ---------- ICA weekly offers (public store pages) ----------
ica = []
NONFOOD = {"Hem & fritid", "Hälsa & skönhet"}
if os.path.exists("raw_ica.json"):
    for x in json.load(open("raw_ica.json")):
        if (x.get("category") or {}).get("articleGroupName") in NONFOOD: continue
        pm = x.get("parsedMechanics") or {}; d = x.get("details") or {}
        try:
            val = float((pm.get("value2") or "0") + "." + (pm.get("value3") or "0"))
        except ValueError:
            continue
        if not val: continue
        q = pm.get("quantity") or 1
        perkg = "/kg" in (pm.get("value4") or "") or "kr/kg" in (d.get("mechanicInfo") or "")
        st = (x.get("stores") or [{}])[0]
        reg = fnum(st.get("regularPrice"))
        tr = x.get("traits") or []
        try: end = datetime.fromisoformat(x["validTo"]).timestamp()
        except Exception: end = None
        eans = [ean_norm(e.get("id")) for e in (x.get("eans") or []) if e.get("id")]
        mm = next((macros[e] for e in eans if e in macros), None)
        cmpv = fnum((x.get("comparisonPrice") or "").replace(":", ",")); unitv = val / (q if q > 1 else 1)
        g = None
        if not perkg and cmpv and re.search(r"/(kg|l)\b", x.get("comparisonPrice") or ""): g = round(unitv / cmpv * 1000)
        ica.append({"g": g, "id": x["_store"].rsplit("-", 1)[-1] + ":" + str(x["id"]), "n": d.get("name"), "b": (d.get("brand") or "").strip(" ,.;"),
                    "pack": (d.get("packageInformation") or "").strip(" ,.;"), "mech": d.get("mechanicInfo") or "", "unit": round(val / (q if q > 1 else 1), 2),
                    "qty": q if q > 1 else 1, "kg": perkg, "reg": reg, "cmp": x.get("comparisonPrice") or "",
                    "member": bool({"Stammis", "Klipp", "Superklipp"} & set(tr)), "end": end, "store": x["_storeName"],
                    "eans": eans[:5], "m": list(mm) if mm else None, "cat": (x.get("category") or {}).get("articleGroupName") or ""})

# ---------- Livsmedelsverket fallback ----------
slv = []
if os.path.exists("raw_slv.json"):
    for x in json.load(open("raw_slv.json")):
        if all(k in x for k in ("kcal", "p", "c", "f")):
            slv.append([x["n"], x["kcal"], x["p"], x["c"], x["f"]])

out = {"v": 1, "updated": time.strftime("%Y-%m-%d"),
       "stores": {"w": "Willys Vällingby", "h": "Hemköp Vällingby C", "c": "Coop (e-handel Stockholm)"},
       "cats": CAT,
       "cols": ["s", "id", "n", "b", "sz", "p", "pu", "cp", "cu", "e", "cat", "m", "o", "ot", "om", "g", "oe", "os"],
       "rows": rows, "lidl": lidl, "ica": ica, "slv": slv}
OUT = os.environ.get("KP_OUT", "../products.json")
json.dump(out, open(OUT, "w"), ensure_ascii=False, separators=(",", ":"))
c = Counter(r[0] for r in rows); cm = Counter(r[0] for r in rows if r[11])
print("rows", len(rows), dict(c), "with macros", dict(cm), "lidl", len(lidl), "ica", len(ica), "slv", len(slv))
print("size MB", os.path.getsize(OUT) / 1e6)
