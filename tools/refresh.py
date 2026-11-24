#!/usr/bin/env python3
"""Refresh data/events.json for mots.markobosko.org.

Sources (all public, no keys):
  1. evento.sh   - JSON feed of every Zagreb event; filtered by venue name/address/coordinates.
  2. Teatar Poco Loco - the "raspored" block on the home page; kept only if the venue is MOTS.
  3. Bacaci sjenki - WordPress posts; NEVER turned into events automatically (free text),
     only listed in data/candidates.json for a human to review.
  4. data/manual.json - hand-written events, overrides and suppressions. Always wins.

Run:  python3 tools/refresh.py          (writes data/auto.json, candidates.json, events.json)
      python3 tools/refresh.py --merge  (only re-merge manual.json + auto.json, no network)

A source that fails never deletes its previous data.
"""
import html
import json
import math
import re
import sys
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
UA = {"User-Agent": "mots-program-bot/1.0 (+https://mots.markobosko.org)"}

VENUE_RE = re.compile(r"ru[žz]djak|trnjanska savica|mjesni odbor trnjanska|\bmots\b|kino mots|scena mots|galerija mots", re.I)
VENUE_LAT, VENUE_LON = 45.78994, 15.99595  # Vladimira Ruždjaka 21 (from evento's own listing)
KEEP_PAST_DAYS = 400  # auto events older than this are dropped

MONTHS_HR = {m: i + 1 for i, m in enumerate(
    "siječnja veljače ožujka travnja svibnja lipnja srpnja kolovoza rujna listopada studenoga prosinca".split())}


def get(url, timeout=40):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", "replace")


def get_json(url):
    return json.loads(get(url))


