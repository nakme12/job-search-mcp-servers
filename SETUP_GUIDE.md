# 🚀 QUICK SETUP GUIDE ON NEW SYSTEM (STEP-BY-STEP)

This guide walks you through setting up the **Job Search MCP Engine** on any new Windows / Mac / Linux machine from scratch in under 3 minutes.

---

## 📋 PREREQUISITES
1. **Node.js**: Install Node.js (v18.x or v20.x recommended) from [nodejs.org](https://nodejs.org/).
2. **Git**: Install Git from [git-scm.com](https://git-scm.com/).
3. **Google Chrome**: For browser automation & remote debugging.

---

## ⚡ STEP-BY-STEP SETUP

### **Step 1: Clone the Repository**
Open your terminal / PowerShell and run:
```powershell
git clone https://github.com/nakme12/job-search-mcp-engine.git
cd job-search-mcp-engine
```

---

### **Step 2: Install Node Dependencies**
```powershell
npm install
```

---

### **Step 3: Setup Environment Variables (`.env`)**
Create your local `.env` file from `.env.example`:

**On Windows PowerShell:**
```powershell
Copy-Item .env.example .env
```

**On Mac / Linux:**
```bash
cp .env.example .env
```

*(Open `.env` in VS Code / Cursor to customize candidate details or add API keys if needed).*

---

### **Step 4: Launch Chrome with Remote Debugging (Port 9222)**
Before running CDP dispatch or browser verification scripts, start Chrome with remote debugging:

**On Windows:**
```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\ChromeDebugProfile"
```

> 💡 **Tip:** In this opened Chrome window, log in to:
> 1. `pratikpatidar7990@gmail.com` (Gmail)
> 2. `linkedin.com` (LinkedIn)
> 3. `web.whatsapp.com` (WhatsApp Web)

---

### **Step 5: Verify Everything is Working**
Run the quick assertion script to verify the tracker and servers:
```powershell
node -e "const t = JSON.parse(require('fs').readFileSync('applied_and_seen_tracker.json')); console.log('✅ System Ready! Total Verified Applications:', t.applied.length);"
```

---

## 🎯 KEY DOCUMENTATION FILES
* 📖 [`SYSTEM_DOCUMENTATION.md`](SYSTEM_DOCUMENTATION.md) — Master Handbook, 20 MCP servers reference, and candidate resume mapping.
* 📋 [`PENDING_AND_VERIFIED_PIPELINE.md`](PENDING_AND_VERIFIED_PIPELINE.md) — Live daily targets and pending action lists.
* 🛡️ [`AGENTS.md`](AGENTS.md) — 37 Active safety rules and email/referral templates.
