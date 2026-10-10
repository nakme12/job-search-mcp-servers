# 🚀 JOB SEARCH MCP ECOSYSTEM — MASTER SYSTEM DOCUMENTATION & HANDOFF GUIDE

> **Last Updated:** Saturday, October 10, 2026 (14:45 IST)  
> **Candidate:** Pratik Patidar (1.5+ YOE Frontend / React / Full Stack Developer)  
> **Location:** Indore, MP (Open to Remote & Indore Tech Firms)  
> **Total Lifetime Verified Applications:** **164 Verified Applications**  
> **Primary Email Account:** `pratikpatidar7990@gmail.com`  
> **Portfolio:** `https://pratik-portfolio-nine-orcin.vercel.app`  
> **LinkedIn:** `https://www.linkedin.com/in/pratik-patidar`  

---

## 📁 1. ARCHITECTURE & REPO DIRECTORY LAYOUT

Jab bhi naye system me is project ko clone ya restore karoge, folder layout aisa hona chahiye:

```text
D:\adi\mcp\
├── applied_and_seen_tracker.json   # 🌟 SINGLE SOURCE OF TRUTH (164 verified applied records & seen URLs)
├── AGENTS.md                       # 🛡️ Durable rules layer (37 hard rules for sourcing, auto-safety, and templates)
├── SESSION_HANDOFF.md              # 📝 Session-by-session history and immediate next action pointers
├── README.md                       # ⚙️ MCP Server installation and running guide
├── SYSTEM_DOCUMENTATION.md         # 📖 Complete setup & migration handbook (This file)
│
├── resumes/                        # 📄 Tailored candidate resumes (strictly matched per job stack)
│   ├── Pratik Patidar Resume - React Developer.pdf
│   ├── Pratik Patidar Resume - React Developer (Updated).pdf
│   ├── Pratik Patidar Resume - Frontend Engineer (Updated).pdf
│   └── Pratik Patidar Resume - MERN Full Stack (Updated).pdf
│
├── servers/                        # 🔌 20 Dedicated MCP ATS & Aggregator Servers
│   ├── greenhouse-jobs-server.js
│   ├── ashby-jobs-server.js
│   ├── lever-jobs-server.js
│   ├── smartrecruiters-jobs-server.js
│   ├── workable-jobs-server.js
│   ├── adzuna-jobs-server.js
│   ├── remoteok-jobs-server.js
│   ├── remotive-jobs-server.js
│   ├── themuse-jobs-server.js
│   └── ... (All 20 servers)
│
├── scripts/                        # 🤖 Automation, harvesting, and verification scripts
│   ├── deep_cdp_live_auditor.mjs   # Programmatic CDP 0-2 YOE & freshness DOM inspector
│   ├── experience-filter.js        # Core filter for strict 0–2 years threshold
│   └── freshness-filter.js         # Core filter for 7–10 days datePosted metadata
│
└── screenshots/                    # 📸 Proofs directory (Pre & Post submit proofs for portal forms)
```

---

## ⚙️ 2. QUICK RESTORE & SETUP ON NEW SYSTEM

Naye PC / Laptop par setup karne ke liye sirf yeh 3 simple steps follow karne hain:

### **Step 1: Prerequisites Check**
* **Node.js:** v18+ ya v20+ installed hona chahiye (`node -v`).
* **Chrome Browser with Remote Debugging:**
  Launch Chrome via terminal with port 9222 enabled:
  ```powershell
  chrome.exe --remote-debugging-port=9222 --user-data-dir="C:\ChromeDebugProfile"
  ```
  *(Make sure `pratikpatidar7990@gmail.com` and LinkedIn are logged in this browser).*

### **Step 2: Install Dependencies**
Project folder me jakar terminal open karo:
```powershell
cd D:\adi\mcp
npm install
```

### **Step 3: Verify Master Tracker**
Run command to assert that 164 applications are loaded:
```powershell
node -e "const t = JSON.parse(require('fs').readFileSync('applied_and_seen_tracker.json')); console.log('Total verified:', t.applied.length);"
```

---

## 🎯 3. CANDIDATE PROFILE & RESUME MAPPING RULES

Job description ke exact stack ke basis par specific resume attach hota hai:

| Primary Stack in JD | Target Resume File | Standard Subject Line |
|---|---|---|
| **React / Next.js / Frontend / UI** | `resumes/Pratik Patidar Resume - Frontend Engineer (Updated).pdf` | `Application for Frontend Developer - Pratik Patidar` |
| **React.js / Redux / UI Developer** | `resumes/Pratik Patidar Resume - React Developer (Updated).pdf` | `Application for React Developer - Pratik Patidar` |
| **MERN / Full Stack / Node + React** | `resumes/Pratik Patidar Resume - MERN Full Stack (Updated).pdf` | `Application for Full Stack Developer - Pratik Patidar` |

### ✉️ **Standard Dev Email Template (Rule 14 Compliant):**
```text
Hi [Company] Hiring Team,

I came across your opening for a [Role] and wanted to apply for the role.

I'm a [Full Stack / Frontend] Developer with 1.5 years of experience building scalable web applications using React.js, Next.js, TypeScript, REST APIs, and modern architectures.

I'm based in Indore and would be glad to discuss the opportunity further.

I've attached my updated resume for your review.

LinkedIn: https://www.linkedin.com/in/pratik-patidar
Portfolio: https://pratik-portfolio-nine-orcin.vercel.app

Thanks & Regards,
Pratik Patidar
pratikpatidar7990@gmail.com
+91 82696 47990
```

---

## 🛡️ 4. CRITICAL RULES & SAFETY POLICIES (AGENTS.MD ESSENTIALS)

1. **Rule 19 & 31 — Strict Sender & Sent Folder Physical Assertion:**
   * Always verify active Google Account is `pratikpatidar7990@gmail.com` before any dispatch.
   * Staged != Sent. An application is only counted when verified in live Gmail `Sent` folder.
2. **Rule 20 & 29 — Live CDP Freshness & 0–2 YOE Inspection:**
   * Never trust aggregator dates. Always inspect physical DOM / JSON-LD for <= 10 days posting age.
   * Disqualify 3+ YOE barriers, internships, and non-stack roles (DevOps, C++, Python packaging).
3. **Rule 34 — Anti-Spam Human Pacing:**
   * Enforce **60 seconds cooldown** between consecutive emails.
   * Enforce **15–30 seconds cooldown** between portal submissions.
4. **Rule 37 — Screenshot Proof Protocol:**
   * Capture pre-submit screenshot (`pre_submit_[company].png`) and post-submit confirmation proof (`post_submit_[company].png`).

---

## 📊 5. CURRENT PIPELINE PROGRESS SNAPSHOT (OCT 10, 2026)

* **Lifetime Verified Applications:** **164**
* **Today's Actions Completed:**
  1. `Unicraft Tech` (Email Applied & Sent Verified ✅)
  2. `Infoloop` (Email Applied & Sent Verified ✅)
  3. `Web Seeder` (Email Applied & Sent Verified ✅)
  4. `Medantrik` (Email Applied & Sent Verified ✅)
  5. `MapUp` (Portal Form Filled & Verified ✅)
  6. `Innosoft Group (Indore)` (Email Applied & Sent Verified ✅)
  7. `Cybernative Technologies` (Email Applied & Sent Verified ✅)
  8. `CodeStrat Labs (Remote)` (Email Applied & Sent Verified ✅)
  9. `CognitBotz Solutions` (Email Applied & Sent Verified ✅)
  10. `DayHawk Consultant` (Email Applied & Sent Verified ✅)

---
*Ready to be committed to GitHub or restored instantly on any new machine.*
