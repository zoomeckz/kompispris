"""Runs the whole KompisPris scrape in one go and checks the result.
Usage: python3 run_all.py            (full scrape, about 30 to 45 minutes)
       python3 run_all.py --build    (only rebuild products.json from files already here)
Writes progress to run_all.log and ends with one line starting with DONE or FAILED."""
import json, subprocess, sys, time, os
from collections import Counter

STEPS = [["coop.py"], ["axfood.py", "willys"], ["axfood.py", "hemkop"], ["chainpromo.py"], ["lidl.py"], ["ica.py"]]
OPTIONAL = {"ica.py", "lidl.py", "chainpromo.py"}  # the app works without these
log = open("run_all.log", "a", buffering=1)


def say(msg):
    line = time.strftime("%H:%M:%S ") + msg
    print(line, flush=True); log.write(line + "\n")


def run(step):
    say("start " + " ".join(step))
    t = time.time()
    with open("step_" + step[0].replace(".py", "") + (("_" + step[1]) if len(step) > 1 else "") + ".log", "w") as out:
        r = subprocess.run([sys.executable, *step], stdout=out, stderr=subprocess.STDOUT)
    say(f"end {' '.join(step)} code={r.returncode} {int(time.time() - t)}s")
    return r.returncode == 0


if "--build" not in sys.argv:
    # start from a clean slate so nothing old is reused
    for f in os.listdir("."):
        if f.startswith(("raw_coop", "list_", "detail_", "chainpromo_", "raw_lidl", "raw_ica")) and f.endswith(".json"):
            os.remove(f)
    for step in STEPS:
        if not run(step) and step[0] not in OPTIONAL:
            say(f"FAILED at {' '.join(step)}"); sys.exit(1)

if not run(["build.py"]):
    say("FAILED at build.py"); sys.exit(1)
d = json.load(open(os.environ.get("KP_OUT", "../products.json")))
c = Counter(r[0] for r in d["rows"])
problems = [f"{s} has {c.get(s, 0)} rows" for s in ("w", "h", "c") if c.get(s, 0) < 3000]
if len(d["rows"]) < 15000: problems.append(f"only {len(d['rows'])} rows")
if problems:
    say("FAILED sanity check: " + "; ".join(problems)); open("summary.txt", "w").write("Kontrollen misslyckades: " + "; ".join(problems)); sys.exit(1)
summary = f"Willys {c['w']}, Hemköp {c['h']}, Coop {c['c']} varor. Lidl {len(d['lidl'])} och ICA {len(d.get('ica', []))} erbjudanden. Data {d['updated']}."
open("summary.txt", "w").write(summary)
say("DONE " + summary)
