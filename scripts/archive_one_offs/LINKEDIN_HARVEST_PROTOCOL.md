# LINKEDIN LIVE FEED & RECRUITER POST HARVESTING PROTOCOL

> **Single Source of Truth & Execution Playbook for Automated, Rate-Limited, and Account-Safe LinkedIn Job Sourcing**

---

## 🚨 CRITICAL ACCOUNT SAFETY & HARD RULES (ZERO DEVIATION)
1. **Rule 61 Ceiling: MAX 2 LINKEDIN TABS AT ANY TIME.**
   - Never open a 3rd LinkedIn tab. Before running any search query or opening a profile, inspect open tabs via CDP and prune inactive LinkedIn tabs.
2. **Rate Limit Alert Protocol:**
   - Agar kisi bhi point par screen par ya response me LinkedIn warning, security check, captcha, "You've reached the weekly search limit", ya "Too many requests" trigger ho:
     - **STOP IMMEDIATELY.**
     - Agent man se kuch click nahi karega — **TURANT USER KO LOUD ALERT DEGA**.
3. **No Auto-Apply Loops on LinkedIn:**
   - LinkedIn search queries sirf fresh hiring posts aur direct recruiter email drops nikaalne ke liye use hoti hain.
4. **Candidate Scope Ceiling:**
   - **Stack:** React.js / Frontend / Web Developer / MERN Stack / Next.js / TypeScript.
   - **Experience:** Strictly **0–2 YOE** (Fresher, 6 Months, 1 Year, 1.5 Years, 2 Years). Drop 3+ YOE without hesitation.
   - **Hard Bans:** React Native, Flutter, Android, iOS, DevOps, Python.

---

## 🎯 TARGET SEARCH QUERIES (PAST 24 HOURS ONLY)
LinkedIn Search URL structure with sorted by date (`sortBy="date_posted"`) and date filter (`datePosted="past-24h"`):

1. **React Developer Hiring:**
   ```url
   https://www.linkedin.com/search/results/content/?datePosted=%22past-24h%22&keywords=hiring%20react%20developer%20(Indore%20OR%20Remote%20OR%20Bangalore)&origin=FACETED_SEARCH&sortBy=%22date_posted%22
   ```
2. **Frontend Developer (0-2 YOE):**
   ```url
   https://www.linkedin.com/search/results/content/?datePosted=%22past-24h%22&keywords=hiring%20frontend%20developer%20(fresher%20OR%20%221%20year%22%20OR%20%222%20years%22)&origin=FACETED_SEARCH&sortBy=%22date_posted%22
   ```
3. **MERN Stack Opening:**
   ```url
   https://www.linkedin.com/search/results/content/?datePosted=%22past-24h%22&keywords=hiring%20mern%20stack%20developer&origin=FACETED_SEARCH&sortBy=%22date_posted%22
   ```
4. **Direct Recruiter Email Drop Queries:**
   ```url
   https://www.linkedin.com/search/results/content/?datePosted=%22past-24h%22&keywords=%22share%20your%20resume%22%20react%20OR%20frontend%20%40gmail%20OR%20%40*&origin=FACETED_SEARCH&sortBy=%22date_posted%22
   ```

---

## 🛠️ SCRIPTER SPECIFICATION & AUTOMATION WORKFLOW
The dedicated script `scripts/harvest_linkedin_bulletproof.mjs` executes this exact sequence:

1. **CDP Connection & Tab Audit:**
   - Connects to `http://127.0.0.1:9222`.
   - Checks existing tabs. Reuses existing LinkedIn tab or creates strictly ONE tab.
2. **Rate Limit / Restriction Guard:**
   - Checks DOM for text: `"unusual traffic"`, `"checkpoint"`, `"security verification"`, `"weekly limit"`.
   - If detected ➔ Prints loud alert, halts script, and notifies user.
3. **Paced Scrolling (Human Emulation):**
   - Scrolls 3–4 times per query with randomized delays (1800ms – 3200ms).
4. **Content Extraction & Regex Parsing:**
   - Extracts post body, author name, author profile URL, and post URL.
   - Scans for valid email addresses (`[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`).
   - Scans for external career/form links (`forms.gle`, company career portals).
5. **Quality & Ceiling Gates:**
   - Must match React/Frontend/MERN keywords.
   - Must NOT contain 3+, 4+, 5+ YOE or React Native.
6. **5-File Deduplication Check:**
   - Checks against `applied_lifetime_except_today.json`, `applied_todays_<DATE>.json`, and `total_todays_<DATE>.json`.
7. **Persistence & Auto-Merge:**
   - Saves raw findings to `scripts/linkedin_harvested_fresh.json`.
   - Automatically appends fresh qualified leads into `total_todays_<DATE>.json`.
8. **Immediate Tab Prune (Rule 61 & 57):**
   - Closes the search tab immediately after finishing the harvest loop.

---

## 🚀 EXECUTION COMMAND
```powershell
node scripts/harvest_linkedin_bulletproof.mjs
```
