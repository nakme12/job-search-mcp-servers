# NAUKRI LIVE SRP HARVESTING & DEDUPLICATION PROTOCOL

> **Single Source of Truth & Execution Playbook for Automated, Rate-Limited, and High-Freshness Naukri Job Sourcing**

---

## 🚨 CRITICAL RULES & RATE LIMIT GUARDS (ZERO DEVIATION)
1. **Single Tab Discipline (Zero Browser Flooding):**
   - At any time, maximum **1 Naukri tab** will be open. Tab cleanup is executed automatically at script termination.
2. **Rate Limit / Bot Protection Guard:**
   - Agar DOM me koi captcha (Cloudflare Turnstile, Geetest, Naukri verification screen) ya *"Too many requests"* / *"Please verify you are human"* trigger ho:
     - **SCRIPT TURANT STOP HOGI.**
     - Agent man se solve karne ya reload loop me jane ke bajay **TURANT USER KO LOUD ALERT DEGA**.
3. **Strict 0–2 YOE Experience Ceiling:**
   - Naukri filter parameters me strictly `experience=0&experience=1&experience=2` pass hoga.
   - Live JD text me agar 3+, 4+, 5+ YOE require ho ➔ Drop immediately.
4. **Stack Focus & Hard Bans:**
   - **Allowed:** React.js / Frontend / Web Developer / MERN Stack / Next.js / TypeScript.
   - **Banned:** React Native, Flutter, Android, iOS, DevOps, Python.
5. **Freshness Gate (`jobAge=1`):**
   - Sirf past 24 hours / 1 day posted jobs search hongi.

---

## 🎯 TARGET SEARCH QUERIES
1. **React Developer Jobs (India / 0–2 Yrs / Past 24h):**
   ```url
   https://www.naukri.com/react-developer-jobs-in-india?k=react%20developer&experience=0&experience=1&experience=2&jobAge=1
   ```
2. **Frontend Developer Jobs (Indore & Remote / 0–2 Yrs / Past 24h):**
   ```url
   https://www.naukri.com/frontend-developer-jobs-in-indore?k=frontend%20developer&experience=0&experience=1&experience=2&jobAge=1
   ```
3. **MERN Stack Developer Jobs (India / 0–2 Yrs / Past 24h):**
   ```url
   https://www.naukri.com/mern-stack-developer-jobs?k=mern%20stack&experience=0&experience=1&experience=2&jobAge=1
   ```

---

## 🛠️ AUTOMATION WORKFLOW
The dedicated script `scripts/harvest_naukri_bulletproof.mjs` executes this exact sequence:

1. **CDP Connection & Single Tab Reuse:**
   - Connects to `http://127.0.0.1:9222`. Reuses or creates 1 single tab.
2. **Rate Limit / Captcha Inspection:**
   - Checks DOM for bot challenges or unusual traffic screens. Halts and alerts user on detection.
3. **Paced SRP Scraping:**
   - Navigates through each query, waits for `.srp-jobtuple-wrapper` to render.
   - Extracts: Job Title, Company Name, Experience, Location, Job URL, and Apply Type (1-Click Apply vs Company Site).
4. **Stack & 0–2 YOE Verification:**
   - Re-checks title and summary snippet against candidate stack and experience ceiling.
5. **5-File Deduplication Check:**
   - Cross-checks URL, Company Name, and Job ID against `applied_lifetime_except_today.json`, `applied_todays_<DATE>.json`, and `total_todays_<DATE>.json`.
6. **Persistence & Auto-Merge:**
   - Writes fresh findings to `scripts/naukri_harvested_fresh.json`.
   - Appends clean qualified jobs into `total_todays_<DATE>.json`.
7. **Immediate Post-Run Tab Clean:**
   - Closes the Naukri tab to keep the browser lightweight.

---

## 🚀 EXECUTION COMMAND
```powershell
node scripts/harvest_naukri_bulletproof.mjs
```
