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
12. **Always use clean human first names in LinkedIn outreach — NEVER vanity slugs or IDs.**
    When sending notes or connection requests, extract the person's real display name
    (e.g., "Anjali", "Amishi", "Vijay") from the page DOM/profile title. Never use URL vanity
    slugs like `anjali-bhourahari-5a97a0226` or profile IDs in the greeting.
13. **Do not ask HR / Talent Acquisition for referrals — ask developers / engineers / leads only.**
    HRs post jobs and screen applicants directly (they don't give internal employee referrals).
    Direct employee referral outreach should exclusively target software engineers, frontend devs,
    tech leads, and engineering managers at the company.
14. **Write natural, casual dev-to-dev messages & human email applications — NO AI/corporate fluff.**
    Avoid robotic phrases like "hope this message finds you well", "scalable web ecosystems", "~" symbols, or bloated prose.
    - **Standard Email Application Template:**
      ```text
      Hi [Company] Hiring Team,

      I came across your opening for a [Role] in [Location] and wanted to apply for the role.

      I'm a Frontend Engineer with 1.5 years of experience, mainly working with React.js, Next.js, TypeScript, JavaScript, REST APIs, and responsive UI development. I have hands-on experience building reusable components, responsive interfaces, and API-integrated web applications.

      I'm based in Indore and would be glad to discuss the opportunity further.

      I've attached my updated resume for your review.

      LinkedIn: https://www.linkedin.com/in/pratik-patidar
      Portfolio: https://pratik-portfolio-nine-orcin.vercel.app

      Thanks & Regards,
      Pratik Patidar
      pratikpatidar7990@gmail.com
      +91 82696 47990
      ```
15. **Hard-exclude ghosting staffing agencies & resume-harvesters.**
    Third-party ghost staffing platforms (e.g. Quik Hire Staffing, TaskVerse, generic recruitment middle-men with no real company info) post fake/unverified listings to collect resumes. Only target direct tech companies, verified IT service/product firms, and direct founder/recruiter posts.
16. **Strict LinkedIn recipient header verification before typing or sending.**
    NEVER type or send any message in LinkedIn Messaging without first reading the active chat header DOM (`.msg-title-bar__title`, `.msg-entity-lockup__entity-title`, `.msg-thread__link-to-profile`) and asserting that the recipient's name matches the intended person 100%. If there is any mismatch or delay in conversation switching, ABORT IMMEDIATELY. Never send a message into an unverified active editor.
17. **Strict Full JD body verification before presenting or applying.**
    Always inspect the actual JD body text on the destination page to verify:
    - **No disguised internships / training programs** (e.g. "stipend up to ₹10,000", "batch starts", "unpaid", "trainee").
    - **No stale / multi-month / 1-year old postings** (always check the real date badge on the destination page, never blindly trust aggregator timestamps).
    - **No 3+ years experience barrier** (must strictly fit 0–2 years).
18. **Strict English-Only for all LinkedIn DMs, outreach, replies, and emails.**
    Every LinkedIn direct message, connection note, referral request, chat reply, or application email MUST ALWAYS BE WRITTEN IN CLEAN, NATURAL, PROFESSIONAL ENGLISH. NEVER use Hindi or Hinglish under any circumstances.
19. **Strict Post-Dispatch Email Verification in Live Sent Folder.**
    NEVER mark or report an email application as "Dispatched" or "Applied" just because a script executed or a JSON file was staged on disk. Every dispatched email MUST be immediately verified by reading the live Gmail `Sent` folder / CDP DOM to assert that the recipient, subject, single attached resume, and timestamp are physically present in the outbox. Staged != Sent.
20. **Strict 7-Day Freshness Verification on Live Destination Listings.**
    Before presenting, applying, or requesting referrals for any role (especially Indore and Remote), ALWAYS verify the live destination page's `datePosted` / posting badge to ensure it was posted within the past 7 days (maximum 10 days). Exclude any stale, closed, or multi-week old jobs immediately.
21. **Indore & Remote Referral Outreach Exclusivity (No-Note Connection & Connected DM Protocol).**
    For all Indore and Remote openings discovered:
    - **New Prospects (Not Connected):** Send targeted LinkedIn **connection requests WITHOUT a custom note** (since monthly premium/custom note quota is exhausted). Exclusively target active frontend devs, software engineers, and tech leads at the company (Rules 12, 13, 18).
    - **Existing 1st-Degree Connections:** Send a clean, natural, human-written dev-to-dev referral request message in English (Rule 14 & 18).
    - **Standard Dev-to-Dev Referral Request Template (for 1st-degree connections):**
      ```text
      Hi [First Name],

      I noticed an active opening for a [Role] at [Company] and wanted to check if you might be open to referring me.

      I'm a Frontend Engineer with 1.5 years of experience, mainly working with React.js, Next.js, TypeScript, and responsive UI development. I'm based in Indore and think my background aligns well with the role.

      Portfolio: https://pratik-portfolio-nine-orcin.vercel.app
      LinkedIn: https://www.linkedin.com/in/pratik-patidar

      Would really appreciate your help if you can pass my profile to the team!
      ```

22. **Zero-Drop Multi-Part Instructions & Explicit Context Retention.**
    NEVER silently drop, skip, or ignore earlier parts of a multi-part prompt, question, or in-progress task when receiving follow-up input or new instructions. If two instructions overlap, conflict, or if user input adds a new priority, ALWAYS explicitly address BOTH parts, or explicitly ask the user: *"Should I proceed with [Part A] or skip/switch to [Part B]?"* Never assume silence equals permission to abandon pending requests.
23. **Strict Pre-Action JD Body Experience Verification (Zero Mid/Senior Tolerance).**
    BEFORE sending any LinkedIn DM, referral connection note, email application, or portal submission, the full destination JD body MUST be inspected and verified to fit strictly within 0–2 years of experience. If a JD explicitly requires 3+, 4+, 5+, 7+ years, Senior, Lead, Architect, or Staff level, DISQUALIFY AND DROP IT IMMEDIATELY. Never reach out or apply to a role requiring 3+ YOE under any circumstance.
24. **Daily Minimum 50 Application Floor (Minimum 20 Portal Forms) & Fixed Clock Timetable.**
    Every single working day MUST achieve a **MINIMUM of 50 verified applications (Minimum 50 Floor — scale higher based on harvest availability, never artificially capped)**.
    - **Portal Form Floor:** Every daily pipeline MUST include **AT LEAST 20 direct portal/form submissions minimum** (on Greenhouse, Lever, Ashby, SmartRecruiters, and company career portals).
    - **Direct Emails & Referrals:** The remaining applications are completed via verified direct recruiter/founder emails & LinkedIn dev referral requests.
    - **Local Indore IT Re-verify Protocol:** Prominent local Indore tech companies (*Intellicus, BestPeers, Untangleit, InfoBeans, Diaspark, Impetus, YASH, Systematix, CIS/Cyber Infrastructure, Walkover, HackerKernel, Infograins, Vinove*) are NEVER permanently blacklisted. If they post an active opening, they are flagged as `RE_VERIFY_MANUALLY` for explicit user review.
    The daily workflow follows an exact **2-Cycle Pipeline (11:00 AM – 07:00 PM)**. The complete 7-slot cycle runs twice daily (4 hours in Morning + 4 hours in Afternoon) for continuous, repeatable, high-output execution:
    
    ### 🔹 CYCLE 1 / CHUNK 1 (11:00 AM – 03:00 PM | Morning Sourcing, Verify & Dispatch Loop)
    - **Slot 1 (11:00 AM – 11:20 AM | 20 mins):** Step 0 Rule reading, inbox review (Gmail & LinkedIn responses/follow-ups).
    - **Slot 2 (11:20 AM – 12:00 PM | 40 mins):** Dedicated 100% MCP ATS Execution of ALL 20 Servers (Ashby, Greenhouse, Lever, SmartRecruiters, Workable, Adzuna, Remotive, RemoteOK, Jobicy, The Muse, Jooble, Careerjet, Working Nomads, Findwork, Himalayas, DevITjobs, Jobspipe, TheirStack, Hirebase, Google Jobs). Pure MCP sourcing with ZERO servers skipped.
    - **Slot 3 (12:00 PM – 12:20 PM | 20 mins):** Dedicated Parallel Live Feed Surfing (Telegram Web @merntech + LinkedIn & Naukri live 0–2 YOE cards & Indore/Remote drops).
    - **Slot 4 (12:20 PM – 01:00 PM | 40 mins):** Merged Deep CDP Physical Audit, Clean Table Presentation & Resume Staging (`React Developer.pdf`).
    - **Slot 5 (01:00 PM – 01:30 PM | 30 mins):** Wave 1 direct email applications (human-paced 60s delay + live Gmail Sent assertion).
    - **Slot 6 (01:30 PM – 02:40 PM | 70 mins):** Wave 1 direct portal form submissions (Ashby, Greenhouse, Lever, Workday with pre/post screenshots).
    - **Slot 7 (02:40 PM – 03:00 PM | 20 mins):** Cycle 1 audit, Sent folder physical assertion & Cycle 1 tracker sync (Lock 25+ applications).

    ### 🔹 CYCLE 2 / CHUNK 2 (03:00 PM – 07:00 PM | Afternoon Fresh Harvest, Referrals & Target Lock)
    - **Slot 1 (03:00 PM – 03:20 PM | 20 mins):** Afternoon inbox check, response follow-ups & pipeline sweep.
    - **Slot 2 (03:20 PM – 04:00 PM | 40 mins):** Dedicated 100% MCP ATS Execution of ALL 20 Servers (Ashby, Greenhouse, Lever, SmartRecruiters, Workable, Adzuna, Remotive, RemoteOK, Jobicy, The Muse, Jooble, Careerjet, Working Nomads, Findwork, Himalayas, DevITjobs, Jobspipe, TheirStack, Hirebase, Google Jobs). Pure MCP sourcing with ZERO servers skipped.
    - **Slot 3 (04:00 PM – 04:20 PM | 20 mins):** Dedicated Parallel Live Feed Surfing (Telegram Web @merntech fresh drops + afternoon LinkedIn & Naukri drops).
    - **Slot 4 (04:20 PM – 05:00 PM | 40 mins):** Merged Deep CDP Physical Audit, 1st-Degree Dev Referral Prep & Interactive Table Presentation.
    - **Slot 5 (05:00 PM – 05:30 PM | 30 mins):** Wave 2 direct email applications & referral outreach sweep.
    - **Slot 6 (05:30 PM – 06:40 PM | 70 mins):** Wave 2 portal form submissions (achieve & exceed minimum 20 portal floor with pre/post screenshots).
    - **Slot 7 (06:40 PM – 07:00 PM | 20 mins):** Final evening audit, Sent folder assertion, lock minimum 50 applications floor & master daily report.
25. **Parallel Dual-Stream Ingestion & Instant Verification Architecture.**
    Harvesting and verification MUST run in two parallel concurrent streams during Slots 2 & 3:
    - **Stream A (MCP ATS Pipeline):** Subagent/Worker queries 20 MCP servers (`ashby`, `greenhouse`, `lever`, `adzuna`, `workable`) and instantly passes every raw record through `experience-filter.js` and `freshness-filter.js`.
    - **Stream B (Telegram Web Pipeline):** Subagent/Worker extracts live message bubbles from Telegram Web (`@merntech` & developer hiring channels via CDP), parses unstructured text for direct HR emails/links, and validates 0–2 YOE.
    - Both streams write directly into the unified **Interactive Verification Table** for user review in Slot 3.
26. **Mandatory Day-Start Rule Reading (Step 0 Protocol).**
    Every single working day at 11:00 AM kickoff, the assistant MUST read `AGENTS.md` rules before executing any discovery, dispatch, or outreach actions. Never proceed on assumptions without reading the durable rules layer.
27. **Strict LinkedIn Account Safety & Zero Automated Search Scraping Policy.**
    To protect the user's primary LinkedIn account from commercial search rate limits, temporary traffic pauses, or account restrictions:
    - **NEVER execute automated search query scraping on LinkedIn** (e.g. running loops on `linkedin.com/search/results/content/` or `/search/results/all/`).
    - **Zero Background Daemons on LinkedIn:** Never run continuous background scraping daemons on live LinkedIn tabs.
    - **Independent Harvesting Channels:** Sourcing must exclusively rely on direct MCP ATS servers (Greenhouse, Ashby, Lever, SmartRecruiters, Workable), Telegram hiring channels (`@merntech`), direct employer career portals, Google Jobs, and Naukri.
    - LinkedIn may only be accessed for targeted, human-paced, user-approved single-action connections/referral messages (strictly following Rules 12, 13, 14, 16, and 18).
28. **Continuous Active Slot Utilization & Deep JD Review Protocol (Zero Idling & Zero Premature Leap).**
    Whenever a slot task completes early and there is remaining time left in the current slot window (e.g. 10–20 minutes remaining):
    - **Zero Idling / Never Wait Passively:** Never sit idle, stop tools, or wait for the clock to tick down.
    - **Never Prematurely Leap into Future Dispatch Slots:** Do not execute future dispatch actions (e.g. sending emails or firing final submissions) before their scheduled slot window without explicit user direction.
29. **Mandatory Programmatic Browser CDP JD Inspection Protocol.**
    Aggregator summaries, titles, and search result snippet cards can NEVER be trusted for final verification. Every candidate portal job MUST be programmatically opened in a browser tab via Chrome CDP (`127.0.0.1:9222/json/new`) using `deep_cdp_live_auditor.mjs` to extract `document.title`, the exact date posted metadata, the full experience requirement sentences, and assert whether the position is still active (`Is Closed: false`). Stale postings (>7-10 days), senior 3+ YOE barriers, closed forms, and non-matching stacks (e.g. React Native/mobile) must be automatically purged before presenting to the user.
30. **Zero-Excuses AI Accountability & Pipeline Ownership.**
    The assistant is 100% accountable for the cleanliness of the pipeline. Never present unverified jobs, and never expect or ask the user to vet dates or experience requirements that the assistant was tasked to audit. If a job is presented in the verified tier, it MUST be 100% vetted against live DOM text.
31. **Strict Active Sender Account Verification Before Dispatch & MailerMen Hard Exclusion.**
    - **Mandatory Sender Account Assertion:** Before composing, typing, or sending ANY email application via browser CDP, the assistant MUST read the active Google Account badge DOM (`a[aria-label*="Google Account"]`, `.gb_d`) and assert that the logged-in email is `pratikpatidar7990@gmail.com`. If any secondary/unauthorized account (e.g. `nakmeisiliya12@gmail.com`) is active, ABORT IMMEDIATELY. Never dispatch an email from an unverified sender account.
    - **MailerMen Permanent Hard-Exclusion:** MailerMen (and broken 404 recruitment endpoints) are permanently excluded from all harvesting, outreach, and application pipelines.
32. **Mandatory Strict Positive Frontend/React Whitelist & Non-Stack Ban.**
    - Every single job presented, staged, or applied MUST pass a mandatory positive match on the core candidate stack: `Frontend / React / Next.js / TypeScript / JavaScript / UI / Web Developer / MERN Developer (0–2 YOE)`.
    - **Hard Excluded Non-Stack Roles:** Linux kernel, Python packaging/systems, C++, Rust, OpenStack, Hardware infrastructure, DevOps, and mobile native are permanently disqualified and must never be touched, staged, or submitted.
33. **Strict Zero-Shortcut Policy & Mandatory Physical DOM Chunk Execution.**
    - NEVER take any shortcuts, approximations, bulk assumptions, or skip physical verification steps.
    - Every single job record presented in tables, staged for dispatch, or queued for applications MUST be physically opened and audited in browser CDP chunks.
    - Exact posting dates MUST be extracted directly from physical DOM elements (`JSON-LD Schema datePosted`, `__NEXT_DATA__ publishedAt`, or rendered DOM date text). If a date exceeds 10 days, it must be purged immediately. Zero assumptions, zero shortcuts, 100% physical verification.
34. **Strict Human-Paced Execution & Anti-Bot Sleep Cooldowns.**
    - NEVER execute instant burst dispatches or lightning-fast form submissions that could trigger automated anti-bot flags, email provider rate-limits, or ATS spam filters.
    - **Pacing Protocol:**
      - Always enforce natural human keystroke delays (20–40ms) when typing recipients, subjects, and form inputs.
      - Enforce a **mandatory 1-minute (60 seconds) cooldown sleep** between consecutive email dispatches.
      - Enforce a **mandatory 15–30 second cooldown sleep** between consecutive portal form submissions.
      - Allow sufficient buffer (4–8 seconds) for file attachment uploads to fully complete before triggering any send/submit button.
35. **Strict LinkedIn Maximum 2 Tabs Limit & Auto-Cleanup Rule.**
    - NEVER open more than 2 LinkedIn tabs simultaneously in the browser under any circumstances.
    - Having multiple LinkedIn tabs active causes session conflicts, public guest redirects, and triggers bot-detection rate limits.
    - Before opening or navigating to any LinkedIn URL, the assistant MUST check the active tab list and close any existing redundant/stale LinkedIn tabs so that the total never exceeds 2 (1 primary feed/messaging + at most 1 active job view).
36. **Mandatory High-Impact Optional Field Auto-Fill (Boost Application Priority).**
    - In portal application forms (Greenhouse, Lever, Ashby, Company ATS), NEVER leave optional textareas like *"Anything you would like us to know (optional)"*, *"Additional Information"*, or *"Cover Note"* blank.
    - Always auto-fill with a crisp, punchy, dev-to-dev value proposition to boost candidate ranking:
      ```text
      Frontend Engineer with 1.5 years of experience specializing in React.js, Next.js, TypeScript, and responsive UI engineering. Proven experience shipping production-grade reusable components, fast page loads, and seamless REST API integrations. Immediate joiner based in Indore / Open to remote.
      Portfolio: https://pratik-portfolio-nine-orcin.vercel.app
      GitHub: https://github.com/pratikpatidar
      ```
37. **Mandatory Form-Fill & Post-Submission Screenshot Proof Protocol.**
    - For EVERY single portal form submitted (Ashby, Greenhouse, Lever, Workday, Company ATS, Tally):
      1. **Pre-Submit Fill Proof:** Capture a full-page screenshot immediately after all fields and resume are populated (`pre_submit_[company].png`).
      2. **Post-Submit Confirmation Proof:** Capture a screenshot immediately after triggering submit showing the live success/confirmation message (`post_submit_[company].png`).
    - Both screenshot file paths MUST be reported directly to the user for instant visual verification. Zero un-screened submissions.

## Candidate profile & search spec

The tools in this repo are used for one candidate's job search. Location/role/resume
details are intentionally not hardcoded into server logic (per `README.md`, they're
supplied by the user in conversation) — but when acting on their behalf, this is the
standing spec unless the user says otherwise in a given conversation:

- **Titles**: Frontend Developer, Frontend Engineer, React Developer, React.js Developer,
  UI Developer, UI Engineer, Web Developer, JavaScript Developer, Next.js Developer, MERN
  Stack Developer. **Hard-exclude React Native** (strictly Web/Frontend only; no mobile/native).
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
