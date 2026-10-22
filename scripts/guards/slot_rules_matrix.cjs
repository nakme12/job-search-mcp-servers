/**
 * SLOT-TO-RULE BINDING MATRIX
 * 
 * Maps every single operational rule (1 to 90) strictly to its corresponding slot,
 * so scripts and agents know exactly which rules apply where.
 */

const SLOT_RULES_MAP = {
  SLOT_1_INBOX_REVIEW: {
    slotNumber: 1,
    name: "Rules, Mistakes & Unified Inbox Review",
    windows: ["11:00 AM - 11:20 AM", "03:00 PM - 03:20 PM"],
    enforcedRules: [
      { id: "Rule 16", name: "Strict LinkedIn Recipient Verification", desc: "Never type without checking chat header recipient" },
      { id: "Rule 18", name: "Strict Professional English Only", desc: "No Hindi/Hinglish in DMs, outreach, replies or emails" },
      { id: "Rule 61", name: "Strict Max-2 Tabs Ceiling for LinkedIn", desc: "Never exceed 2 concurrent LinkedIn tabs; prune immediately" },
      { id: "Rule 63", name: "WhatsApp Recruiter Automation Protocol", desc: "Use dedicated wa_read_chat.cjs and canonical profile dispatcher" },
      { id: "Rule 74", name: "Candidate Identity Assertion", desc: "Strictly pratikpatidar7990@gmail.com; ignore all other accounts" }
    ]
  },

  SLOT_2_MCP_HARVEST: {
    slotNumber: 2,
    name: "Pure 20 MCP ATS Server Scraper & Harvesting",
    windows: ["11:20 AM - 11:40 AM", "03:20 PM - 03:40 PM"],
    enforcedRules: [
      { id: "Rule 3", name: "Compulsory Experience & Freshness Filters", desc: "Max 2 YOE ceiling, exclude senior titles and internships" },
      { id: "Rule 7", name: "Exclude Ghosting Staffing Agencies", desc: "Discard recruitment middle-men without verified company websites" },
      { id: "Rule 9", name: "URL Normalization & Deduplication", desc: "Normalize URLs and instantly drop historical duplicates against File 1" },
      { id: "Rule 52", name: "5-File Architecture Lifecycle", desc: "Ingest raw leads strictly into File 3 (total_todays_<DATE>.json)" }
    ]
  },

  SLOT_3_EARLY_AUDIT: {
    slotNumber: 3,
    name: "Quick Live DOM Audit & Early Verification (File 3 -> File 4 Batch 1)",
    windows: ["11:40 AM - 12:00 PM", "03:40 PM - 04:00 PM"],
    enforcedRules: [
      { id: "Rule 4", name: "Zero Surface Trust & 7-Day Freshness", desc: "Inspect live destination DOM; discard if posted >7-10 days ago" },
      { id: "Rule 23", name: "Strict 0-2 YOE Experience Barrier", desc: "Discard 3+, 4-6, 5+, Senior, Lead, Principal, Architect immediately" },
      { id: "Rule 60", name: "Instant Tab Kill on 3+ YOE / Stale Detect", desc: "Close tab within 0 seconds if out-of-range YOE is found" }
    ]
  },

  SLOT_4_EARLY_PORTALS: {
    slotNumber: 4,
    name: "Early ATS Portal Applications (File 4 Batch 1 Submission)",
    windows: ["12:00 PM - 12:20 PM", "04:00 PM - 04:20 PM"],
    enforcedRules: [
      { id: "Rule 6", name: "Zero Phantom Logging", desc: "Action Triggered != Action Submitted; requires explicit confirmation string" },
      { id: "Rule 54", name: "Canonical Screening Data Binding", desc: "Strict values from candidate_screening_profile.json (CTC 2.16/4.65 LPA)" },
      { id: "Rule 56", name: "Live Captcha User Alert Protocol", desc: "Stop & loud alert on reCAPTCHA/Turnstile" },
      { id: "Rule 57", name: "Immediate Post-Apply Tab Cleanup", desc: "Close tab instantly once confirmation screenshot is saved" },
      { id: "Rule 70", name: "Mandatory Form Field Reset", desc: "Clear field before typing (value = '') to avoid duplicate concatenation" }
    ]
  },

  SLOT_5_LIVE_FEEDS: {
    slotNumber: 5,
    name: "Dedicated Live Feeds Harvesting (TG + LinkedIn + Naukri)",
    windows: ["12:20 PM - 12:40 PM", "04:20 PM - 04:40 PM"],
    enforcedRules: [
      { id: "Rule 2", name: "LinkedIn Human Emulation Mandate", desc: "Natural jitter delays (3s-7s), smooth scrollBy(250), typing delays (40-90ms)" },
      { id: "Rule 15", name: "Hard-Exclude Unpaid Trainee & Ghost Posts", desc: "Exclude unpaid internships or consultancy dumps" },
      { id: "Rule 61", name: "Strict Max-2 Tabs Ceiling for LinkedIn", desc: "Max 2 tabs allowed simultaneously" },
      { id: "Rule 64", name: "Multi-Platform Daily Profile Maintenance", desc: "Naukri & Cutshort headline re-save to trigger Active Today badge" }
    ]
  },

  SLOT_6_MERGED_AUDIT: {
    slotNumber: 6,
    name: "Quick Live DOM Audit & Merged CDP Verification (Batch 2)",
    windows: ["12:40 PM - 01:20 PM", "04:40 PM - 05:20 PM"],
    enforcedRules: [
      { id: "Rule 4", name: "Zero Surface Trust", desc: "Live headless destination audit via deep_cdp_live_auditor" },
      { id: "Rule 23", name: "Strict 0-2 YOE Verification", desc: "Drop 3+ YOE immediately" },
      { id: "Rule 53", name: "Post-Slot 4 Instant Direct Email Dispatch", desc: "If fresh direct HR email lead discovered, tag and dispatch immediately" }
    ]
  },

  SLOT_7_MAIN_PORTALS: {
    slotNumber: 7,
    name: "Main ATS Portal Forms Submissions (Ashby / GH / Lever - 50 mins)",
    windows: ["01:20 PM - 02:10 PM", "05:20 PM - 06:10 PM"],
    enforcedRules: [
      { id: "Rule 9", name: "Daily Target Floor Enforcement", desc: "Minimum 40 direct ATS portal forms completed in this window" },
      { id: "Rule 55", name: "PlacementIndia Separate Tracking", desc: "Never merge PlacementIndia into direct company ATS count" },
      { id: "Rule 58", name: "Slot 7 ATS Execution Protocol", desc: "Multi-selector search, CDP file injection, notice period (15 days)" },
      { id: "Rule 68", name: "Ashby Portal Application Endpoint", desc: "Always append /application before inspecting form inputs" },
      { id: "Rule 69", name: "Strict Live DOM Confirmation Assertion", desc: "Must detect Thank you / Application submitted before screenshot" },
      { id: "Rule 76", name: "Platform-Level Round-Robin Interleaving", desc: "Never apply to same company/domain consecutively; space by 15-20 mins" }
    ]
  },

  SLOT_8_EMAIL_DISPATCHES: {
    slotNumber: 8,
    name: "Direct Verified Email Dispatches & Referrals (30 mins)",
    windows: ["02:10 PM - 02:40 PM", "06:10 PM - 06:40 PM"],
    enforcedRules: [
      { id: "Rule 1", name: "Never Say Hi Gmail / Generic Salutations", desc: "Must be Hi [Actual Verified Company Name] Hiring Team," },
      { id: "Rule 3", name: "Immutable Email Body Template", desc: "Never add bullets, AI fluff or modifications to canonical email body" },
      { id: "Rule 5", name: "Authorized Resumes Only", desc: "Strictly Frontend Engineer.pdf, React Developer.pdf, MERN Full Stack.pdf" },
      { id: "Rule 19", name: "Physical Sent Outbox Assertion", desc: "Must assert dispatch physically exists in Gmail Sent folder DOM" }
    ]
  },

  SLOT_9_CYCLE_AUDIT: {
    slotNumber: 9,
    name: "Cycle Audit & Scorecard Tracker Lock (20 mins)",
    windows: ["02:40 PM - 03:00 PM", "06:40 PM - 07:00 PM"],
    enforcedRules: [
      { id: "Rule 24", name: "Daily Target Floor Reconciliation", desc: "Assert minimum 100 verified applications / 80 ATS portals" },
      { id: "Rule 66", name: "Canonical Screenshot Vault Verification", desc: "Assert all screenshots exist physically in screenshots/<DATE>/<shift>/" },
      { id: "Rule 72", name: "Zero Slot Skipping Recovery Check", desc: "Assert no unfinished slots remain before locking cycle ledger" }
    ]
  }
};

module.exports = { SLOT_RULES_MAP };
