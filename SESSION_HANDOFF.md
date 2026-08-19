# Session Handoff — Job Search MCP Servers + Pratik's Job Hunt

Written because this Claude Code session got very long and is being closed in favor of a
fresh one. Read this whole file before doing anything else in the new session.

## Who this is for

**Pratik Patidar** — Frontend Engineer, Indore, India. ~1.5 years experience (crossing
~2 years within days of this handoff — resume should still say "1.5" until he confirms
he's actually crossed it, per his explicit instruction).

**Current job**: Frontend Engineer at Techstuff Private Limited, on **Mercanis**, a B2B
SaaS platform for **enterprise procurement and supplier management** (NOT garment
manufacturing — that was an early wrong guess that got corrected; double-check nothing
still says "garment" anywhere before sending).

**Stack**: React.js, Next.js (App Router), TypeScript, JavaScript (ES6+), SvelteKit
(secondary), Tailwind CSS, Redux, Context API, REST APIs, JWT, basic NestJS (backend
support only, not a primary skill — don't oversell this), MongoDB (from one personal
project). Contact: pratikpatidar7990@gmail.com, +91-8269647990. Portfolio, GitHub, and
LinkedIn links are in the resumes (see below).

## The exact job search spec (do not deviate without asking)

- **Titles to search**: Frontend Developer, Frontend Engineer, React Developer,
  React.js Developer, UI Developer, UI Engineer, Web Developer, JavaScript Developer,
  Next.js Developer, MERN Stack Developer (MERN counts — it's React-based).
- **Experience**: 0–2 years only. Hard-exclude Senior/Lead/Staff/Principal/Architect/
  Manager/Director in title OR description. Exclude anything whose JD explicitly states
  3+ years required. He'll be ~2 years very soon, so mid-level roles asking ~2 years are
  fine; roles wanting 3+ are not.
- **Location priority, exact order**: 1. Indore, 2. Remote (India), 3. Jaipur,
  4. Ahmedabad, 5. Bhopal, then 6. rest of India (Bengaluru, Pune, Chennai, Delhi NCR,
  Hyderabad, Mumbai, etc.) as lower-priority overflow.
- **Freshness**: posted within ~90 days, unless actively reposted (some sources track a
  `reposted`/`date_reposted` field — use that when present instead of original post date).
- **Internships**: always excluded, no exceptions.
- **No ATS match scoring, no priority-star rating system.** This was tried twice (once by
  me, once by another session) and explicitly rejected by Pratik both times as "time
  wasting." Do not rebuild it. Just show real roles with real dates/experience info, plain
  city-grouped list, no gamified scoring layer.

## Repo state

`D:/adi/mcp`, GitHub remote `nakme12/job-search-mcp-servers`. Two branches:

- **`main`** — the clean, working branch. This is what should be used going forward.
- **`feature/job-tracker`** — an experimental branch (built partly by a *different*
  Claude Code session while this one was disconnected) that added a SQLite-backed job
  tracker, a dashboard, and automation scripts (`scripts/search-and-import.js`,
  `scripts/build-dashboard.js`, etc.). **This whole feature was rejected** — both for the
  ATS-scoring reason above, and because `scripts/search-and-import.js` had a real bug:
  its `huntyourtribe` search call passed no role/department/skills filter at all, so it
  returned unrelated jobs (a civil engineering posting showed up). If anyone suggests
  resurrecting that branch's dashboard/tracker, the answer is no — already decided against
  twice. The branch is left alone (not deleted) in case anything else in it is useful
  later, but nothing from it should be built on by default.

**Two files WERE worth keeping** and were manually copied from `feature/job-tracker`
into `main`'s working tree, **staged but not committed** (this session was asked to
apply-but-not-push):
- `smartrecruiters-jobs-server.js` — actually built by *this* session earlier, just never
  got committed before the branch got created. Already tested live against Nagarro's
  SmartRecruiters board — works.
- `workable-jobs-server.js` — built by the other session. Follows the same conventions
  (imports `experience-filter.js`/`freshness-filter.js` correctly) but **has not been
  live-tested** — every company slug tried earlier (Razorpay, Freshworks, Postman, Deel,
  Stripe, Notion) returned 0 jobs via Workable's widget API, so it's unverified whether
  the endpoint/shape this server assumes is actually correct. Test it against a real
  company with live Workable postings before trusting its output.
- `package.json` also got a `workable-jobs` npm script line added to match.

**Next step on this**: verify `smartrecruiters-jobs-server.js` and
`workable-jobs-server.js` still work (register with `claude mcp add`, live-test), then
commit+push to `main` once Pratik gives the go-ahead (he said not to push yet).

## The 16 MCP servers (all in `D:/adi/mcp`, one file each, `<name>-jobs-server.js`)

**No key needed**: huntyourtribe, ashby, greenhouse, lever, remotive, themuse, remoteok,
jobicy, workable\* (\*unverified, see above).

**Key required** (keys are in `D:/adi/mcp/.env`, gitignored — read that file for actual
values, don't ask Pratik to repeat them):
- `adzuna-jobs` — `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`
- `jobspipe-jobs` — `JOBSPIPE_API_KEY` (100 credits/month)
- `hirebase-jobs` — `HIREBASE_API_KEY` (10 calls/**day**, tightest limit, spend carefully)
- `theirstack-jobs` — `THEIRSTACK_API_KEY` (200 credits/month)
- `google-jobs` — `SERPAPI_API_KEY` (250 searches/month; historically the single best
  source for Indore/Jaipur/Bhopal/Ahmedabad specifically — use this one generously)
- `career-site-jobs` — `APIFY_API_TOKEN` (**paid**, ~$4/1000 jobs, keep `limit` low)
- `smartrecruiters-jobs` — single-company lookup only (needs a company's SmartRecruiters
  identifier, e.g. `Nagarro1`), not a broad city search tool

All registered via `claude mcp add -s user <name> -- node "D:/adi/mcp/<name>-server.js"`.
If a new session doesn't see them in its tool list, they may need re-registering — check
`claude mcp list` first.

### Shared filter modules — READ THESE, they're the actual core logic

- **`experience-filter.js`** — exports `evaluateExperience()`. Every server imports this.
  Regex-scans title+description for explicit year mentions ("3+ years", "minimum 3
  years", etc.) and seniority words, AND cross-checks whatever structured
  seniority/YOE field the source API provides (if any) — trusts whichever signal is
  stricter. This exists because source-provided labels have been proven wrong before
  (HireBase once labelled a 3–5yr role "Junior/Associate"). Default params on every tool:
  `maxYearsExperience: 2`, `excludeSeniorTitles: true`.
- **`freshness-filter.js`** — exports `evaluateFreshness()`. Same pattern, for
  internships (title/employment-type regex) and posting age (parses either absolute
  dates, unix-ms timestamps, or Google Jobs' relative strings like "3 weeks ago"). Default
  params: `excludeInternships: true`, `maxAgeDays: 90`.
- Every server's response includes `filtered_out_count` and per-job
  `detected_min_years_experience`/`looks_senior`/`is_internship`/`age_days` fields for
  transparency.

### ⚠️ Important gotcha discovered this session — MCP servers don't hot-reload

If you edit any `*-server.js` file, **the already-running process keeps serving the old
code** until it's restarted. Editing the file on disk does nothing to a live session by
itself. This caused a real bug earlier: a "fresh" search ran through stale servers and a
senior/over-experienced role slipped through completely unfiltered, because the process
serving that tool call predated the filter fixes.

If this happens again: the only clean fix is to fully restart/reload the Claude Code
session so MCP servers reconnect fresh. **Do NOT try to kill node processes by matching
on `-server.js` or similarly loose patterns** — that pattern also matched and killed an
unrelated Next.js dev server for Pratik's other project (`D:/adi/payroll/frontend`),
which had to be restarted. If a targeted kill is ever needed, filter specifically on
`adi\\mcp\\` in the command line, verify the exact PID list before killing anything, and
never touch processes from other project directories.

## Resumes (3 PDFs, in `C:/Users/Dell/Downloads/`)

- `Pratik Patidar Resume - Frontend Engineer.pdf` — the default, use for ~85% of roles.
- `Pratik Patidar Resume - MERN Full Stack.pdf` — for MERN/full-stack-titled roles.
- `Pratik Patidar Resume - React Developer.pdf` — for roles literally titled "React
  Developer".

All three are one page, all three source from the same underlying facts, just reframed
(title line, summary opening, skills order differ; Experience/Projects content is
identical). Source HTML files: `resume.html`, `resume_mern.html`, `resume_react.html` in
the scratchpad directory (see below — these may not survive into a new session's
scratchpad; if they're gone, the PDFs in Downloads are the source of truth for content,
rebuild HTML from those if further edits are needed).

**Content facts locked in after heavy review** (an "ultra-strict hiring panel" prompt
was run against this resume twice — don't re-run that review a third time, it's been
through two full passes already and further edits risk making it read more AI-generated,
not less):
- Mercanis described as "B2B SaaS platform for enterprise procurement and supplier
  management" — confirmed correct domain.
- EduMiracle project: labelled "Independent Project" (not "Personal Project" and not
  "client project") — it's real work built around a real coaching institute's workflow
  but was NOT a paid/formal client engagement. Links to https://edumiracle.vercel.app
  (verified live, 200 response).
- "8+ major features over roughly a year" (NOT "8+ per sprint" — that was a real
  overclaim caught and corrected).
- NestJS explicitly softened to "basic, API support" everywhere — Pratik confirmed he's
  not fully confident explaining it in interviews, don't oversell it.
- No "(AI-assisted)" qualifier on the NestJS bullet — reads as self-undermining, removed.
- ATS project's tech stack line includes NestJS (confirmed he actually used it there).
- Contact block: LinkedIn/GitHub/Portfolio are proper `<a>` links with clean anchor text,
  not raw URLs in plain text (email/phone stay as plain text — ATS parsers need those
  literal, hyperlinking risks losing them).

## The job listing webpage (the thing Pratik actually uses day-to-day)

This is **the primary deliverable** — not the MCP servers themselves, not any dashboard.
Pratik scans a QR code on his phone, sees jobs grouped by city, taps Apply.

- Built by `build_citywise.py` (Python), reading from `final_wide_list.json` (the merged
  job dataset) in the scratchpad directory, producing `joblist.html`.
- Published via the `Artifact` tool at a **stable URL** (same URL every republish, as
  long as the same file path is used) — the actual URL should be in this conversation's
  history; if lost, re-publish fresh and send a new QR code.
  - **Current live URL (2026-08-10): `https://claude.ai/code/artifact/09ee6194-f97e-428f-add7-04a920cc61b9`**,
    built from `joblist_v3.html`. History: `joblist.html` (URL `83f7d107-...`) hit a
    stale-cache complaint → republished as `joblist_v2.html` (URL `5a07251c-...`) → that
    ALSO hit a stale-cache complaint even after normal republishing to the same URL, so
    Pratik explicitly asked for a brand-new URL with zero cache history rather than
    fighting it again → `joblist_v3.html` (URL `09ee6194-...`), old `joblist_v2.html` and
    all older QR PNGs deleted from scratchpad per his request. **If this happens a third
    time, it's probably not actually a cache issue** — check the live content directly
    via `WebFetch` on the URL before assuming cache and minting yet another new URL (this
    was verified correct via WebFetch both times before conceding to a new URL anyway).
  - Going forward: rebuild via `build_citywise.py` (writes to `joblist.html`), copy that
    output to `joblist_v3.html`, publish `joblist_v3.html` with `url` param set to the
    `09ee6194...` artifact to keep updating in place. Don't publish `joblist.html` or
    `joblist_v2.html` directly — both are stale/abandoned.
  - **Known tradeoff**: every time a new URL gets minted, the client-side
    `pratik_job_tracker` localStorage state (Applied/Not-interested marks, see tracker
    section below) resets to empty on the new page — it does NOT carry over from the old
    URL. Pratik was told this explicitly before the last switch. Don't switch URLs lightly
    given this cost.
- QR code generated via the `qrcode` npm package (installed with `--no-save`, uninstalled
  after use — don't leave it in `package.json`).
- **Do NOT re-add ATS score badges or priority stars to this page** — see above, tried
  twice, rejected twice.
- Card format per job: title, company, location, a date-freshness chip (green if ≤14
  days), an experience chip (YOE range or seniority label if known), and an Apply button
  linking to the real posting URL. City sections in the priority order above, each with a
  jump-nav anchor at the top of the page.
- **Company Website/LinkedIn links** (added 2026-08-07, per Pratik's request): each card
  shows small "Website · LinkedIn" links next to the company name when confidently found.
  Sourced via a one-time WebSearch research pass (a background agent), limited so far to
  the **Indore/Jaipur/Remote priority-city companies only** (51 unique companies checked,
  43 got at least one link; 8 skipped — no trustworthy match, name collisions with
  unrelated companies, see `company_links.json` history for which). Deliberately
  conservative: a wrong/guessed link was treated as worse than no link, so several small
  generic-named agencies (e.g. "Hangar", "STAKEWELL CO", "Oreva AI") got skipped rather
  than risk linking the wrong company.
  - Data lives in `company_links.json` in **this session's own scratchpad**
    (`.../7831b823-b3db-46fa-a511-70d3d32c6042/scratchpad/company_links.json`) — NOT in
    the same scratchpad as `build_citywise.py`/`final_wide_list.json`
    (`.../2359fcc1-b037-4495-a467-e62d6bbd3ddb/scratchpad/`). `build_citywise.py` was
    updated to load it from that separate path via a hardcoded `LINKS_FILE` constant. If
    scratchpad directories don't survive into a new session, this file needs regenerating
    (re-run the same WebSearch research pass) or the path needs updating.
  - **Not yet done**: the ~108 companies outside Indore/Jaipur/Remote (Bengaluru, Delhi
    NCR, Pune, Chennai, etc.) have no website/LinkedIn links yet — Pratik chose to scope
    this to priority cities first rather than all 159 companies at once. Extend the same
    process (dedupe company names, WebSearch research pass, merge into
    `company_links.json`, rerun `build_citywise.py`) if/when he wants the rest covered.
- **Known limitation**: many entries in `final_wide_list.json` only have title/company/
  url/date — no full description text — because they were manually curated into that
  file across many search rounds rather than always carrying the full JD. This means the
  experience-filter/freshness-filter logic can't verify those specific entries from
  description text (only from title regex). A one-time manual JD-verification pass was
  done on ~18 of these via `WebFetch` against their real posting URLs (see
  `jd_verified.json` in scratchpad if it survives) — this caught real problems (e.g. a
  Yash Technologies "UI Specialist" role that looked junior-friendly by title but
  actually required 4-6 years) and got those dropped from the list. **Going forward,
  prefer fresh live searches through the MCP servers (which do carry real description
  text and filter correctly) over trusting old entries in `final_wide_list.json`.**

## 2026-08-10 update — merged two pasted CSVs + fresh server pull into the list

Pratik pasted two CSVs (`1_direct_shortlist_0to2yr_indore_jaipur_remote(1).csv`,
`1_direct_shortlist_0to2yr_jobs(3).csv`) sourced from Naukri/LinkedIn/Cutshort/Glassdoor via
some other scraping tool, both with a `Resume_Match_Score` column. Same conflict as the
Indeed list earlier — flagged it, he chose "clean + salvage as raw leads": scores stripped,
rows with fake Google-search fallback URLs or placeholder company names (e.g. literal
"Indore Tech Firm") dropped, 3+yr rows dropped, deduped by URL. ~90 of csv2's 155 rows were
garbage and got dropped this way — that CSV's data quality was poor.

Also ran a fresh pull across all reachable MCP servers (14-ish; `workable-jobs` isn't
registered as an MCP tool in this session so it was skipped; `ashby`/`greenhouse`/`lever`/
`smartrecruiters` are single-company lookups, not applicable to a broad sweep, so skipped
too; `huntyourtribe` 404'd; `remoteok`/`remotive`/`themuse` returned 0 relevant results this
pass). Google Jobs was again the best source. Manually curated ~24 good results out of the
raw pulls (dropped spam-templated listings, TheirStack rows where the source's own
experience filter missed an explicit "4 to 6 years"/"6 to 9 years" in the URL slug, and a
title/description mismatch from career-site-jobs).

Result: `final_wide_list.json` grew from 163 → 293 entries (merged + deduped by URL).
`joblist.html` republished (same URL) — 280 cards across 19 locations (Indore 88, Remote 65,
Jaipur 32, Ahmedabad 20, Bhopal 3). Also exported `D:/adi/mcp/final_job_list.csv` as a clean
scoring-free CSV per his request — sent to him directly.

The merge/clean logic lives in `.../7831b823-b3db-46fa-a511-70d3d32c6042/scratchpad/merge_final.py`
(different session scratchpad than `build_citywise.py` again — same cross-session-scratchpad
pattern as `company_links.json`, see above). Re-run it if more CSVs/pulls need merging in;
it dedupes by normalized URL so it's safe to re-run against the already-merged
`final_wide_list.json`.

**Caveat**: ~200 of the 293 entries have `needs_verification: true` (came from the CSVs
without full description text, so experience/seniority couldn't be verified from real JD
text, only from title/CSV-column regex) — the page doesn't visually distinguish these except
via the existing amber "verify before applying" chip logic already in `build_citywise.py`.

## Application tracker (added 2026-08-10)

Each card now has three buttons — **Mark applied** (green, timestamps it), **Not interested**
(greys it out), **Undo** — plus the existing Apply link. State is stored client-side in
`localStorage` under key `pratik_job_tracker` (`{jobId: {status, ts}}`, jobId = first 10 chars
of md5(url)) — this lives in Pratik's own browser on his own device only, nothing server-side,
nothing synced across devices. A `#tracker` bar at the top shows Pending/Applied/Not
interested/All as clickable filter tabs with live counts — this **is** the tracker Pratik
asked for; there's no separate spreadsheet. Old key `pratik_dismissed_jobs` (from the
Apply/Not-interested-only version before this) auto-migrates into the new key on page load.

## 2026-08-12 update — AGENTS.md added, ZipRecruiter scrape request declined

Pratik pasted a curl command for `ziprecruiter.in` with `cf_clearance`/`__cf_bm`/AWSALB
cookies asking for an MCP server built against it. Declined — same bucket as the
LinkedIn/Naukri/Glassdoor/Indeed/Hirist/BeBee/KitJob rule below (Cloudflare
bot-detection-bypass cookies are the tell), and those cookies wouldn't even keep working
since `cf_clearance` is fingerprint-bound and expires in hours. Alternatives offered:
check whether Google Jobs (SerpApi) already surfaces ZipRecruiter postings via its
structured-data aggregation, or Pratik browses manually and pastes results (same pattern
as the earlier CSVs) for processing — no new server was built.

Separately, all standing rules scattered through this file were consolidated into a new
**`AGENTS.md`** at the repo root, written to be tool-agnostic so Antigravity (or any other
agent) picks it up automatically tomorrow — plus a one-line **`CLAUDE.md`** (`@AGENTS.md`)
so Claude Code loads the same content instead of drifting from it. `AGENTS.md` holds the
11 hard rules (no bot-evasion scraping, no auto-apply, mandatory filter defaults, no fake
scores, no hot-reload assumptions, no loose process kills, no pushing without asking,
dedupe-by-URL, don't resurrect `feature/job-tracker`, don't proactively rewrite the
resume) plus the exact candidate/search spec. This file (`SESSION_HANDOFF.md`) stays as
the chronological session log — `AGENTS.md` doesn't replace it, a new agent should read
both. Both new files are untracked/uncommitted, same as everything else pending below.

## What was actively in progress when this session ended

1. **A fresh, full job search across all priority cities was interrupted** by the
   MCP-server-staleness discovery and the branch-reconciliation work. The last *reliable*
   fresh data pulled was a partial Indore batch (Google Jobs, JobsPipe, Adzuna) — but even
   that batch's Google Jobs results came back BEFORE the server restart, so they may still
   reflect stale/unfiltered logic. **Recommended next step**: start a genuinely fresh pull
   now that servers are confirmed reconnected — Indore, then Remote, then Jaipur, then
   Ahmedabad, then Bhopal, using `google-jobs` + `jobspipe-jobs` + `theirstack-jobs` +
   `adzuna-jobs` per city as the proven-good combination, then rebuild
   `final_wide_list.json` and republish the page.
2. `smartrecruiters-jobs-server.js` and `workable-jobs-server.js` are staged in `main`'s
   working tree (copied from `feature/job-tracker`), uncommitted. Verify both work, then
   commit+push — but only once Pratik explicitly says to (he asked not to push yet).
3. ~~The `.gitignore` on `main` should exclude `*.sqlite`~~ — **resolved**: verified
   `main`'s working-tree `.gitignore` already has `node_modules/`, `.env`, `*.log`,
   `*.sqlite` (checked directly, not assumed). No action needed.
4. ~~The job list page (`joblist.html`, artifact `83f7d107-db0f-494b-a69f-5a8246b98551`)
   had a queued-but-not-actually-published fix removing ATS score badges/stars~~ —
   **resolved**: the previous republish attempt had silently failed (hit a version-conflict
   guard before completing), so the *live* page still showed scores/stars on all 150 cards
   despite `build_citywise.py`/`joblist.html` on disk already being clean. Caught this by
   actually fetching the live URL and grepping it rather than trusting the build script's
   state, republished with the clean file, confirmed no scoring markup remains. **If a new
   session checks this again, verify by fetching the live URL — don't assume a local file
   being clean means the published page matches it.**

## Standing rules established across this whole session (don't relitigate these)

- **No LinkedIn/Naukri/Glassdoor/Indeed/Hirist/BeBee/KitJob scraping or browser
  automation.** None of these have public APIs; all attempts to build against them would
  mean impersonating a browser to evade bot detection. Consistently declined throughout,
  multiple times, including once when explicitly asked to do it "since it's just curl."
- **No auto-apply.** Pratik applies manually. This tooling only discovers/organizes/lists.
- **Every new job-search server must import both `experience-filter.js` and
  `freshness-filter.js`** and default to `maxYearsExperience: 2`,
  `excludeSeniorTitles: true`, `maxAgeDays: 90`, `excludeInternships: true`. This is a
  hard requirement, not a suggestion — it's the whole point of the shared modules.
- **No ATS scoring / priority stars / gamified ranking — UPDATED 2026-08-10, read carefully.**
  Rejected twice before, but Pratik explicitly asked for a real match % again this session,
  after being told directly this was the same feature he'd rejected twice — he confirmed he
  wants it anyway. This is NOT a silent reversal; it was flagged and he chose it knowingly.
  **The scope is deliberately narrow**: a numeric `match_pct` (+ `match_reason` string) is
  only ever added to a job record after *actually* fetching that specific posting's real JD
  text and comparing it against Pratik's real resume skills — never bulk-computed or guessed
  from just title/company. Only 1 of 240 roles has one so far (Gyrix TechnoLabs, 62%,
  computed after live-verifying that listing). It fills in progressively as roles get
  verified through the normal one-by-one apply workflow (see below), not retroactively for
  the whole list. If a new session is asked to "add match scores," do NOT bulk-generate them
  from unverified data — that recreates exactly the fake-95%-Indeed-list problem that was
  already caught and rejected once this session. Chip only renders when `match_pct` is set;
  no JD text = no score shown, by design (see `match_chip()` in `build_citywise.py`).
  Colors reuse the `--score-hi/mid/lo` CSS tokens (already existed in the stylesheet, unused
  since the original score-removal — reactivated for this legitimate, non-gamified use).
- Before publishing anything with a company/domain claim (like EduMiracle's link), verify
  it's actually live (curl/fetch a 200) rather than trusting old context.
- Resume content changes should be minimal and specific from here — the resume has been
  through two full strict-panel reviews already. Don't proactively rewrite it further;
  only touch it if Pratik brings a specific new fact or JD to tailor against.

## 2026-08-17 update — mobile job-list page + build queue for tomorrow

Ran a fresh 7-day-strict pull (`maxAgeDays` tightened to 7 on request, cutoff 2026-08-10)
across the already-registered general-search servers (adzuna, google-jobs, career-site,
hirebase, jobicy, jobspipe, remoteok, remotive, theirstack, themuse — huntyourtribe 404'd).
Manually caught two filter misses before publishing: an Annova Solutions Indore listing
whose JD said "4-6 years" (written as "46 years", regex missed it) and a Udaipur MERN role
with a garbled placeholder-looking company name — both dropped. Built a new mobile-first
HTML page (`fresh-frontend-roles.html` in this session's scratchpad,
`.../4a702113-3db1-4ad2-bcb9-a013eb3068fe/scratchpad/`), published as Artifact
`https://claude.ai/code/artifact/3c19aae6-bfc1-4890-8b96-e5160634d28d`, sent a QR PNG
(`jobs-qr.png`, same scratchpad) via `SendUserFile`. Also registered `workable-jobs` via
`claude mcp add` (was on disk but not in `claude mcp list` all session) — per the
hot-reload gotcha above, it won't be callable until Claude Code reconnects.

**Note**: this page (`fresh-frontend-roles.html`) is a *separate* artifact from the
`joblist_v3.html` / `09ee6194-...` page described earlier in this doc — did not know
that URL existed when publishing this one. Tomorrow, decide whether to keep both or
consolidate back into the `09ee6194...` URL (consolidating loses today's page's own
history but keeps Pratik's existing bookmark/QR and the `pratik_job_tracker` localStorage
state tied to that URL).

### Build queue status (updated same day, 2026-08-17 evening — Pratik asked to continue same session)

1. ~~**`himalayas-jobs-server.js`**~~ — **DONE.** Built, registered
   (`claude mcp add -s user himalayas-jobs -- node D:/adi/mcp/himalayas-jobs-server.js`),
   syntax-checked. Imports both shared filters correctly, defaults match the hard rule
   (`maxYearsExperience:2`, `excludeSeniorTitles:true`, `maxAgeDays:90`,
   `excludeInternships:true`). `pubDate` from Himalayas is unix **seconds** (not ms) —
   the server multiplies by 1000 before handing to `evaluateFreshness`, don't lose that
   if this file gets refactored. **Not yet live-tested through the MCP tool itself** —
   registered too late in the session for Claude Code to pick it up (same hot-reload
   gotcha as always); direct `fetch` tests against the raw API worked great though
   (confirmed real, relevant, fresh India results for `q=frontend&country=India&seniority=Entry`).
   **First thing next session**: run `mcp__himalayas-jobs__search_jobs` for real once
   reconnected, confirm output shape looks right, then fold into the next fresh pull.
   (Arbeitnow was also checked — works, but its `search` param doesn't filter
   server-side and it's overwhelmingly EU/German-market, so skipped.)
2. ~~**Verify `workable-jobs`**~~ — **DONE, confirmed working.** Reconnected this
   session, tested live against `huggingface` (6 real jobs returned, experience/date
   detection correct). The earlier "every company returns 0" problem was just the
   never-reconnected-session issue, not a bug in the server itself. Ready to use for
   real company slugs going forward.
3. **Still open — get 10-15 target company slugs from Pratik** for Greenhouse/Lever/
   Ashby/SmartRecruiters/Workable (Indore/Jaipur/remote-India companies he'd want to
   work at) — these five servers are installed and connected but still sat idle this
   session since they're single-company lookups, not broad search.
4. Not urgent: general "find more MCP servers" beyond Himalayas — no other clearly
   worth-building source identified (checked FlyByAPIs/LoopCV/FreeWebAPI aggregators via
   WebSearch — paywalled or redundant with Google Jobs/SerpApi already in use).

## If anything above is unclear or seems to conflict with what Pratik says in the new
## session, ask him directly rather than guessing — that was his explicit instruction
## when this doc was requested.
