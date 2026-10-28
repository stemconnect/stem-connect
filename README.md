# stem.connect

A student-built directory of STEM opportunities outside school: programs, competitions,
internships, volunteering, courses and certifications across Chicagoland, Illinois and the U.S.

## See it on your computer

From this folder, run:

```bash
python3 -m http.server 5174
```

Then open http://localhost:5174 in your browser.

## Files

| File | What it is |
| --- | --- |
| `index.html` | Page shell, fonts and share-preview tags |
| `styles.css` | All styling (the "lab notebook" look: paper, index cards, serif + mono type) |
| `app.js` | Pages: Home, All, Fields (each with what the work is like, a try-it ladder, crossovers and real teens), one tab per type (Internships, Programs, Competitions, Clubs, Volunteering, Courses, Certifications), Deadlines, Quiz and results, Dashboard, Suggest |
| `data.json` | **The database.** One listing per line, plus the field, type, place and cost labels |
| `explore.json` | Field pages: real jobs and their tasks (O*NET), smaller areas inside each field, crossovers, and real teen research stories (Science News Explores) |
| `facts.json` | Daily "Did you know?" facts, about 12 per field, each linked to a Science News Explores article. Loads after the page shows |
| `og.png` | Preview image when the link is shared |
| `research/verified-notes.md` | Notes from checking each official site, plus what was removed and why |

## How accuracy works

- Every `facts` line and every `dates` entry came from the program's official page (`url`)
  on the date in `CHECKED` (Oct 17, 2026).
- If an official site didn't state something (cost, age, deadline), it isn't listed. Cost shows
  as "Cost on site" instead of a guess.

Programs change every year. Before each semester, re-check every `url`, update `facts`
and `dates`, and bump `CHECKED`.

## Adding a listing

Use **Suggest a listing** on the site to generate an entry, then paste it as a new line inside
`OPPORTUNITIES` in `data.json` (keep the commas valid: every listing but the last ends in `,`).
Each listing has: `id, name, org, type, niches, scope, location, grades, cost, aid, season, url,
summary, facts, dates, tip`, plus two optional ones: `step` (to override the ladder
step) and `audience` (only if the official page limits who can join). Only include what the official page says. Add exact dates as
`{"label": "...", "date": "YYYY-MM-DD"}`.

After editing, change `V` at the top of `app.js` and every `?v=13` in `index.html` to a new
number so browsers load the update.

To have the Suggest form email submissions, set `SUBMIT_EMAIL` at the top of `app.js`.

## Deploying (Vercel, like Mosaic)

1. Push this folder to a GitHub repo.
2. On vercel.com: **Add New → Project**, import the repo, keep the defaults (Framework: Other).
3. Deploy. It's a static site with no build step.
4. In `index.html`, change `og:image` to the full address (for example
   `https://your-site.vercel.app/og.png`) so link previews show the image.

The site needs a web server (it loads `data.json` with `fetch`), so opening `index.html`
straight from your files won't work. Use the `python3` command above locally.

Optional later: run it through Vite to minify the files and give them hashed names, so
browsers can cache them for a long time.

## Daily facts

`facts.json` holds a pool of facts for each field. Each fact is taken from the linked
article's own summary. The home page shows one big fact each day (the arrows step
through the other fields), and each field page shows that field's fact. Facts rotate at
midnight, so a field with 14 facts repeats every 14 days. To add more, copy an entry and fill in
`fact`, `title`, `url` and `date`.

## Dashboard

Students bookmark listings to **My dashboard** and set a status (Interested, Applying,
Applied, Done). It's stored in the browser on that device, so it won't follow them to
another computer. Syncing across devices would need accounts and a database (for example
Supabase or Firebase).

## Finding your niche

The site runs a loop: **quiz → try something small → go one step up.**

