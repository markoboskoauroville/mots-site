# mots.markobosko.org

Monthly program of **MOTS – Galerija, Scena, Kino, Društveni centar** (Mjesni odbor Trnjanska Savica, Ulica Vladimira Ruždjaka 21, Zagreb).
Static site: no build step, no framework, no tracking. Croatian by default, English toggle.

## How it stays current without anyone touching it

| Layer | What happens |
|---|---|
| **Month to month** | `app.js` opens the current month from the visitor's date (Europe/Zagreb), so the calendar turns over by itself. Prev/next arrows and `#2026-12` links reach any month; "Sljedećih 30 dana" gives a rolling view. |
| **Data** | `tools/refresh.py` (stdlib only) runs daily in `.github/workflows/refresh.yml`, rewrites `data/events.json` and deploys. |
| **Sources** | evento.sh JSON feed filtered to the venue (name, address or ≤200 m from it); Teatar Poco Loco schedule kept only when the venue is MOTS. Bacači sjenki posts that mention the venue go to `data/candidates.json` for review; they are free text, so they are never turned into events automatically. |
| **Your edits** | `data/manual.json` always wins: add `events`, patch an auto event with `overrides`, hide one with `suppress`. |

An empty month shows an honest "no confirmed program yet" message, not filler. Missing time or registration is shown as unconfirmed.

## Run / edit

```
python3 -m http.server 8000        # then open http://localhost:8000
python3 tools/refresh.py           # pull sources, rebuild data/events.json
python3 tools/refresh.py --merge   # only re-merge manual.json + auto.json (offline)
```

Event fields: `id, title, start ("YYYY-MM-DD" or "YYYY-MM-DDTHH:MM", Zagreb wall-clock), end, time_confirmed, category (cinema|exhibition|theater|workshop|community|music), organizer, admission, registration_url, description, notes, source_name, url`.

## Going live at mots.markobosko.org

1. Make this folder the root of its own GitHub repo (the workflow and `CNAME` expect that), default branch `main`.
2. Settings → Pages → Source: **GitHub Actions**; custom domain `mots.markobosko.org`; enforce HTTPS.
3. DNS at the `markobosko.org` registrar: `CNAME  mots  →  <github-user>.github.io`.

## Manual routine (the parts no feed covers)

- **July:** copy the Trnjanska Savica day program from `kvartovikulture.hr` (Zagrebački kvartovi kulture) into `manual.json`.
- **When `candidates.json` grows:** open the post, add the event to `manual.json` with its real dates.
- kinoholik.hr does not list MOTS as a screening venue as of 2026-11-24; re-check each season.
