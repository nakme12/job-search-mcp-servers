import fs from "fs";
import path from "path";

// Master Global Deduplication and Status Registry
let cachedRegistry = null;

export function loadMasterStatusRegistry() {
  if (cachedRegistry) return cachedRegistry;

  const appliedUrls = new Set();
  const skippedUrls = new Set();
  const seenIdentifiers = new Set();

  function normalize(str) {
    if (!str) return '';
    try {
      const u = new URL(str);
      return (u.origin + u.pathname).toLowerCase().replace(/\/+$/, '');
    } catch {
      return str.toLowerCase().trim().replace(/\/+$/, '');
    }
  }

  // 1. Load applied_and_seen_tracker.json
  const trackerPath = path.resolve("applied_and_seen_tracker.json");
  if (fs.existsSync(trackerPath)) {
    try {
      const tracker = JSON.parse(fs.readFileSync(trackerPath, "utf8"));
      (tracker.applied || []).forEach(j => {
        const id = normalize(j.recipient_or_url || j.url || j.email || '');
        if (id) {
          appliedUrls.add(id);
          seenIdentifiers.add(id);
        }
      });
    } catch (e) {}
  }

  // 2. Load weekly_applied.json
  const weeklyPath = path.resolve("weekly_applied.json");
  if (fs.existsSync(weeklyPath)) {
    try {
      const weekly = JSON.parse(fs.readFileSync(weeklyPath, "utf8"));
      weekly.forEach(j => {
        const id = normalize(j.recipient_or_url || j.url || j.email || '');
        if (id) {
          appliedUrls.add(id);
          seenIdentifiers.add(id);
        }
      });
    } catch (e) {}
  }

  // 3. Load discovered_jobs_7days.json (Contains APPLIED, SKIPPED, PENDING)
  const discPath = path.resolve("discovered_jobs_7days.json");
  if (fs.existsSync(discPath)) {
    try {
      const disc = JSON.parse(fs.readFileSync(discPath, "utf8"));
      disc.forEach(j => {
        const id = normalize(j.recipient_or_url || j.contact_or_url || j.url || j.email || '');
        if (!id) return;
        const status = (j.status || '').toUpperCase();
        if (status.includes("APPLIED") || status.includes("SUBMITTED")) {
          appliedUrls.add(id);
        } else if (status.includes("SKIP") || status.includes("REJECT") || status.includes("DEAD") || status.includes("CLOSED")) {
          skippedUrls.add(id);
        }
        seenIdentifiers.add(id);
      });
    } catch (e) {}
  }

  // 4. Load dead_jobs_blacklist.json
  const deadPath = path.resolve("dead_jobs_blacklist.json");
  if (fs.existsSync(deadPath)) {
    try {
      const dead = JSON.parse(fs.readFileSync(deadPath, "utf8"));
      dead.forEach(j => {
        const id = normalize(j.url || j.recipient_or_url || '');
        if (id) {
          skippedUrls.add(id);
          seenIdentifiers.add(id);
        }
      });
    } catch (e) {}
  }

  cachedRegistry = {
    appliedUrls,
    skippedUrls,
    seenIdentifiers,
    checkStatus: (rawUrl) => {
      const norm = normalize(rawUrl);
      if (!norm) return { status: "INVALID", shouldAudit: false };
      if (appliedUrls.has(norm)) {
        return { status: "ALREADY_APPLIED", shouldAudit: false, reason: "Already applied in tracker" };
      }
      if (skippedUrls.has(norm)) {
        return { status: "ALREADY_SKIPPED", shouldAudit: false, reason: "Already marked skipped / blacklisted" };
      }
      if (seenIdentifiers.has(norm)) {
        return { status: "ALREADY_SEEN", shouldAudit: false, reason: "Already exists in 7-day registry" };
      }
      return { status: "FRESH", shouldAudit: true };
    }
  };

  console.log(`[MASTER REGISTRY] Loaded: ${appliedUrls.size} APPLIED, ${skippedUrls.size} SKIPPED, ${seenIdentifiers.size} TOTAL SEEN`);
  return cachedRegistry;
}
