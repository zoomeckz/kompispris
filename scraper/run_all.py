"""Runs the whole KompisPris scrape in one go and checks the result.
Usage: python3 run_all.py            (full scrape, about an hour and a half)
       python3 run_all.py --build    (only rebuild products.json from files already here)
Writes progress to run_all.log and ends with one line starting with DONE or FAILED.
summary.txt gets one readable line (shown on the Admin page), also when something fails."""
import json, subprocess, sys, time, os
from collections import Counter

STEPS = [["coop.py"], ["axfood.py", "willys"], ["axfood.py", "hemkop"], ["chainpromo.py"], ["lidl.py"], ["ica.py"]]
OPTIONAL = {"ica.py", "lidl.py", "chainpromo.py"}  # the app works without these
NAMES = {"coop.py": "Coop", "willys": "Willys", "hemkop": "Hemköp", "chainpromo.py": "Willys/Hemköp-kampanjer", "lidl.py": "Lidl", "ica.py": "ICA", "build.py": "bygget av prisbiblioteket"}
# a store that does not answer gets more tries, after 2 and then 5 minutes (seconds; KP_RETRY_WAITS overrides it for tests)
WAITS = [int(x) for x in os.environ.get("KP_RETRY_WAITS", "120,300").split(",")]
log = open("run_all.log", "a", buffering=1, encoding="utf-8")


def say(msg):
    line = time.strftime("%H:%M:%S ") + msg
    print(line, flush=True); log.write(line + "\n")


def name(step):
    return NAMES.get(step[-1], NAMES.get(step[0], " ".join(step)))


def logfile(step):
    return "step_" + step[0].replace(".py", "") + (("_" + step[1]) if len(step) > 1 else "") + ".log"


def last_lines(step, n):
    try:
        lines = [l.rstrip() for l in open(logfile(step), encoding="utf-8", errors="replace") if l.strip()]
    except OSError:
        return []
    return lines[-n:]


def run_once(step):
    say("start " + " ".join(step))
    t = time.time()
    with open(logfile(step), "w") as out:
        r = subprocess.run([sys.executable, *step], stdout=out, stderr=subprocess.STDOUT)
    say(f"end {' '.join(step)} code={r.returncode} {int(time.time() - t)}s")
    return r.returncode == 0


def run(step, tries):
    """Runs a step, trying again after a pause. Each step writes to its own log file, which is gone after the
    GitHub run, so on failure the end of it is printed here, where the GitHub log keeps it.
    Returns None when the step worked, otherwise the last line of its output (usually the error)."""
    tail = []
    for attempt in range(tries):
        if run_once(step):
            return None
        tail = last_lines(step, 25)
        say(f"{name(step)} failed (attempt {attempt + 1} of {tries}); last lines of {logfile(step)}:")
        for l in tail:
            print("    " + l, flush=True)
        if attempt + 1 < tries:
            wait = WAITS[min(attempt, len(WAITS) - 1)]
            say(f"trying {name(step)} again in {wait // 60} min")
            time.sleep(wait)
    return (tail[-1] if tail else "ingen utskrift")[:200]


def fail(step, reason, tries):
    msg = f"{name(step)} gick inte att hämta" + (f" efter {tries} försök" if tries > 1 else "") + f": {reason}"
    open("summary.txt", "w", encoding="utf-8").write(msg)
    say("FAILED " + msg); sys.exit(1)


skipped = []
if "--build" not in sys.argv:
    # start from a clean slate so nothing old is reused
    for f in os.listdir("."):
        if f.startswith(("raw_coop", "list_", "detail_", "chainpromo_", "raw_lidl", "raw_ica")) and f.endswith(".json"):
            os.remove(f)
    for step in STEPS:
        optional = step[0] in OPTIONAL
        tries = 2 if optional else 3
        reason = run(step, tries)
        if reason is None:
            continue
        if not optional:
            fail(step, reason, tries)
        skipped.append(name(step))

reason = run(["build.py"], 1)
if reason is not None:
    fail(["build.py"], reason, 1)
d = json.load(open(os.environ.get("KP_OUT", "../products.json")))
c = Counter(r[0] for r in d["rows"])
problems = [f"{s} has {c.get(s, 0)} rows" for s in ("w", "h", "c") if c.get(s, 0) < 3000]
if len(d["rows"]) < 15000: problems.append(f"only {len(d['rows'])} rows")
if problems:
    say("FAILED sanity check: " + "; ".join(problems)); open("summary.txt", "w", encoding="utf-8").write("Kontrollen misslyckades: " + "; ".join(problems)); sys.exit(1)
summary = f"Willys {c['w']}, Hemköp {c['h']}, Coop {c['c']} varor. Lidl {len(d['lidl'])} och ICA {len(d.get('ica', []))} erbjudanden. Data {d['updated']}."
if skipped:
    summary += " Kunde inte hämtas den här gången: " + ", ".join(skipped) + "."
open("summary.txt", "w", encoding="utf-8").write(summary)
say("DONE " + summary)