def load(path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return default


def save(path, obj):
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def near_venue(lat, lon):
    if lat is None or lon is None:
        return False
    return math.hypot((lat - VENUE_LAT) * 111_000, (lon - VENUE_LON) * 77_000) < 200


def guess_category(title, evento_cat):
    t = (title or "").lower()
    if re.search(r"izložb|exhibition|otvorenje izložbe|postav", t): return "exhibition"
    if re.search(r"radionic|workshop|škola|tečaj", t): return "workshop"
    if re.search(r"projekcij|film|kino|screening", t): return "cinema"
    if re.search(r"predstav|kazali|lutk|teatar|theat", t): return "theater"
    if re.search(r"koncert|concert|live\b", t): return "music"
    return {"Predstava": "theater", "Film": "cinema", "Kino": "cinema", "Glazba": "music",
            "Obrazovanje": "workshop", "Umjetnost": "exhibition"}.get(evento_cat, "community")


def local_iso(s):
    """evento stamps wall-clock time with a 'Z'; it is Zagreb local time (checked against organiser sites)."""
    return s[:16] if s else None


# ---------------------------------------------------------------- evento
def from_evento():
    feed = get_json("https://api.evento.sh/api/events")["data"]
    out = []
    for e in feed:
        blob = " ".join(str(e.get(k) or "") for k in ("locationText",))
        if not (VENUE_RE.search(blob) or near_venue(e.get("latitude"), e.get("longitude"))):
            continue
        start, end = local_iso(e["dateFrom"]), local_iso(e.get("dateTo"))
        pmin, pmax = e.get("priceMin"), e.get("priceMax")
        if pmin == 0 or pmax == 0:
            adm = "Ulaz slobodan"
        elif pmin or pmax:
            adm = f"{pmin or pmax} €"
        else:
            adm = None
        out.append({
            "id": f"evento-{e['shareId']}",
            "title": (e["title"] or "").strip(),
            "start": start,
            "end": end if end and end != start else None,
            "time_confirmed": not start.endswith("T00:00"),
            "category": guess_category(e["title"], (e.get("category") or {}).get("name")),
            "organizer": ", ".join(e.get("hosts") or []) or None,
            "admission": adm,
            "registration_url": e.get("ticketsUrl"),
            "description": (e.get("description") or "").strip()[:600],
            "source_name": "evento.sh",
            "url": f"https://evento.sh/zagreb/{e['shareId']}",
            "origin_url": e.get("sourceUrl"),
        })
    return out


# ------------------------------------------------------------- Poco Loco
def from_pocoloco():
    page = get("https://teatarpocoloco.hr/")
    page = re.sub(r"<(script|style)[^>]*>.*?</\1>", "", page, flags=re.S)
    lines = [l.strip() for l in html.unescape(re.sub(r"<[^>]+>", "\n", page)).split("\n") if l.strip()]
    out = []
    rx = re.compile(r"(\d{1,2})\s+([a-zčćšžđ]+),\s*(\d{4})\s*//\s*(\d{1,2})[:.](\d{2})", re.I)
    for i, l in enumerate(lines):
        m = rx.search(l)
        if not m or m.group(2).lower() not in MONTHS_HR or i + 2 >= len(lines):
            continue
        place, title = lines[i + 1], lines[i + 2]
        if not VENUE_RE.search(place):
            continue
        d, mo, y = int(m.group(1)), MONTHS_HR[m.group(2).lower()], int(m.group(3))
        start = f"{y:04d}-{mo:02d}-{d:02d}T{int(m.group(4)):02d}:{m.group(5)}"
        out.append({
            "id": f"pocoloco-{start}-{re.sub(r'[^a-z0-9]+', '-', title.lower())[:30]}",
            "title": title, "start": start, "end": None, "time_confirmed": True,
            "category": "theater", "organizer": "Teatar Poco Loco", "admission": None,
            "registration_url": None, "description": "",
            "source_name": "teatarpocoloco.hr", "url": "https://teatarpocoloco.hr/",
        })
    return out


# --------------------------------------------------------- Bacaci sjenki
def candidates_bacaci():
    since = (date.today() - timedelta(days=120)).isoformat() + "T00:00:00"
    q = urllib.parse.urlencode({"after": since, "per_page": 50, "_fields": "date,link,title,content"})
    posts = get_json("https://bacaci-sjenki.hr/wp-json/wp/v2/posts?" + q)
    out = []
    for p in posts:
        text = html.unescape(re.sub(r"<[^>]+>", " ", p["content"]["rendered"]))
        if VENUE_RE.search(text):
            out.append({"posted": p["date"][:10], "title": html.unescape(p["title"]["rendered"]),
                        "url": p["link"], "source": "bacaci-sjenki.hr"})
    return out


# ----------------------------------------------------------------- merge
def merge():
    manual = load(DATA / "manual.json", {})
    auto = load(DATA / "auto.json", {"events": []})["events"]
    suppress = set(manual.get("suppress", []))
    overrides = manual.get("overrides", {})
    by_id = {}
    for e in auto:
        if e["id"] in suppress:
            continue
        e = {**e, **overrides.get(e["id"], {})}
        by_id[e["id"]] = e
    for e in manual.get("events", []):
        by_id[e["id"]] = e
    events = sorted(by_id.values(), key=lambda e: (e["start"], e["title"]))
    save(DATA / "events.json", {"generated": datetime.now().strftime("%Y-%m-%dT%H:%M"),
                                "venue": manual.get("venue", {}), "events": events})
    print(f"events.json: {len(events)} events")


def main():
    if "--merge" in sys.argv:
        return merge()
    prev = load(DATA / "auto.json", {"events": []})["events"]
    fresh, report = [], {}
    for name, fn in (("evento", from_evento), ("pocoloco", from_pocoloco)):
        try:
            got = fn()
            fresh += got
            report[name] = f"ok, {len(got)} at venue"
        except Exception as ex:  # keep going; old data for this source is retained below
            report[name] = f"FAILED ({ex.__class__.__name__}: {ex})"
            fresh += [e for e in prev if e["id"].startswith(name + "-")]
    # past auto events stay (archive) unless the feed re-sent them
    today = date.today().isoformat()
    seen = {e["id"] for e in fresh}
    cutoff = (date.today() - timedelta(days=KEEP_PAST_DAYS)).isoformat()
    fresh += [e for e in prev if e["id"] not in seen and cutoff <= e["start"][:10] < today]
    save(DATA / "auto.json", {"fetched": datetime.now().strftime("%Y-%m-%dT%H:%M"), "events": fresh, "report": report})
    try:
        cands = candidates_bacaci()
        save(DATA / "candidates.json", {"fetched": datetime.now().strftime("%Y-%m-%dT%H:%M"), "items": cands})
        report["bacaci-sjenki"] = f"ok, {len(cands)} posts mention venue (review data/candidates.json)"
    except Exception as ex:
        report["bacaci-sjenki"] = f"FAILED ({ex.__class__.__name__}: {ex})"
    for k, v in report.items():
        print(f"  {k}: {v}")
    merge()


if __name__ == "__main__":
    main()
