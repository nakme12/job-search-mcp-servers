# AGENTS.md — Job Search MCP Servers

Single source of truth for any AI agent/assistant working in this repo (Claude Code,
Antigravity, or anything else). If a tool has its own instructions file (e.g.
`CLAUDE.md`), that file should import this one rather than duplicate it. Read this whole
file before doing anything else here.

**Read `SESSION_HANDOFF.md` too** for session-by-session history, current in-progress
work, and file locations (resumes, scratchpad data files, artifact URLs). This file
(`AGENTS.md`) is the durable rules layer — it does not go stale the way a session log
does. If the two ever conflict, `SESSION_HANDOFF.md`'s most recent dated entry wins for
facts, but the rules below always win for behavior.

## What this repo is

Node.js MCP ([Model Context Protocol](https://modelcontextprotocol.io)) servers that let
an AI assistant search live job listings across multiple sources (Adzuna, Google Jobs,
Greenhouse, Lever, Ashby, JobsPipe, TheirStack, HireBase, Remotive, RemoteOK, Jobicy, The
Muse, SmartRecruiters, Workable, career-site aggregator via Apify) plus shared filter
modules and a generated job-listing webpage. See `README.md` for the per-server table and
setup/key instructions — don't duplicate that here, it stays current on its own.

## Hard rules — do not violate, do not relitigate

2. **No auto-apply.** This tooling discovers/organizes/lists jobs only. The candidate
   applies manually, every time.
3. **Every new job-search server must import both `experience-filter.js` and
   `freshness-filter.js`**, and default to `maxYearsExperience: 2`,
   `excludeSeniorTitles: true`, `maxAgeDays: 90`, `excludeInternships: true`. Not
   optional — this is the whole point of the shared modules. Every tool response should
   include `filtered_out_count` and per-job `detected_min_years_experience`/
   `looks_senior`/`is_internship`/`age_days`.
4. **No ATS match-scoring / priority-star gamified ranking, with one narrow exception.**
   Rejected twice as "time wasting." A numeric `match_pct` (+ `match_reason`) may only be
   added to a specific job record after actually fetching that job's real JD text and
   comparing it to the candidate's real resume — never bulk-computed or guessed from just
   title/company. If asked to "add match scores" broadly, do not bulk-generate them from
   unverified data. See `[[no_fabricated_data]]`-style principle: a blank score beats a
   guessed one.
5. **Don't fabricate or guess data.** Never show a computed value (match %, score,
   company link, salary) unless the source was actually read/verified. Blank beats a
   guess. Before publishing any company/domain claim (e.g. a website/LinkedIn link),
   verify it resolves (fetch a 200) rather than trusting stored context.
6. **MCP servers don't hot-reload.** Editing a `*-server.js` file on disk does nothing to
   an already-running session — it keeps serving old code until the client fully
   reconnects/restarts. Don't assume a fix is live just because the file changed.
7. **Never kill processes with a loose pattern match.** If a stale server process must be
   killed, filter specifically on this repo's path (`adi\mcp\` / `adi/mcp/`), verify the
   exact PID list before killing anything, and never touch processes from unrelated
   projects in sibling directories.
8. **Don't push to remote without explicit go-ahead**, even after committing locally.
   Ask each time; a prior "yes, push" does not carry forward to the next change.
9. **Dedupe by normalized URL** when merging job data from multiple pulls/CSVs into any
   combined dataset. Flag and drop obviously bad rows (placeholder company names, fake
   fallback search-result URLs, out-of-range experience) rather than silently keeping
   them — flag to the user what got dropped and why.
10. **Don't resurrect the `feature/job-tracker` branch's SQLite dashboard/tracker
    approach.** Rejected twice — once for the ATS-scoring reason above, once because its
    `scripts/search-and-import.js` had a real bug (unfiltered `huntyourtribe` calls
    returned unrelated jobs). The branch is left alone in case something else in it is
    useful later, but nothing from it should be built on by default. If someone suggests
    reviving it, the answer is no unless the user explicitly overrides this.
11. **Resume content changes should be minimal and specific.** The resume has already
    been through two full strict-panel reviews. Don't proactively rewrite it further —
    only touch it if the user brings a specific new fact or job description to tailor
    against.

## Candidate profile & search spec

The tools in this repo are used for one candidate's job search. Location/role/resume
details are intentionally not hardcoded into server logic (per `README.md`, they're
supplied by the user in conversation) — but when acting on their behalf, this is the
standing spec unless the user says otherwise in a given conversation:

- **Titles**: Frontend Developer, Frontend Engineer, React Developer, React.js Developer,
  UI Developer, UI Engineer, Web Developer, JavaScript Developer, Next.js Developer, MERN
  Stack Developer.
- **Experience**: 0–2 years only. Hard-exclude Senior/Lead/Staff/Principal/Architect/
  Manager/Director in title or description, and anything explicitly requiring 3+ years.
- **Location priority**: 1. Indore, 2. Remote (India), 3. Jaipur, 4. Ahmedabad,
  5. Bhopal, 6. rest of India as lower-priority overflow.
- **Freshness**: posted within ~90 days (use a source's `reposted` date over original
  post date when the source tracks one). Internships always excluded, no exceptions.
- **Output format**: plain city-grouped list of real roles with real dates/experience
  info — no ATS score badges or priority-star ranking layer (see hard rule 4 above).

## Notes for a new agent picking this up

- Check `claude mcp list` (or the equivalent for whatever tool is running) before
  assuming a server is registered/connected — a fresh session may need servers
  re-registered.
- `.env` (gitignored) holds the real API keys; don't ask the user to repeat values that
  are already there.
- If anything above conflicts with what the user says in a live conversation, ask them
  directly rather than guessing which one wins.