- **Quiz** (`QUIZ` in `app.js`). It asks what students actually do (what they lose track of
  time doing, what they watch, which school units they liked, what they'd fix), how they
  like to work, and their limits (grade, distance, budget, free time). Each answer adds
  points to fields. The top 2–4 fields become their directions, and each direction shows
  the answers behind it as its reason. The quiz is saved on the device.
- **Try-it ladder.** Every listing has a step size: `try` (30 minutes, no application),
  `weekend`, `semester` or `summer`. `stepOf()` works it out from the type, and a listing
  can set `"step"` in `data.json` to override that. The database sorts easiest-first by
  default and can filter by step.
- **Directions and suggestions.** `directions()` ranks fields by quiz points.
  `suggestions()` picks listings in those directions that fit the student's limits and
  explains why ("You lose track of time building and fixing things, so here's a 30-minute
  start in Robotics."). When a student marks a saved listing **Done** on the dashboard,
  suggestions in that field move one step up the ladder ("You finished Autodesk Fusion for
  Students, so here's a weekend step in Robotics.").
- **Dashboard.** Saved listings with statuses (Interested, Applying, Applied, Done), a month calendar, and an "Add to my
  calendar" file (.ics) that sets reminders 3 days and 1 day before each date. A red dot
  on the dashboard button means a saved listing has a date in the next 7 days.

Listings tagged with `"audience"` (programs only for girls, as their official pages say)
show the tag, and they appear in suggestions only if the student says yes in the quiz.

### Where the field content comes from

- **Jobs and tasks** come from each job's page on O*NET OnLine (U.S. Department of
  Labor). The tasks are short plain-language versions of O*NET's listed tasks, and the
  education line is the job's Job Zone.
- **Real teens** are Science News Explores articles about high schoolers' research,
  mostly from Regeneron ISEF and STS coverage. Each blurb is a short retelling of the
  article's own summary.
- **Raw data** for both is in `research/onet-raw.json` and `research/stories-raw.json`.
  `research/build_explore.py` rebuilds `explore.json` from them
  (`python3 research/build_explore.py research`).
- **Subfield links** go to Science News Explores topic pages. Subfields with no matching
  topic page have no link.

## Clubs at Waubonsie Valley

18 STEM clubs at Waubonsie Valley are listings too (`"school": "wv"` in `data.json`). They
come from Mosaic's club data (saved in `research/mosaic-wv-clubs.json`, checked
Oct 27, 2026). Only what Mosaic says is listed: what the club does, when and where it meets,
and whether Mosaic lists spots as open or limited. Mosaic has no page per club, so each one
links to Mosaic's home page.

Outside listings that WV already has a club for have a `"wv"` field naming that club (for
example CyberPatriot → Cyberpatriot Team). The card and details panel say so, and the WV
club links back with `"partOf"`. Use the **Clubs at WV** checkbox in the Clubs tab to see
just these.

## Automatic link check and updates (every three days)

`.github/workflows/check-listings.yml` runs on GitHub every third day. It visits every
official link and posts the results in an issue called **Listings check**:

- **Broken links:** pages that didn't load.
- **Moved to a different site:** the link now goes to another website.
- **All dates have passed:** look up next year's dates.
- **Sites that block automatic checks:** these are usually fine.

Two hours later a scheduled Claude routine
(https://claude.ai/code/routines/trig_01B8pWmmWBm8dkbeJ3ZEphzy) reads that issue, fixes what
it flagged from each official site, removes programs that have ended, adds a few new verified
ones, and pushes to `main`. GitHub Pages and Vercel (https://stem-connect-beta.vercel.app/)
both redeploy from `main`. Listings it adds or edits get a `"checked"` date of their own.

**Turning it on.** The `.github` folder is hidden in Finder, so add the workflow through the
GitHub website instead: in your repo, click **Add file → Create new file**, name it
`.github/workflows/check-listings.yml`, paste in the contents of that file, and commit. To
run it right away, open the **Actions** tab, pick **Check listings** and click
**Run workflow**.
