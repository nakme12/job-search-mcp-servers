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

## 🛑 MANDATORY STEP -0: EVERY-TURN VERBATIM USER INSTRUCTION & DELEGATION GATE
Before executing ANY tool call or action in ANY turn, the agent MUST:
1. **Re-read the user's latest prompt word-for-word (Verbatim).**
2. **Strict Execution Path Determination:**
   - If user explicitly stated to delegate a task to a **subagent** (e.g. email dispatch, portal forms, background scrapers) ➔ **The main agent is STRICTLY FORBIDDEN from executing the action directly in the main thread.** The main agent MUST invoke a subagent and remain free/unblocked.
   - If user gave a direct command (e.g. close tabs, show table, do not use external tabs, read File 4) ➔ The agent must execute ONLY that command without adding unasked actions or running ahead of schedule.
3. **Zero Assumption Violation Ban:** If the agent catches itself starting a terminal/browser script directly when the user asked for a subagent, it must immediately abort and follow the user's explicit delegation instruction.

## What this repo is

Node.js MCP ([Model Context Protocol](https://modelcontextprotocol.io)) servers that let
an AI assistant search live job listings across multiple sources (Adzuna, Google Jobs,
Greenhouse, Lever, Ashby, JobsPipe, TheirStack, HireBase, Remotive, RemoteOK, Jobicy, The
Muse, SmartRecruiters, Workable, career-site aggregator via Apify) plus shared filter
modules and a generated job-listing webpage. See `README.md` for the per-server table and
setup/key instructions — don't duplicate that here, it stays current on its own.

## Hard rules — do not violate, do not relitigate

1. **STRICT LINKEDIN HUMAN-TYPE EMULATION & BOT-FLAG PROTECTION MANDATE (TOP BAN - RULE 86):**
   - Jab bhi system LinkedIn par interact kare (DMs, messaging, feeds, posts, ya profiles), **robotic machine speed ya automated AI scraper ki tarah behave karna STRICTLY FORBIDDEN hai**. Account safety #1 priority hai.
   - **Enforced Invariants:**
     * **Human Pacing & Jitter Delays:** Har click, tab open, aur navigation ke beech 3s–7s natural human pause, 15s–30s between major sections.
     * **Natural Smooth Scrolling:** Instant scrollTop = 0 ya rapid DOM dump strictly banned; smooth gradual scrolling (window.scrollBy({ top: 250, behavior: 'smooth' }) with 1-2s pauses) simulate karo taaki LinkedIn telemetry organic human scroll record kare.
     * **Human Keystroke Simulation:** Keyboard typing delay 40ms–90ms per character with random variance.
     * **Strict Max-2 Tabs Ceiling:** Maximum 2 LinkedIn tabs open at any time. Target inspect hote hi turant close karo (Rule 61).
     * **Zero High-Frequency Search Loops:** Automated continuous search scraping live account par run karna strictly prohibited hai.

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
24. **Daily Minimum 100 Application Floor (Minimum 40 Portal Forms) & Fixed Clock Timetable.**
    Every single working day MUST achieve a **MINIMUM of 100 verified applications (Minimum 100 Floor — scale higher based on harvest availability, never artificially capped)**.
    - **Portal Form Floor:** Every daily pipeline MUST include **AT LEAST 40 direct portal/form submissions minimum** (on Greenhouse, Lever, Ashby, SmartRecruiters, and company career portals).
    - **Direct Emails & Referrals:** The remaining applications are completed via verified direct recruiter/founder emails & LinkedIn dev referral requests.
    - **Local Indore IT Re-verify Protocol:** Prominent local Indore tech companies (*Intellicus, BestPeers, Untangleit, InfoBeans, Diaspark, Impetus, YASH, Systematix, CIS/Cyber Infrastructure, Walkover, HackerKernel, Infograins, Vinove*) are NEVER permanently blacklisted. If they post an active opening, they are flagged as `RE_VERIFY_MANUALLY` for explicit user review.
    The daily workflow follows an exact **2-Cycle Pipeline (11:00 AM – 07:00 PM)**. The complete 7-slot cycle runs twice daily (4 hours in Morning + 4 hours in Afternoon) for continuous, repeatable, high-output execution:
    
    ### 🔹 CYCLE 1 / CHUNK 1 (11:00 AM – 03:00 PM | Morning Sourcing, Verify & Dispatch Loop)
    - **Slot 1 (11:00 AM – 11:20 AM | 20 mins): Mandatory Step 0 Rules/Mistakes Reading, Master Plan & Target Briefing, Pipeline Review & End-of-Slot Summary:**
      1. **Step 0 Mandatory Read:** Compulsory deep-read of `AGENTS.md` and `WEEKLY_MISTAKES_AND_ACCOUNTABILITY_LOG.md` before taking any actions.
      2. **Full Day Plan & Target Briefing:** Agent presents the complete structured day plan to the user, breaks down today's numerical target floor (Minimum 100 Verified Applications: Minimum 80 Direct ATS Portals [40 in Cycle 1 + 40 in Cycle 2] + Direct Recruiter Emails), and displays an overall summary of lifetime/historical metrics from `total_historical_except_today.json` & `applied_lifetime_except_today.json`.
      3. **Pipeline & Inbox Review (Delegated to Background Subagent):** Main agent delegates repetitive inbox/message fetching to a background subagent (zero main-thread blocking). Review Gmail (`mail.google.com`) and LinkedIn messages for incoming recruiter responses, interview requests, or follow-ups. Verify `total_historical_except_today.json` integrity and initialize fresh daily files (`total_todays_<DATE>.json`, `verified_todays_<DATE>.json`, `applied_todays_<DATE>.json`).
      4. **Mandatory End-of-Slot Comprehensive Summary:** The exact moment Slot 1 tasks finish (before transitioning to Slot 2 at 11:20 AM), the agent MUST output a clean, comprehensive summary to the user outlining: (a) Rules audited, (b) Lifetime metrics baseline, (c) Incoming recruiter replies/actions found, and (d) Exact execution roadmap for Slot 2.
    - **Slot 2 (11:20 AM – 12:00 PM | 40 mins): Full Fleet MCP Execution, Daily Server Expansion, Instant Deduplication & Harvest Matrix Summary:**
      1. **Full MCP Fleet Execution (Zero Servers Skipped — Including Adzuna with DOM Audit):** Execute the complete fleet of all active MCP servers across direct ATS (Greenhouse, Ashby, Lever, Workable, SmartRecruiters), high-signal tech boards (YCombinator, HackerNews, TheirStack, The Muse, HireBase, HuntYourTribe, Career-Site), curated Indian portals (Google Jobs, Instahyre, Naukri, Foundit, Adzuna), and verified remote boards (RemoteOK, WeWorkRemotely, Remotive, Himalayas, Jobicy, WorkingNomads, RemoteRocketship). Zero servers skipped.
      2. **Daily New MCP Server Expansion Mandate:** In every daily session, investigate, scaffold, or integrate at least ONE new high-quality ATS / tech job MCP server or provider endpoint to continuously expand pipeline discovery reach and boost qualified openings.
      3. **Instant Historical Deduplication Gate:** Ingest every raw scraped finding into `total_todays_<DATE>.json` and immediately cross-verify against `total_historical_except_today.json`. If a job URL/domain is already present in historical records, immediately flag its status as `SKIPPED_DUPLICATE_HISTORICAL`. Unseen genuine leads are staged for Slot 4 deep audit.
      4. **Mandatory End-of-Slot Summary & Harvest Matrix Table:** Before concluding Slot 2, the agent MUST present a clean, structured Markdown table to the user breaking down:
         - Per-server scraped count (e.g. `Ashby: 12`, `Greenhouse: 18`, `Lever: 15`...)
         - Total raw harvested
         - Total skipped as historical duplicates (`SKIPPED_DUPLICATE_HISTORICAL`)
         - Clean pending candidates staged for Slot 4 physical verification in `total_todays_<DATE>.json`
         - Transition handover to Slot 3 (Live Feeds).
    - **Slot 3 (12:00 PM – 12:20 PM | 20 mins): Dedicated Parallel Live Feed Harvesting (TG + LinkedIn + Naukri), Anti-Bot Safety & Ingestion Matrix Summary:**
      1. **Multi-Channel Parallel Harvesting (Mandatory Background Subagents Execution - Zero Main Agent Block):**
         - All crawling, extraction, and post parsing MUST be delegated to dedicated background worker subagents so the primary agent remains 100% interactive and unblocked.
         - **Telegram Web Multi-Channel Network (At least 20 Channels):** Sweep at least 20 active developer/recruiter hiring channels (including `@merntech`, Tech Hiring, Frontend Jobs, Startup Jobs, etc.) via browser CDP. Mandatory requirement: Pull posts from the **LAST 3 DAYS** (strictly exclude older posts). Parse unstructured text for verified company names, direct recruiter/founder emails, external application links, and 0–2 YOE stack.
         - **LinkedIn Live Multi-Stream (Posts + Recruiter DMs + Fresh Easy Apply):**
           * **Live Hiring Posts Stream:** Human-paced search for live hiring posts (`past 24h` filter) using targeted queries: `"Frontend Developer" "hiring"`, `"React Developer" "share resume"`, `"MERN" "immediate joiner"`.
           * **Recruiter & Direct Email Extraction:** Scrape post text for verified founder/recruiter emails (`@company.com`) and direct application forms. Verify real company name (no generic agency/consultancy).
           * **Fresh Easy Apply Ingestion:** Surface live 0–2 YOE LinkedIn Easy Apply job cards posted within <= 24–48 hours. Stage directly for 0–2 YOE audit.
           * **Account Safety Hard Barriers:** Strictly max 2 tabs open simultaneously, natural human mouse scroll delays (400–800ms), zero continuous background loop daemons.
         - **Naukri Direct Drops Stream (Strict Live Posted Date Check):** Scan live job cards matching React.js / Frontend / MERN within 0–2 YOE ceiling. **MANDATORY POSTED DATE AUDIT:** Every single card must be asserted for date badge (`Posted: Just now`, `1 day ago`, `2 days ago` — strictly <= 3 to 7 days). Any card without fresh date or reposted stale date must be purged immediately.
      2. **Strict Pre-Ingestion Filtration & Historical Deduplication:**
         - Discard staffing agencies, middle-men, unpaid trainee posts, and non-stack roles (Python, DevOps, React Native).
         - Ingest raw qualified findings into `total_todays_<DATE>.json` and immediately cross-verify against `total_historical_except_today.json`. Flag duplicates as `SKIPPED_DUPLICATE_HISTORICAL`.
      3. **Direct Email Lead Staging:** High-quality direct company recruiter emails discovered here are tagged as `READY_FOR_DIRECT_EMAIL` for Slot 5 dispatch (or instant dispatch under Rule 53).
      4. **Mandatory End-of-Slot Summary & Ingestion Matrix Table:** Before exiting Slot 3 at 12:20 PM, output a structured Markdown table to the user:
         - Yield per live channel (Telegram count [20+ channels], LinkedIn count, Naukri count)
         - Historical duplicates dropped (`SKIPPED_DUPLICATE_HISTORICAL`)
         - Clean unverified leads added to `total_todays_<DATE>.json`
         - Ready handover count for Slot 4 Deep Physical CDP Audit.
    - **Slot 4 (12:20 PM – 01:00 PM | 40 mins): Programmatic Destination JD Body Audit, Live Console Proof & Zero-Shortcut Verification:**
      1. **MANDATORY HEADLESS LIVE DESTINATION AUDIT (ZERO SURFACE TRUST):**
         - Every single lead from `total_todays_<DATE>.json` MUST have its destination URL physically opened in headless browser via CDP script (`deep_cdp_live_auditor.mjs`).
         - **Hard Ban on Staged Notes / Subagent Comments:** NEVER trust prior notes like "fits 1-5 yrs" or "looks entry level". The actual live destination JD body text MUST be fetched directly from the employer's page.
      2. **LIVE CONSOLE JD PRINT & 0–2 YOE ASSERTION:**
         - The script/agent MUST extract and print the exact experience requirement sentences to the terminal/console.
         - Run strict experience regex (`3+`, `4-6`, `5+`, `Senior`, `Lead`, `Principal`, `Staff`).
         - **Quest Global / 4-6 YOE Trap Prevention:** If a job requires 3+ years, it MUST be IMMEDIATELY DISCARDED and marked `SKIPPED_OUT_OF_RANGE_YOE`. Only jobs with **100% verified 0–2 YOE live proof** can pass.
      3. **Form & Domain Verification (No Broken Links / No Fake Subscribe Pages):**
         - Verify domain actually resolves (HTTP 200). Reject unresolvable domains (e.g. Elements Energy / Vasudev).
         - Verify the page has an active, operative job application form or clickable "Apply" button. Reject dummy pages that only have "Newsletter Subscribe" (e.g. Outnovate).
      4. **Strict Authorized Resume Mapping & Clean Table Presentation:**
         - Map each verified job to the authorized resume: `Frontend Engineer.pdf`, `React Developer.pdf`, or `MERN Full Stack.pdf` (zero `(Updated)` files).
         - Output verified jobs into `verified_todays_<DATE>.json` (tagged `READY_FOR_DIRECT_EMAIL` vs `READY_FOR_ATS_PORTAL_FORM`).
         - Output a structured Markdown table summarizing: Total Audited, Total Passed (with live proof), Total Discarded (stale / 3+ YOE / broken), and handover to Slot 5.
    - **Slot 5 (01:00 PM – 01:30 PM | 30 mins): Precision Direct Email Dispatch Window & Physical Sent Outbox Assertion:**
      1. **Subagent Automated Dispatch Loop (Zero Main Agent Block):** Direct email compositions and live Sent assertions are executed exclusively via dedicated background worker subagents, keeping the main agent responsive.
      2. **Strict 4-Point Pre-Flight Email Verification:** Before sending each email: Recipient is verified company address, Salutation is `Hi [Actual Company Name] Hiring Team,` (strictly NO "Hi Gmail"), Email body is **100% Immutable Canonical Template** (Rule 44), and exactly one canonical resume attached.
      3. **Human-Paced Jitter Delay & Active Sender Check:** Active Google Account is `pratikpatidar7990@gmail.com`. Enforce **60s–120s randomized human delay** between consecutive emails.
      4. **Physical Sent Folder Assertion (Zero Screenshots Required for Emails):** Navigate to live Gmail Sent folder (`#sent`). Assert recipient and subject physically exist in outbox DOM. Log verified dispatch into `applied_todays_<DATE>.json`.
      5. **Mandatory End-of-Slot Summary Table:** Output summary table of companies dispatched, recipients, subjects, timestamps, and Sent outbox assertion statuses before moving to Slot 6 at 01:30 PM.
    - **Slot 6 (01:30 PM – 02:40 PM | 70 mins): High-Velocity Direct ATS Portal Submissions Window (Minimum 40 Portal Forms):**
      1. **Dedicated Worker Subagent with Mandatory Granular Live Activity Logs (Zero Silent Execution):**
         - The entire portal execution loop is delegated to **ONE (1) DEDICATED BACKGROUND WORKER SUBAGENT**, keeping the primary agent 100% interactive.
         - **ZERO SILENT BACKGROUND RUNNING — Every step MUST be printed live in terminal/chat so user has 100% real-time visibility. Agent kabhi bhi silently background me kaam nahi karega.**
         - **Mandatory Per-Job Per-Step Live Log Format:**
           ```
           [Job 3/40] NexDuo — Portal URL open kiya ➔ https://nexduo.com/careers/apply
           [Job 3/40] NexDuo — Live JD verify kar raha hu (0-2 YOE check)... ✅ Passed
           [Job 3/40] NexDuo — Ashby script detect hua, auto-filler invoke kar raha hu
           [Job 3/40] NexDuo — Name/Email fill ➔ Pratik Patidar / pratikpatidar7990@gmail.com
           [Job 3/40] NexDuo — CTC fill ➔ Current: 2.16 LPA | Expected: 4.65 LPA
           [Job 3/40] NexDuo — Notice fill ➔ 15 Days | Exp fill ➔ 1.5 Years
           [Job 3/40] NexDuo — Resume inject ➔ Frontend Engineer.pdf (CDP setInputFiles)
           [Job 3/40] NexDuo — CAPTCHA check... ❌ reCAPTCHA detected!
           🚨 CAPTCHA ALERT: NexDuo | User se manual solve request hai!
           [Job 3/40] NexDuo — Submit button click kiya...
           [Job 3/40] NexDuo — DOM validation check... ✅ No errors
           [Job 3/40] NexDuo — Confirmation DOM detect hua "Application submitted" ✅
           [Job 3/40] NexDuo — post_submit_nexduo.png screenshot capture ho gaya
           [Job 3/40] NexDuo — applied_todays_<DATE>.json me log entry add kiya
           [Job 3/40] NexDuo — Tab close kiya. Moving to Job 4...
           ```
      2. **Direct Company ATS Portals Only (PlacementIndia Hard Banned - Rule 55):**
         - Sole focus on real direct company career forms: **Ashby, Greenhouse, Lever, Workable, SmartRecruiters, and verified company career portals**. Submissions on PlacementIndia are strictly excluded from the applied count and must NOT be added to `applied_todays_<DATE>.json` (Rule 55).
         - Target floor: **At least 40 direct ATS portal forms** completed in this 70-minute window (achieving **80+ direct portals daily across both cycles**).
      3. **Exact Step-by-Step Portal Execution Protocol (Zero Guesswork & Zero Dropped Steps):**
         For each job staged in `verified_todays_<DATE>.json` tagged `READY_FOR_ATS_PORTAL_FORM`:
         - **Step 1 (Open One-by-One):** Open the destination job portal URL in browser.
         - **Step 2 (Re-verify Live JD):** Quickly inspect live DOM to confirm job is active and matches 0–2 YOE stack.
         - **Step 3 (Fill Form - Mandatory Engine: scripts/universal_ats_engine.cjs):**
           * **ATS Script Check:** Check if a dedicated automation script exists for the specific ATS portal (e.g. `scripts/ashby_auto_filler.mjs`, `scripts/greenhouse_auto_filler.mjs`, or Lever scripts). If available, MUST invoke that dedicated script.
           * **Fallback Manual DOM Fill:** If no dedicated script exists yet for that portal, fill the form manually via browser automation.
           * **Canonical Binding:** In both script and manual mode, strictly populate fields from `candidate_screening_profile.json` (Current CTC: `2.16 LPA` / `216000`, Expected CTC: `4.65 LPA` / `465000`, Notice: `15 Days`, Exp: `2 Years`, Education: `B.Tech CSE BUIT Bhopal 2024 7.89 CGPA`, Location: `Indore, MP`, Authorized Resume: `Frontend Engineer.pdf` / `React Developer.pdf` / `MERN Full Stack.pdf`).
         - **Step 4 (Cross-Verify Data):** Cross-check all populated fields against canonical profile before triggering submit.
         - **Step 5 (Mandatory Terminal Logging):** Log all populated field values and screening answers into the terminal/console so there is 100% transparency.
         - **Step 6 (CAPTCHA Guardrail & User Alert - Rule 56):**
           - If a CAPTCHA (reCAPTCHA, Cloudflare Turnstile, hCaptcha) is detected: **STOP & WAIT**.
           - Trigger an immediate loud alert to the user: `🚨 CAPTCHA DETECTED: [Company Name] | [URL] | Please solve the captcha on screen.`
           - Wait for user completion before proceeding to submit.
         - **Step 7 (Submit Trigger):** Click the submit application button.
         - **Step 8 (Validation Error Check & Auto-Fix Loop):**
           - Check live DOM for any validation error messages or missed mandatory fields.
           - If validation errors exist: Resolve/fix the required fields using canonical profile (or prompt user/persist if new custom question under Rule 54) and re-trigger submit.
         - **Step 9 (Post-Submit Confirmation & Full-Page Screenshot - Rule 37 & 51):**
           - Assert live DOM displays explicit post-submit confirmation ("Application submitted" / "Thank you").
           - Capture and save **strictly ONE full-page confirmation screenshot** (`post_submit_[company].png`). Pre-submit/drafting screenshots are strictly banned from disk.
           - Record confirmed entry into `applied_todays_<DATE>.json` with timestamp and screenshot path.
         - **Step 10 (Immediate Tab Cleanup & Next Job - Rule 57):**
           - The exact moment submission is verified and the single post-submit screenshot is captured, **CLOSE the completed job tab immediately** and move to the next verified job.
      4. **Mandatory Portal Edge-Cases & Safety Guardrails:**
         - **Resume File Input Protocol:** Hidden file input tags (`<input type="file">`) on Ashby/Lever must be populated via direct CDP `DOM.setFileInputFiles` or programmatic file injection, never blind mouse clicks that crash or freeze.
         - **Notice Period Dropdown Rule:** Canonical notice is `15 Days`. If dropdown offers choices, select strictly: `15 days or less` > `Immediate / < 15 days` > `15` (numeric). NEVER select `1 Month` or `30 Days`.
         - **Numeric Experience Field Rule:** Experience field me default value `1.5` (ya `1.5 Years`) use karo. **Exception:** Agar portal ka field strictly integer-only input accept karta ho (decimal point allow nahi, e.g. type="number" with step="1"), tab aur sirf tab `2` enter karo. Kabhi bhi text/decimal-accepting fields me 2 mat dalna.
         - **Relocation & Work Mode Alignment:**
           * *Current location in target city?* ➔ `No` (Current is Indore, MP).
           * *Comfortable relocating immediately to target city?* ➔ `Yes` (Candidate is 100% ready to relocate).
           * *Willing to work onsite/hybrid?* ➔ `Yes`.
         - **3-Minute Single Portal Fail-Safe Timeout:** If any single portal hangs on unresolvable validation errors, spinner, or script errors for > 3 minutes, abort that job, log as `SKIPPED_FORM_TIMEOUT`, capture error log, close tab, and immediately advance to next job. Never stall the queue.
      5. **Mandatory End-of-Slot Summary Table:**
         - At 02:40 PM, output a structured Markdown table summarizing: Company, ATS Portal Type, Resume Used, Screenshot Path, Status, and Total Completed vs 40-portal slot floor.
    - **Slot 7 (02:40 PM – 03:00 PM | 20 mins): Cycle 1 Master Reconciliation, Sent Outbox Audit & Tracker Lock:**
      1. **Physical Sent Folder Sweep:** Final reconciliation of Gmail outbox to ensure every logged email is physically present.
      2. **Cycle 1 Ledger Lock & Strict Category Split:** Reconcile `applied_todays_<DATE>.json`. Ensure all submissions are attributed to their exact distinct category:
         - **Direct ATS Portal Forms** (Ashby, Greenhouse, Lever, Workable, company career forms — target: min 40 in Cycle 1)
         - **Direct Recruiter Emails** (verified company HR emails via Gmail Sent outbox)
         - **PlacementIndia Submissions** (tracked and credited in an explicit separate category, e.g. `40 Direct ATS Forms + 20 Direct Emails + 20 PlacementIndia Submissions`).
      3. **Cycle 1 Milestone Report:** Output a complete Cycle 1 status report to the user, displaying total applications, explicit category breakdown (Portals, Emails, PlacementIndia), screenshot audit verification, and clean handover to Cycle 2 kickoff at 03:00 PM.

    ### 🔹 CYCLE 2 / CHUNK 2 (03:00 PM – 07:00 PM | Afternoon Fresh Harvest, Referrals & Target Lock)
    - **Slot 1 (03:00 PM – 03:20 PM | 20 mins): Mandatory Afternoon Re-Alignment, Mid-Day Progress Review, Target Gap Briefing & End-of-Slot Summary:**
      1. **Step 0 Mandatory Refresh:** Re-verify `AGENTS.md` rules and mistake prevention checklist.
      2. **Mid-Day Progress & Gap Briefing:** Present Cycle 1 actual output vs floor target (e.g. "Cycle 1 achieved X/50 applications, remaining for Cycle 2: Y portals + Z emails to hit 100+ daily floor").
      3. **Afternoon Inbox & Pipeline Sweep (Delegated to Background Subagent):** Delegate afternoon reply sweep to background subagent (zero main-thread blocking). Check Gmail and LinkedIn for afternoon replies. Flush duplicate queues and prepare clean staging for Cycle 2.
      4. **Mandatory End-of-Slot Summary:** Summarize Cycle 1 recap, afternoon replies discovered, and exact target agenda for Slot 2 (03:20 PM) harvest.
    - **Slot 2 (03:20 PM – 04:00 PM | 40 mins): Afternoon Full Fleet MCP Execution, Deduplication & Harvest Matrix Summary:**
      1. **Full Fleet Sweep:** Re-query active MCP fleet (Greenhouse, Ashby, Lever, Workable, SmartRecruiters, YC, HN, TheirStack, The Muse, HireBase, HuntYourTribe, Career-Site, Google Jobs, Instahyre, Naukri, Foundit, and remote boards) for fresh afternoon job drops.
      2. **New Server Pipeline Check:** Audit status of the day's newly integrated/scaffolded MCP server, ensuring its endpoints are active and feeding fresh qualified leads.
      3. **Instant Historical Filtering:** Filter all harvested leads through `experience-filter.js` (0–2 YOE ceiling) and deduplicate against `total_historical_except_today.json`. Flag duplicates as `SKIPPED_DUPLICATE_HISTORICAL`.
      4. **Mandatory End-of-Slot Summary Table:** Present structured Markdown table breaking down per-server yield, historical duplicates skipped, and afternoon clean pending candidates staged for Slot 4 audit.
    - **Slot 3 (04:00 PM – 04:20 PM | 20 mins): Afternoon Live Feed Harvest (TG 20+ Channels + LinkedIn Multi-Stream + Naukri Drops) & Ingestion Summary:**
      1. **Afternoon Real-Time Multi-Channel Harvest (Mandatory Background Subagents Execution - Zero Main Agent Block):**
         - All live feed crawling, 20+ TG channel sweeps, and post scraping MUST run via background worker subagents, keeping main agent responsive.
         - **Telegram Web Network:** Sweep at least 20 active developer/recruiter channels for fresh drops strictly within the **LAST 3 DAYS**.
         - **LinkedIn Multi-Stream:** Scan live hiring posts (`past 24h`), extract verified recruiter/founder emails, and ingest fresh 0–2 YOE Easy Apply listings (max 2 tabs, human scroll).
         - **Naukri Live Drops:** Scan fresh 0–2 YOE Frontend/React cards with mandatory live posted date assert (`<= 3 to 7 days`).
      2. **Strict Live Date Check on Naukri:** Check and assert the exact posted date badge on every single Naukri card (`Posted: Just now`, `1 day ago`, `2 days ago` — <= 3 to 7 days). Any stale or reposted card is instantly dropped.
      3. **Strict Stack & Duplicate Gate:** Filter for 0–2 YOE Frontend/React/MERN only. Purge historical duplicates against `total_historical_except_today.json`.
      4. **Direct HR Email Extraction:** Separate direct recruiter email leads into `READY_FOR_DIRECT_EMAIL` queue for Slot 5 sweep.
      5. **Mandatory End-of-Slot Summary Table:** Present Markdown table of afternoon live leads harvested across all 20+ channels and boards, duplicates dropped, and total pool ready for Slot 4 Deep Physical CDP Audit.
    - **Slot 4 (04:20 PM – 05:00 PM | 40 mins): Afternoon Deep Destination JD Audit, Live Console Proof & Zero-Shortcut Staging:**
      1. **Physical Headless Destination DOM Inspection:** Fetch live JD body text for each afternoon lead directly from destination page. Zero trust on prior notes or snippets.
      2. **Live Console JD Print & Experience Assertion:** Extract experience sentences and print directly to console. Run regex for 3+, 4-6, 5+, Senior/Lead. Any role exceeding 2 YOE is instantly discarded.
      3. **Form & Domain Verification:** Assert domain resolves (HTTP 200) and page contains an active application form (not a dummy subscribe page).
      4. **Staging & Referral Prep in `verified_todays_<DATE>.json`:** Categorize verified clean roles, map authorized resumes, prepare 1st-degree connection referral outreach for Indore/Remote roles, and output structured summary table before Slot 5 at 05:00 PM.
    - **Slot 5 (05:00 PM – 05:30 PM | 30 mins): Wave 2 Direct Email Applications & Referral Outreach Sweep:**
      1. **Subagent Automated Dispatch Loop (Zero Main Agent Block):** Afternoon email dispatches run via background subagents without freezing main interaction thread.
      2. **Wave 2 Dispatches:** Shoot afternoon verified direct recruiter emails with canonical template (Rule 44) and 60s–120s randomized human delay.
      3. **1st-Degree Referral Outreach:** Send personalized dev-to-dev referral requests (English only, Rule 14) to active 1st-degree tech connections at target companies.
      4. **Physical Verification & Logging:** Assert physical presence in Gmail Sent folder and record into `applied_todays_<DATE>.json`. Output summary table before Slot 6 at 05:30 PM.
    - **Slot 6 (05:30 PM – 06:40 PM | 70 mins): Wave 2 High-Velocity ATS Portal Form Submissions (Min 40 Portals):**
      1. **Dedicated Worker Subagent with Mandatory Granular Live Activity Logs (Zero Silent Execution):**
         - Wave 2 portal execution runs via **ONE (1) DEDICATED BACKGROUND WORKER SUBAGENT**, keeping the primary agent 100% interactive.
         - **ZERO SILENT BACKGROUND RUNNING — Every step MUST be printed live in terminal/chat so user has 100% real-time visibility. Agent kabhi bhi silently background me kaam nahi karega.**
         - **Mandatory Per-Job Per-Step Live Log Format:**
           \\r
           [Job 22/40] CompanyABC — Portal URL open kiya
           [Job 22/40] CompanyABC — Live JD verify (0-2 YOE check)... Passed
           [Job 22/40] CompanyABC — Lever script detect hua, auto-filler invoke kar raha hu
           [Job 22/40] CompanyABC — Name/Email fill done
           [Job 22/40] CompanyABC — CTC fill: Current 2.16 LPA | Expected 4.65 LPA
           [Job 22/40] CompanyABC — Notice: 15 Days | Exp: 1.5 Years
           [Job 22/40] CompanyABC — Resume inject: React Developer.pdf (CDP setInputFiles)
           [Job 22/40] CompanyABC — CAPTCHA check... No CAPTCHA detected
           [Job 22/40] CompanyABC — Submit button click kiya...
           [Job 22/40] CompanyABC — DOM validation check... No errors
           [Job 22/40] CompanyABC — Confirmation detected. Screenshot saved. Tab closed. Next...
           \\r
      2. **Achieve & Exceed Daily Portal Floor (PlacementIndia Hard Banned - Rule 55):**
         - Complete at least 40 direct portal forms on Ashby, Greenhouse, Lever, Workable, and verified company career portals (PlacementIndia strictly excluded from count - Rule 55). Achieving **80+ total direct portal forms across both cycles**.
      3. **Exact Step-by-Step Portal Execution Protocol (Zero Guesswork & Zero Dropped Steps):**
         For each job staged in `verified_todays_<DATE>.json` tagged `READY_FOR_ATS_PORTAL_FORM`:
         - **Step 1 (Open One-by-One):** Open the destination job portal URL in browser.
         - **Step 2 (Re-verify Live JD):** Quickly inspect live DOM to confirm job is active and matches 0–2 YOE stack.
         - **Step 3 (Fill Form - Mandatory Engine: scripts/universal_ats_engine.cjs):**
           * **ATS Script Check:** Check if a dedicated automation script exists for the specific ATS portal (e.g. `scripts/ashby_auto_filler.mjs`, `scripts/greenhouse_auto_filler.mjs`, or Lever scripts). If available, MUST invoke that dedicated script.
           * **Fallback Manual DOM Fill:** If no dedicated script exists yet for that portal, fill the form manually via browser automation.
           * **Canonical Binding:** In both script and manual mode, strictly populate fields from `candidate_screening_profile.json` (Current CTC: `2.16 LPA` / `216000`, Expected CTC: `4.65 LPA` / `465000`, Notice: `15 Days`, Exp: `2 Years`, Education: `B.Tech CSE BUIT Bhopal 2024 7.89 CGPA`, Location: `Indore, MP`, Authorized Resume: `Frontend Engineer.pdf` / `React Developer.pdf` / `MERN Full Stack.pdf`).
         - **Step 4 (Cross-Verify Data):** Cross-check all populated fields against canonical profile before triggering submit.
         - **Step 5 (Mandatory Terminal Logging):** Log all populated field values and screening answers into the terminal/console so there is 100% transparency.
         - **Step 6 (CAPTCHA Guardrail & User Alert - Rule 56):**
           - If a CAPTCHA (reCAPTCHA, Cloudflare Turnstile, hCaptcha) is detected: **STOP & WAIT**.
           - Trigger an immediate loud alert to the user: `🚨 CAPTCHA DETECTED: [Company Name] | [URL] | Please solve the captcha on screen.`
           - Wait for user completion before proceeding to submit.
         - **Step 7 (Submit Trigger):** Click the submit application button.
         - **Step 8 (Validation Error Check & Auto-Fix Loop):**
           - Check live DOM for any validation error messages or missed mandatory fields.
           - If validation errors exist: Resolve/fix the required fields using canonical profile (or prompt user/persist if new custom question under Rule 54) and re-trigger submit.
         - **Step 9 (Post-Submit Confirmation & Full-Page Screenshot - Rule 37 & 51):**
           - Assert live DOM displays explicit post-submit confirmation ("Application submitted" / "Thank you").
           - Capture and save **strictly ONE full-page confirmation screenshot** (`post_submit_[company].png`). Pre-submit/drafting screenshots are strictly banned from disk.
           - Record confirmed entry into `applied_todays_<DATE>.json` with timestamp and screenshot path.
         - **Step 10 (Immediate Tab Cleanup & Next Job - Rule 57):**
           - The exact moment submission is verified and the single post-submit screenshot is captured, **CLOSE the completed job tab immediately** and move to the next verified job.
      4. **Mandatory Portal Edge-Cases & Safety Guardrails:**
         - **Resume File Input Protocol:** Hidden file input tags (`<input type="file">`) on Ashby/Lever must be populated via direct CDP `DOM.setFileInputFiles` or programmatic file injection, never blind mouse clicks that crash or freeze.
         - **Notice Period Dropdown Rule:** Canonical notice is `15 Days`. If dropdown offers choices, select strictly: `15 days or less` > `Immediate / < 15 days` > `15` (numeric). NEVER select `1 Month` or `30 Days`.
         - **Numeric Experience Field Rule:** Experience field me default value `1.5` (ya `1.5 Years`) use karo. **Exception:** Agar portal ka field strictly integer-only input accept karta ho (decimal point allow nahi, e.g. type="number" with step="1"), tab aur sirf tab `2` enter karo. Kabhi bhi text/decimal-accepting fields me 2 mat dalna.
         - **Relocation & Work Mode Alignment:**
           * *Current location in target city?* ➔ `No` (Current is Indore, MP).
           * *Comfortable relocating immediately to target city?* ➔ `Yes` (Candidate is 100% ready to relocate).
           * *Willing to work onsite/hybrid?* ➔ `Yes`.
         - **3-Minute Single Portal Fail-Safe Timeout:** If any single portal hangs on unresolvable validation errors, spinner, or script errors for > 3 minutes, abort that job, log as `SKIPPED_FORM_TIMEOUT`, capture error log, close tab, and immediately advance to next job. Never stall the queue.
      5. **Mandatory End-of-Slot Progress Briefing & Summary Table:**
         - At 06:40 PM, output a structured Markdown table summarizing: Company, ATS Portal Type, Resume Used, Screenshot Path, Status, and Total Day Portals Completed vs 80-portal daily floor.
    - **Slot 7 (06:40 PM – 07:00 PM | 20 mins): Final Evening Master Audit & 5-File Lifecycle Rollover Protocol:
      1. **Full-Day Target Floor Audit & Explicit Category Split:**
         - Verify 100+ daily applied floor with transparent reporting across all channels:
           * **Direct ATS Portal Forms:** Ashby, Greenhouse, Lever, Workable, SmartRecruiters, company career pages (target: min 80 across both cycles).
           * **Direct Recruiter Emails:** Verified company HR emails via Gmail Sent folder.
           * **PlacementIndia Submissions:** Explicitly tracked and reported as a separate category (e.g. Scorecard: 80 Direct ATS Portals + 25 Direct Emails + 30 PlacementIndia Submissions).
      2. **Mandatory 5-File Rollover Protocol (Rule 52):**
         - Merge pplied_todays_<DATE>.json into pplied_lifetime_except_today.json.
         - Merge all processed jobs from 	otal_todays_<DATE>.json (both applied and skipped) into 	otal_historical_except_today.json.
         - Safely archive the daily date files (	otal_todays_<DATE>.json, erified_todays_<DATE>.json, pplied_todays_<DATE>.json) into data/daily_archives/ so tomorrow's session starts with pristine fresh daily files.
         - **Directory Auto-Creation Guardrail:** Execution script MUST assert directory existence via s.mkdirSync('data/daily_archives', { recursive: true }) before moving files so archive operation never fails.
      3. **Lock Master Daily Summary Report:** Present final full-day scorecard table to the user before wrapping up the day.
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
38. **Permanent 2-Cycle 7-Slot Daily Architecture (Master Schedule of Record).**
    - The daily job hunt strictly operates on a **Twice-a-Day (2-Cycle) 7-Slot Architecture** (8 hours total, 4h per cycle):
      - **Morning Cycle 1:** 11:00 AM – 03:00 PM IST
      - **Afternoon Cycle 2:** 03:00 PM – 07:00 PM IST
    - **Exact Slot Breakdown (Per 4-Hour Cycle):**
      - **Slot 1 (20m):** **Mandatory Step 0 Rule & Mistakes Log Reading** (`AGENTS.md` + `WEEKLY_MISTAKES_AND_ACCOUNTABILITY_LOG.md` compulsory before any action), 5-Min Heartbeat Start, Inbox Review & Blacklist Audit (11:00–11:20 AM / 03:00–03:20 PM)
      - **Slot 2 (40m):** Pure 23 MCP ATS Server Execution & Sweep (11:20 AM–12:00 PM / 03:20–04:00 PM)
      - **Slot 3 (20m):** Dedicated Live Feeds Sourcing (TG + LI + Naukri) (12:00–12:20 PM / 04:00–04:20 PM)
      - **Slot 4 (40m):** Physical CDP Audit, 0-2 YOE Filtering & Resume Matching (12:20–01:00 PM / 04:20–05:00 PM)
      - **Slot 5 (30m):** Direct Email Dispatches with Random 40s–120s Jitter Cooldown (01:00–01:30 PM / 05:00–05:30 PM)
      - **Slot 6 (70m):** Direct ATS Portal Forms (Ashby, Greenhouse, Lever) Form Fill Window (01:30–02:40 PM / 05:30–06:40 PM)
      - **Slot 7 (20m):** Cycle Audit, Sent Outbox Verification & Tracker Lock (02:40–03:00 PM / 06:40–07:00 PM)
39. **Strict Minimal JSON Architecture (No Faltu Redundant JSONs).**
    - The repository strictly maintains only these standardized core tracking files:
      1. [`weekly_applied.json`](file:///C:/mcp/job-search-mcp-engine/weekly_applied.json) ➔ Master record of all verified applied jobs across the week/lifetime.
      2. [`todays_applied.json`](file:///C:/mcp/job-search-mcp-engine/todays_applied.json) ➔ Strictly today's verified applications (with proof, timestamps, and channels).
      3. [`discovered_jobs_7days.json`](file:///C:/mcp/job-search-mcp-engine/discovered_jobs_7days.json) ➔ 7-day unified registry of all discovered leads tagged with `APPLIED` or `SKIPPED` (used to instantly discard duplicates on future server runs).
      4. **Daily Scraper & Verified Pool JSONs:** Scraper outputs (e.g. `raw_scraped_*.json`) and their filtered verified candidates (`verified_pool_*.json`) generated during daily slots.
    - Zero redundant intermediate queues or stray JSON files allowed. All scrapers verify against `discovered_jobs_7days.json` first before staging.

40. **Dedicated Full JD Body Deep Verification Slot (Slot 4: 12:20–01:00 PM & 04:20–05:00 PM) + Time-Proportional Buffer Utilization.**
    - Deep JD body verification (opening live job description pages, parsing DOM text, verifying 0–2 YOE ceiling, checking tech stack keywords, and disqualifying unpaid internships or staffing middle-men) is strictly executed in **Slot 4 (40 minutes duration)** of each cycle.
    - **Buffer / Free Time Utilization (Thorough & Unrushed Pacing):** Whenever a slot finishes early and there is buffer time before the next slot starts, NEVER stay idle, but NEVER rush. Deep DOM verification takes real time (page load, parsing DOM text, checking posting age badge, asserting 0–2 YOE ceiling, checking tech stack keywords, and filtering unpaid/staffing traps). Trying to do 2–3 roles in 5 minutes leads to superficial mistakes. Realistic budget is ~3–5 minutes per role:
      - 3–5 minutes buffer left ➔ pick **ONLY 1 role** and verify it with 100% thoroughness.
      - 6–10 minutes buffer left ➔ pick **ONLY 2 roles**.
      Every picked role must have a permanent sealed verdict before moving on: either **APPROVED** (staged for apply) or **SKIPPED** (tagged in `discovered_jobs_7days.json` with clear reason). Zero rushed or superficial checks.
    - No role moves to Slot 5 (Emails) or Slot 6 (ATS Forms) without passing Slot 4 deep JD assertion.

41. **STRICT ZERO-APPLICATION WITHOUT LIVE DOM DEEP VERIFICATION (CRITICAL MISTAKE RECORDED).**
    - **CRITICAL MISTAKE AUDITED (2026-10-12):** Agent attempted application to stale listings (e.g., LightSpun posted 3 months ago with 3+ YOE) relying on superficial card snippets without full DOM text inspection.
    - **MANDATORY HARD BARRIER:**
      1. **Posting Freshness Ceiling:** Strictly <= 7 days old. Any posting marked "3 weeks ago", "1 month ago", "2 months ago", "3 months ago", or older is IMMEDIATELY DISCARDED and indexed as `SKIPPED` in `discovered_jobs_7days.json`.
      2. **Experience Ceiling:** Strictly <= 2 years. Any role requiring 3+, 4+, 5+ years is IMMEDIATELY DISCARDED and indexed as `SKIPPED`.
      3. **Zero Blind Apply:** Never trigger Easy Apply, ATS form submit, or direct email dispatch without physically loading the target URL in Puppeteer/CDP and asserting both freshness and 0-2 YOE ceiling in the rendered DOM text.

42. **STRICT ZERO-GENERIC COMPANY NAME & PRE-FLIGHT EMAIL ASSERTION (CRITICAL BLUNDER RECORDED).**
    - **CRITICAL MISTAKE AUDITED (2026-10-12):** Agent dispatched emails containing embarrassing, unprofessional greetings like `"Hi Gmail Hiring Team"`, `"Hi Hotbitinfosoft Hiring Team"`, and blindly extracted emails from chat group text dumps without company verification.
    - **MANDATORY HARD BARRIER:**
      1. **Permanent Blacklist of Banned Salutations:** Strings containing `gmail`, `yahoo`, `hotmail`, `outlook`, `direct linkedin lead`, `tech firm`, `unknown`, `null` are **PERMANENTLY FORBIDDEN** in any email body or salutation. Any dispatch script generating such a string must immediately abort and throw a fatal error.
      2. **Pre-Flight 4-Point Assertion Before Click:** Every email compose session MUST physically assert:
         - Exact Verified Company Name (matched to official website or registered company entity).
         - Exact Role Title (matching candidate specialization: Frontend / React / MERN).
         - Exact Salutation: `Hi [Actual Verified Company] Hiring Team,`.
         - Single Canonical Resume attached (strictly from `/resumes`: `Frontend Engineer`, `React Developer`, or `MERN Full Stack`).
      3. **Zero Regex-Dump Sourcing:** Never dump raw unverified email lists from chat groups into dispatch queues. Every target must be an independently verified, open 0–2 YOE job description.

44. **PERMANENT IMMUTABLE CANONICAL EMAIL BODY (STRICT HARD RULE - USER SEALED 2026-10-12).**
    - **MANDATORY POLICY:**
      - The email body is **100% FIXED & IMMUTABLE**. The agent is strictly **FORBIDDEN** from adding bullet points, rewriting paragraphs, or altering any text.
      - **EXACT SEALED CANONICAL TEMPLATE (NO VARIATION PERMITTED):**
```text
Hi ${company} Hiring Team,

I came across your opening for a ${role} and wanted to apply for the role.

I'm a Full Stack Developer with 1.5 years of experience building full-stack web applications using React.js, Node.js, Express.js, MongoDB, TypeScript, REST APIs, and modern frontend & backend architectures.

I'm based in Indore and would be glad to discuss the opportunity further.

I've attached my updated resume for your review.

LinkedIn: https://www.linkedin.com/in/pratik-patidar
Portfolio: https://pratik-portfolio-nine-orcin.vercel.app

Thanks & Regards,
Pratik Patidar
pratikpatidar7990@gmail.com
+91 82696 47990
```

45. **STRICT ZERO-PREMATURE SLOT EXECUTION & AT LEAST 100 FLOOR (USER SEALED 2026-10-14).**
    - **MANDATORY POLICY:**
      - **Slot Start Time Hard Boundary:** Koi bhi slot apne scheduled start time ke pehle run nahi hoga (**Zero Premature Slot Execution**). E.g., Slot 2 (11:20 AM) can NEVER start before 11:20:00 AM IST. Dispatches (Slot 5: 01:00 PM) can NEVER fire before 01:00:00 PM IST.
      - **Goal Definition:** Daily goal is strictly **AT LEAST 100 APPLICATIONS (100+ Floor with minimum 40 Portal Forms)**, never an artificial cap. Shift 1 aims for the maximum output without capping.
      - **Buffer Utilization Within Slot:** If a slot finishes its specific task early, it CANNOT prematurely leap to the next scheduled slot. It must remain in deep JD audit, blacklist verification, or clean heartbeat monitoring until the clock reaches the next slot's exact start time.

46. **ABSOLUTE STEP -1: ZERO-DELAY 5-MIN RECURRING HEARTBEAT ON DAY/SESSION START (USER SEALED 2026-10-14).**
    - **MANDATORY POLICY:**
      - **Absolute First Tool Action:** Jab bhi conversation ya new day start ho, assistant ka SABSE PEHLA tool call `schedule` chala kar 5-minute recurring heartbeat (`*/5 * * * *`) ON karna hi hoga — rules padhne se bhi pehle! Agar assistant ruk jaye ya context lost ho, toh yahi heartbeat wake-up trigger bankar pipeline ko wapas drive karegi.
      - **Uncompromising Step 0 (Zero Shortcuts):** Heartbeat ON hote hi turant `AGENTS.md` AND `WEEKLY_MISTAKES_AND_ACCOUNTABILITY_LOG.md` padhna 100% compulsory hai.
      - **Free Buffer Time Policy:** Jab kisi slot ka primary task complete ho jaye aur scheduled start time tak buffer bache, free time me strictly LinkedIn feed surf karke 0–2 YOE Frontend/React best-fit posts extract karna hai (background subagent me, zero main thread block).
  47. **Mandatory Deep Destination Audit for Aggregators (Zero Surface Trust Rule — User Sealed 2026-10-13):**
      - Aggregators like Adzuna often index dead postings and display superficial recent timestamps on their own pages while pointing to years-old jobs (e.g. Cutshort job posted in 2022 masquerading as fresh).
      - **Strict Requirement:** NEVER trust surface-level aggregator metadata or dates. Every aggregator URL MUST be followed through its redirect (`Apply for this job` / `/land/ad/`) to the true destination portal (Cutshort, Naukri, Company ATS).
      - The destination page MUST be DOM-asserted for: (1) Active status (`isClosed: false`), (2) True original posting date (`<= 7 days old`), (3) Exact experience requirement (`0–2 YOE`). Any listing pointing to an expired page or prior years (2020–2025) is PERMANENTLY DROPPED immediately.

   52. **Mandatory 5-File Architecture & Evening Rollover Protocol (User Sealed 2026-10-14):**
       - **File 1 (	otal_historical_except_today.json):** Master blacklist of all jobs seen/applied/skipped prior to today. Zero duplicate gate.
       - **File 2 (pplied_lifetime_except_today.json):** Master historical ledger of all completed submissions prior to today.
       - **File 3 (	otal_todays_<DATE>.json):** Daily raw findings. When adding, cross-check against 	otal_historical_except_today.json. If present, mark SKIPPED_DUPLICATE_HISTORICAL.
       - **File 4 (erified_todays_<DATE>.json):** Clean verified active jobs for today (active Apply button, fresh posted date <= 7 days, 0-2 YOE, strictly absent from historical).
       - **File 5 (pplied_todays_<DATE>.json):** Daily ledger of successful submissions (with physical screenshot proof and DOM confirmation).
       - **Evening Rollover (Slot 7 | 06:40 PM – 07:00 PM):**
         1. Merge pplied_todays_<DATE>.json into pplied_lifetime_except_today.json.
         2. Merge all processed entries from 	otal_todays_<DATE>.json (applied + skipped) into 	otal_historical_except_today.json.
         3. Safely delete/archive the <DATE> daily files so the next day begins with fresh daily files.


   54. **STRICT CANONICAL SCREENING DATA BINDING & PERSISTENCE (RULE 54 - ZERO GUESSWORK LAW):**
       - **Single Source of Truth:** `candidate_screening_profile.json` (and `.env` profile variables) is the SOLE authorized source for candidate salary, notice period, experience, education, and screening fields.
       - **Zero Guesswork / Hard Ban on Self-Made Answers:** Any script, agent, or subagent populating portal forms (SolveByte, Ashby, Greenhouse, Lever, Workable, etc.) is strictly **FORBIDDEN** from guessing, assuming, or typing arbitrary values from imagination. Every answer MUST be read directly from `candidate_screening_profile.json`.
       - **Immutable Canonical Baseline:**
         - **Name:** `Pratik Patidar`
         - **Email:** `pratikpatidar7990@gmail.com`
         - **Phone:** `+91 82696 47990` (Raw: `8269647990`)
         - **Current CTC:** `2.16 LPA` (Raw: `216000` / `₹2,16,000`)
         - **Expected CTC:** `4.65 LPA` (Raw: `465000` / `₹4,65,000`)
         - **Notice Period:** `15 Days`
         - **Total Experience:** `2 Years` (1.5–2 YOE)
         - **Preferred Location:** `Indore, MP` (Open to immediate relocation PAN-India / Remote)
         - **Education:** B.Tech CSE (BUIT Bhopal, 2024, 7.89 CGPA)
       - **Dynamic Learning & Persistence Protocol:** If a new form asks a previously unseen screening question (e.g. specific custom question, dropdown, or screening prompt), the agent/script MUST:
         1. Check with user or verify canonical alignment.
         2. Immediately append/persist the approved answer into `candidate_screening_profile.json` under `custom_form_responses_learned`.
         3. Future scripts/agents will read this persisted entry so the candidate is never asked the same screening question twice and no agent ever hallucinates.

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
- **Location priority**: **PAN-INDIA FIRST PRIORITY** (Bangalore, Pune, Hyderabad, Gurgaon/Noida, Mumbai, Ahmedabad, Indore, Remote — Candidate is 100% open to immediate relocation anywhere in India to secure a role).
- **Freshness**: posted within <= 7 days. Internships always excluded, no exceptions.
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

### Rule 53: Post-Slot 4 Instant Direct Email Dispatch
- **Trigger**: Agar Slot 4 (Deep CDP Physical Audit) already execute ho chuka hai ya din me kisi bhi time koi fresh verified direct email lead discover hoti hai (Telegram / LinkedIn / Referrals).
- **Mandatory Action**: Usey kisi agle cycle ya slot ka wait karne ke liye queue me hold par NAHI rakhna hai. Usey INSTANTLY dispatch karna hai.
- **Protocol**:
  1. Instant verify: JD stack matches 0-2 YOE Frontend/React/MERN, check duplication against total_historical_except_today.json.
  2. Instant dispatch via Gmail CDP with exact immutable template and correct resume.
  3. Assert physical confirmation in Gmail Sent folder (no screenshots saved for emails).
  4. Append confirmed submission into applied_todays_<DATE>.json immediately.


### Rule 54: Post-Submit Confirmation Screenshots Only (Strict Cleanliness)
- Portal forms par keval aur keval **final successful post-submit confirmation (Thank You / Application Submitted) page** ka hi screenshot save karna hai.
- Pre-submit, pre-filled, ya drafting screenshots save karna strictly banned hai (disk clean rakhna mandatory hai).
- Email applications ke liye koi bhi screenshot save nahi karna hai (Gmail Sent folder physical assertion hi proof hai).

### Rule 55: PlacementIndia Hard Ban from Applied Count
- PlacementIndia par application submission ko pplied_todays_<DATE>.json ya daily applied quota me bilkul count NAHI karna hai.
- PlacementIndia listings unverified staffing/phantom leads create karti hain. Pure focus sirf real direct company ATS portals (Ashby, Greenhouse, Lever, Workable, direct company career forms) aur direct company HR emails par hi rahega.

### Rule 56: Mandatory Live Captcha User Alert Protocol
- Jab bhi koi direct portal form automated script se fill ho jaye aur submit karne ke liye CAPTCHA (reCAPTCHA, Cloudflare Turnstile, hCaptcha) require ho, agent TURANT user ko high-priority alert dega.
- Alert me Tab Name, URL, aur action explicitly mention hoga. User ke tick/solve karte hi DOM confirmation check karke post-submit screenshot capture karega.

### Rule 57: Immediate Post-Apply Tab Cleanup Protocol
- Jaise hi kisi company ka portal form 100% submit ho jaye aur post-submit screenshot capture ho jaye, us application tab ko BROWSER SE TURANT CLOSE kar dena hai.
- Browser me keval wahi tabs open rahengi jo current batch me pending hain (CAPTCHA solve ya review ke liye) ya next target portal hain. Finished/submitted portals aur unverified/banned aggregator tabs ko kabhi bhi open nahi chhodna hai.

60. **INSTANT TAB KILL ON 3+ YOE / STALE DETECT (ZERO SECOND HESITATION - USER SEALED):**
    - **Policy:** Jaise hi live destination JD me 3+, 3-5, 3-6, 4-6, 5-7, Senior, Lead ya stale date (>7 days / purane saal) detect ho, script/agent bina ek second gawaye tab ko **TURANT CLOSE/KILL** karega.
    - Zero surface investigation, zero form navigation. Direct status `SKIPPED_OUT_OF_RANGE_YOE` ya `SKIPPED_STALE_JOB` log karke agle verified job par switch karega.

61. **LINKEDIN MAX-2 TABS HARD CEILING & TAB STACK PREVENTION:**
    - **Hard Limit:** Browser me kisi bhi condition me 2 se zyada LinkedIn tabs open nahi reh sakti. Script agar new tab kholegi toh pehle existing extra tabs ko physically close/kill karegi. 13 tabs jaisa explosion account ko instant restricted kar sakta hai.

62. **STRICT +91 INDIA COUNTRY CODE & ZERO ARBITRARY FORM ANSWERS:**
    - Country code dropdown me strictly `India (+91)` / `IN (+91)` hi select hoga. Dropdown selector me exact code match assertion zaroori hai (avoiding British Indian Ocean Territory +246).
    - Screening dropdowns/questions me agent man se kuch nahi bharega — unlisted fields user se puch kar `candidate_screening_profile.json` me update hongi.

63. **WHATSAPP RECRUITER ENGAGEMENT AUTOMATION PROTOCOL (USER SEALED):**
    - **Policy:** Recruiter ke WhatsApp follow-ups aur shortlist responses ko baar-baar scratch se karne ke bajay dedicated automated scripts use karna compulsory hai:
      * **Live Chat Reader:** `node scripts/whatsapp/wa_read_chat.cjs [phone]` ➔ Recruiter ne kya format/details mangi hain use instant parse karne ke liye.
      * **Auto-Reply & Profile Dispatcher:** `node scripts/whatsapp/wa_reply_recruiter.cjs [phone]` ➔ Canonical screening profile se data lekar clean formatted multiline message WhatsApp input me type karne ke liye.
    - **Format Mandate:** Message bilkul natural aur human-written dev tone me hona chahiye (no AI robotic templates).
    - **CV Document Rule:** WhatsApp Web me resume share karte waqt directly document attachment format use karo ya portfolio/PDF link use karo taaki media type rejection na ho.

64. **CANDIDATE MULTI-PLATFORM PROFILE 100% ENHANCEMENT & DAILY REFRESH PROTOCOL (USER SEALED):**
    - **Policy:** Slot 5 ke dauran (01:00 PM – 01:30 PM / 05:00 PM – 05:30 PM), jab dedicated subagent direct verified recruiter emails dispatch kar raha hoga, agent parallel me candidate profiles ko **100% complete aur daily refresh/enhance** karega strictly one-by-one Chrome port 9222 par:
      * **Platforms Covered:** LinkedIn, Naukri, Cutshort, Hirist, Wellfound.
      * **Daily Maintenance Routine:**
        1. **Naukri & Cutshort Daily Profile Ping:** Headline/Key skills me subtle refresh touch (re-saving headline/summary) taaki candidate algorithm me "Active Today" flag ho aur recruiters ko search feed me top par dikhe.
        2. **100% Completeness Audit:** Check karo ki missing sections (headline, key skills, resume attachment, current/expected CTC, notice period, location preference, portfolio & GitHub links) complete aur updated hain according to `candidate_screening_profile.json`.
        3. **LinkedIn Daily Activity Refresh:** Profile headline aur "Open to Work" status verify karo.
      * **Execution Engine:** Script `scripts/profile_maintenance/daily_profile_enhancer.cjs` ke through execute hoga bina parallel email dispatch ko interrupt kiye.

65. **MANDATORY DEFAULT BROWSER SPECIFICATION — BRAVE BROWSER (PORT 9222):**
    - Browser automation, CDP remote debugging, and live tab inspection ke liye default browser **BRAVE BROWSER** hai (Google Chrome nahi).
    - **Exact Launch Command:**
      `"C:\Users\LENOVO\AppData\Local\BraveSoftware\Brave-Browser\Application\brave.exe" --remote-debugging-port=9222 --restore-last-session`
    - Automation scripts and puppeteer connect calls (`http://127.0.0.1:9222`) will attach to this running Brave instance.
    - Whenever starting or verifying browser connection, agent and user must use this exact Brave path and arguments.

66. **RULE 70: MANDATORY FORM FIELD PRE-FILL RESET (ZERO CONCATENATION BUG):**
    - Har automated form filler script me kisi bhi text input me type karne se pehle us field ko 100% EMPTY reset karna compulsory hai:
      `input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));`
    - Kabhi bhi seedha `.type()` nahi lagana hai, warna browser ka auto-fill ya cached text duplicate ho jayega (`PratiPratik`, double phone number).

67. **RULE 71: ZERO MAIN AGENT BLOCKING — ABSOLUTE SUBAGENT DELEGATION GATE:**
    - Main agent thread browser automation, tab interaction, ya form filling ke dauran KABHI BHI block nahi hoga.
    - Browser automation hamesha isolated background subagent (`invoke_subagent`) ke through hi execute hogi. Main agent hamesha free rahega aur user ko live terminal logs forward karega.

68. **RULE 72: ZERO SLOT SKIPPING / PENDING SLOT RECOVERY MANDATE (JUST INFORM & RUN):**
    - Even if the scheduled clock time for a slot has passed, if any previous slot in the cycle sequence is pending or was not executed/completed, the agent is **STRICTLY FORBIDDEN from jumping ahead or skipping it**.
    - The agent MUST immediately inform the user that the pending slot is being recovered, and execute that pending slot first before advancing to subsequent slots.

69. **RULE 73: IDLE BUFFER PRODUCTIVE UTILIZATION MANDATE (ZERO IDLE TIME):**
    - Agar kisi bhi slot ka primary kaam scheduled window khatam hone se pehle complete ho jaye aur next slot shuru hone tak buffer/free time bache, system **KABHI BHI idle baith kar wait nahi karega**.
    - Heartbeat aur subagent background me us bache hue buffer time ko immediately **LinkedIn posts, Naukri, and Indeed** surf karne me lagayenge taaki fresh recruiter posts, hiring announcements, aur relevant 0-2 YOE direct email/form leads discover karke pool me ingest kiye ja sakein.
    - **Continuous Multi-Source Fallback:** Agar koi ek source (jaise LinkedIn) guest/logged-out state ya throttle detect kare, surfing **KABHI BHI stop nahi hogi** — script turant agle source (Naukri, Indeed, Google Jobs) par auto-switch karegi aur jab tak agle slot ka clock time nahi aata, non-stop loops me leads dhundhti rahegi.


70. **RULE 74: CANDIDATE IDENTITY ASSERTION & ZERO WRONG-ACCOUNT AUDIT MANDATE:**
    - Har script jo browser, Gmail, LinkedIn ya candidate profile inspect karegi, wo execution shuru karte hi sabse pehle strictly candidate identity assert karegi: `pratikpatidar7990@gmail.com` / Pratik Patidar.
    - Agar koi doosra account (e.g. `nakmeisiliya12@gmail.com`) khula ho, script usey audit ya outreach ke liye strictly ignore/close karegi aur candidate account `https://mail.google.com/mail/u/?authuser=pratikpatidar7990@gmail.com` assert karegi.
    - Inbox review me raw `slice(0, N)` shortcuts strictly banned hain — real message text, unread flags, recruiter interview/test detection, aur mailer-daemon bounce blacklisting compulsory hai.

71. **RULE 75: MANDATORY DUAL-CHANNEL SLOT 1 AUDIT (GMAIL + LINKEDIN DMS):**
    - Slot 1 (11:00 AM – 11:20 AM) ke dauran communication audit sirf Gmail tak seemit nahi rahega.
    - Script aur agent ko **DONO CHANNELS** ek sath audit karna compulsory hai:
      1. **Gmail Deep Audit:** `scripts/audit_pratik_gmail.cjs` chala kar unread emails, test invitations, aur recruiter replies detect karna.
      2. **LinkedIn DMs Audit:** `scripts/extract_dms_pure.cjs` chala kar direct messages, unread flags, referral responses (e.g. Keerti Chourasiya, recruiters) ko live capture karna.
      3. Kisi bhi ek channel ko chhodna strict system failure mana jayega.

72. **RULE 76: SAME-PORTAL / SAME-COMPANY ANTI-SPAM INTERLEAVING MANDATE:**
    - Ek hi company ya specific ATS portal domain par back-to-back multiple applications submit karna **STRICTLY FORBIDDEN** hai (warna portal IP/email block kar dega).
    - Queue ko strictly round-robin format me interleave karna mandatory hai: `[Tech ATS ➔ Naukri ➔ Indeed ➔ LinkedIn ➔ Tech ATS ...]`.
    - Same company ko agla application submit karne se pehle minimum 15-20 mins ka cooldown gap hona compulsory hai.

73. **RULE 77: MANDATORY PHYSICAL FORM-PRESENCE ASSERTION GATE (ZERO TEXT-ONLY AUDIT):**
    - Slot 4 audit me kisi bhi job ko sirf JD text (0-2 YOE ya fresh date) padhkar `VERIFIED_AUDITED` (File 4) me add karna **STRICTLY PROHIBITED** hai.
    - Destination page par physically ek active submittable application form (`input[type="file"]`, `form`, explicit native apply button, ya embedded iframe) ka assertion mandatory hai. Agar form nahi hai ya multi-hop aggregator redirect loop hai, usey primary ATS portal pool me add nahi kiya jayega.

74. **RULE 78: STRICT SEPARATION OF TRUE ATS VS AGGREGATOR REDIRECTS:**
    - **Primary ATS Pool:** Pure direct company ATS forms (Ashby, Greenhouse, Lever, Kula, Workable, direct company career forms) ko hi Slot 6 ke primary direct apply pool me rakha jayega.
    - **Aggregator Redirects:** Adzuna, Jobicy, aur indirect job boards ko primary pool se alag rakha jayega aur dedicated destination resolver scripts ke through hi handle kiya jayega.
    - **Pre-Slot Enforcement:** Har slot shuru hone se pehle `node scripts/pre_slot_gatekeeper_assertion.cjs` execute karke rules ki live assertion print karna mandatory hai.

75. **RULE 79: MANDATORY MULTI-STEP APPLICATION STEPPER LOOP:**
    - Kisi bhi form application (Indeed, Workable, SmartRecruiters, Job Portals) me single-click submission assume karna strictly banned hai.
    - Script ko strictly multi-step wizard stepper loop (`while (!isConfirmed)`) chalana compulsory hai jo step-by-step:
      1. Contact details ➔ Next/Continue
      2. Resume selection ➔ Next/Continue
      3. Screening questions (CTC, notice period, location) ➔ Next/Review
      4. Final Review page ➔ "Submit Application" click kare jab tak live DOM confirmation assert na ho jaye.

77. **RULE 81: STRICT BAN ON CLOSING USER TABS / UNOPENED TABS (ISOLATION MANDATE):**
    - Script ya automation agent **KABHI BHI aisi kisi tab ko touch ya close nahi karega jo usne khud us specific execution turn me create nahi ki**.
    - Blind loops jaise `for (let i = 1; i < pages.length; i++) pages[i].close()` **STRICTLY FORBIDDEN & BANNED** hain.
    - Browser me user ka personal work, docs, research, ya candidate tabs khuli ho sakti hain. Automation ka user tabs band karna unpardonable violation hai.
    - Automation sirf aur sirf wahi tab touch/close karegi jo:
      1. Us specific script ne `browser.newPage()` se open ki ho, YA
      2. Script ke user-approved action par open hui target tab ho.
      3. Script exit hone se pehle sirf apni opened tab ko close karegi, user ki existing tabs ko 100% untouched chhodegi.

78. **RULE 82: STRICT COMPENSATION & SALARY FLOOR GATE (ZERO UNPAID / LOW STIPEND):**
    - Candidate Pratik Patidar (1.5 YOE, Current CTC ₹2.16 LPA, Expected ₹4.65 LPA) ke liye **unpaid internships ya low stipends (< ₹20,000/month ya < ₹3.0 LPA)** strictly prohibited hain.
    - Sourcing aur Audit me agar kisi job description me stipend `₹3000 - ₹10000`, unpaid, ya below floor salary dikhe ➔ Turant drop: `SKIPPED_BELOW_SALARY_FLOOR`.

79. **RULE 83: VERBATIM PROMPT COMPREHENSION & BOUNDARY GATE (ZERO RUNNING AHEAD):**
    - Agent kisi bhi tool call ya script chalane se pehle user ke prompt ko word-by-word padhega.
    - Agar user ne kaha *"baad me fix krna pehle flow complete kr"*, toh agent peripheral fixes me ulajh kar main thread ko block nahi karega.
    - User ke direct command ke boundary ke bahar ek kadam bhi aage nahi bhagega.

80. **RULE 84: MANDATORY STEALTH SCREEN-TRACKER PROTECTION & SYNCHRONIZED COMPILER/NESTJS PROMPTS:**
    - Har session/day start par agent sabse pehle user se screen-tracker (screenshot monitoring) status aur exact timestamp verify karega.
    - Automation aur heartbeat cron prompts me KABHI BHI job application, ATS ya bot related text nahi hoga. Prompts hamesha NestJS/Compiler build logs format me rahenge.
    - Screenshots window time ke dauran foreground me koi job portal ya form khula nahi rahega — background CDP interaction ke baad tab turant close hogi aur active window code/work tab rahegi.

81. **RULE 85: SOURCING INTEGRITY GATE — ZERO DROP ON MISSING EMAIL/LINK (FRESHNESS + STACK + YOE ONLY):**
    - Sourcing stage (Telegram, LinkedIn posts, communities) par post ko sirf is bina par drop karna ki *"email ya apply link nahi mila"* **STRICTLY PROHIBITED & BANNED** hai.
    - Sourcing eligibility ke strictly 3 core invariants hain: Freshness (24h - 7d), Role & Stack (Frontend/React/Next.js/TypeScript/MERN), aur Experience (0-2 YOE). Agar email nahi hai par *"DM me"* likha hai, toh use `Direct Recruiter Outreach Lead` ki tarah stage kiya jayega.

82. **RULE 86: LINKEDIN STRICT HUMAN-TYPE EMULATION & BOT-FLAG PROTECTION MANDATE:**
    - Jab bhi system LinkedIn par koi action, search, DM check ya post inspection karega, wo **KABHI BHI robotic machine speed ya automated AI scraper ki tarah behave nahi karega**.
    - Account ban aur bot flagging protection ke liye **Human Emulation Invariants MANDATORY** hain:
      1. **Human Pacing & Jitter Delays:** Har click, tab switch, ya page navigation ke beech realistic human pause zaroori hai (3s–7s between clicks, 15s–30s between major sections). Blind zero-delay loops strictly banned hain.
      2. **Natural Smooth Scrolling:** Post ya thread inspect karne ke liye instant `scrollTop = 0` ya instant jumps ke bajay smooth gradual scrolling (`window.scrollBy({ top: 300, behavior: 'smooth' })` with 1-2s pauses) simulate karni hai taaki LinkedIn telemetry human scroll pattern record kare.
      3. **Human Keystroke Simulation:** Agar LinkedIn par kisi search bar ya field me type karna ho, instantaneous value dump ke bajay natural human keyboard typing delay (`page.keyboard.type(text, { delay: 50 + Math.floor(Math.random() * 50) })`) use karni hai.
      4. **Strict Tab Ceiling & Immediate Tab Pruning (Rule 61):** At any given second, LinkedIn ki maximum 2 tabs hi open ho sakti hain. Post inspect ya profile check karte hi target tab ko TURANT close karna mandatory hai.
      5. **Zero High-Frequency Search Loops:** Automated multi-page search scraping live account par run karna strictly prohibited hai.



