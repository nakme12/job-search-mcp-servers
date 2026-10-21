import fs from 'fs';
import path from 'path';

/**
 * WORKFLOW 5-FILE ARCHITECTURE MANAGER (Rule 52 Compliant)
 * 
 * File 1: total_historical_except_today.json (Historical Master Blacklist)
 * File 2: applied_lifetime_except_today.json (Lifetime Applied Ledger)
 * File 3: total_todays_<DATE>.json (Today's Raw Findings)
 * File 4: verified_todays_<DATE>.json (Today's Verified Jobs Ready for Apply)
 * File 5: applied_todays_<DATE>.json (Today's Confirmed Applied Jobs with Proof)
 */

export function getTodayDateStr() {
  return new Date().toISOString().split('T')[0];
}

export function getCurrentShift() {
  const hour = new Date().getHours();
  // Morning Cycle: 11:00 AM - 03:00 PM (Shift 1)
  // Afternoon Cycle: 03:00 PM - 07:00 PM (Shift 2)
  return hour >= 15 ? 2 : 1;
}

export function getFilePaths(baseDir = process.cwd(), shift = null) {
  const today = getTodayDateStr();
  const currentShift = shift || getCurrentShift();
  return {
    today,
    shift: currentShift,
    historicalTotal: path.join(baseDir, 'total_historical_except_today.json'),
    lifetimeApplied: path.join(baseDir, 'applied_lifetime_except_today.json'),
    todayTotal: path.join(baseDir, `total_todays_${today}.json`),
    todayVerified: path.join(baseDir, `verified_todays_${today}.json`),
    todayApplied: path.join(baseDir, `applied_todays_${today}.json`),
    shiftTotal: path.join(baseDir, `total_todays_${today}_shift${currentShift}.json`),
    shiftVerified: path.join(baseDir, `verified_todays_${today}_shift${currentShift}.json`),
    shiftApplied: path.join(baseDir, `applied_todays_${today}_shift${currentShift}.json`)
  };
}

function readJsonSafe(filePath, defaultVal = []) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err.message);
  }
  return defaultVal;
}

function writeJsonAtomic(filePath, data) {
  const tempPath = `${filePath}.tmp_${Date.now()}`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tempPath, filePath);
}

/**
 * Normalize URLs/Emails for exact duplicate matching
 */
export function normalizeTargetId(target) {
  if (!target) return '';
  return target.trim().toLowerCase().replace(/\/+$/, '');
}

/**
 * Check if a lead exists in the historical master blacklist or dead bounce list
 */
export function isDuplicateHistorical(targetUrlOrEmail, baseDir = process.cwd()) {
  const normalized = normalizeTargetId(targetUrlOrEmail);
  if (!normalized) return false;

  // Check dead recruiter bounce blacklist
  const deadEmailsPath = path.join(baseDir, 'dead_recruiter_emails.json');
  const deadList = readJsonSafe(deadEmailsPath, []);
  if (deadList.some(e => normalizeTargetId(e) === normalized)) {
    return true;
  }

  const paths = getFilePaths(baseDir);
  const historical = readJsonSafe(paths.historicalTotal, { jobs: [] });
  const list = Array.isArray(historical) ? historical : (historical.jobs || []);
  return list.some((item) => {
    const id = normalizeTargetId(item.recipient_or_url || item.url || item.recipient || item.url_or_recipient);
    return id && id === normalized;
  });
}

/**
 * Append a newly submitted application to applied_todays_<DATE>.json
 */
export function recordConfirmedApplication(jobRecord, baseDir = process.cwd()) {
  const paths = getFilePaths(baseDir);

  // HARD PROGRAMMATIC GATE (Rule 69): Reject phantom logging
  const isPortal = jobRecord.channel && jobRecord.channel.toLowerCase().includes('portal');
  if (isPortal) {
    if (!jobRecord.proof_screenshot || !fs.existsSync(jobRecord.proof_screenshot)) {
      const err = `[RULE 69 VIOLATION BLOCKED] Cannot record portal application for "${jobRecord.company}" without an existing post-submit screenshot proof file on disk!`;
      console.error(`🚨 ${err}`);
      throw new Error(err);
    }
  }

  let todayData = readJsonSafe(paths.todayApplied, {
    date: paths.today,
    description: "Jobs successfully submitted today with physical screenshot proof and DOM confirmation",
    total: 0,
    jobs: []
  });

  if (!todayData.jobs) todayData.jobs = [];

  // Check if already in today's applied
  const targetId = normalizeTargetId(jobRecord.url || jobRecord.recipient || jobRecord.url_or_recipient);
  const exists = todayData.jobs.some(j => normalizeTargetId(j.url || j.recipient || j.url_or_recipient) === targetId);

  if (!exists) {
    todayData.jobs.push({
      ...jobRecord,
      timestamp: new Date().toISOString(),
    });
    todayData.total = todayData.jobs.length;
    writeJsonAtomic(paths.todayApplied, todayData);
    console.log(`[5-File Manager] Confirmed application recorded for ${jobRecord.company} (${targetId})`);
  }
}

/**
 * Evening Rollover (Slot 7 | 06:40 PM - 07:00 PM)
 * 1. Merge today's applied into applied_lifetime_except_today.json
 * 2. Merge today's total into total_historical_except_today.json
 * 3. Safely archive/clean today's daily files
 */
export function executeEveningRollover(baseDir = process.cwd(), archive = true) {
  const paths = getFilePaths(baseDir);
  console.log(`[5-File Manager] Starting Evening Rollover for ${paths.today}...`);

  // 1. Merge today's applied -> lifetime applied
  const todayAppliedObj = readJsonSafe(paths.todayApplied, { jobs: [] });
  const todayAppliedList = Array.isArray(todayAppliedObj) ? todayAppliedObj : (todayAppliedObj.jobs || []);

  const lifetimeAppliedObj = readJsonSafe(paths.lifetimeApplied, { jobs: [] });
  const lifetimeList = Array.isArray(lifetimeAppliedObj) ? lifetimeAppliedObj : (lifetimeAppliedObj.jobs || []);
  const lifetimeKeys = new Set(lifetimeList.map(j => normalizeTargetId(j.url || j.recipient || j.url_or_recipient)));

  let newAppliedCount = 0;
  for (const job of todayAppliedList) {
    const key = normalizeTargetId(job.url || job.recipient || job.url_or_recipient);
    if (key && !lifetimeKeys.has(key)) {
      lifetimeList.push(job);
      lifetimeKeys.add(key);
      newAppliedCount++;
    }
  }

  const updatedLifetime = Array.isArray(lifetimeAppliedObj) 
    ? lifetimeList 
    : { ...lifetimeAppliedObj, total: lifetimeList.length, last_updated: new Date().toISOString(), jobs: lifetimeList };
  writeJsonAtomic(paths.lifetimeApplied, updatedLifetime);
  console.log(`[5-File Manager] Merged ${newAppliedCount} today applied into lifetime applied.`);

  // 2. Merge today's total -> historical total
  const todayTotalObj = readJsonSafe(paths.todayTotal, { jobs: [] });
  const todayTotalList = Array.isArray(todayTotalObj) ? todayTotalObj : (todayTotalObj.jobs || []);

  const historicalTotalObj = readJsonSafe(paths.historicalTotal, { jobs: [] });
  const historicalList = Array.isArray(historicalTotalObj) ? historicalTotalObj : (historicalTotalObj.jobs || []);
  const historicalKeys = new Set(historicalList.map(j => normalizeTargetId(j.url || j.recipient || j.url_or_recipient)));

  let newHistoricalCount = 0;
  for (const job of todayTotalList) {
    const key = normalizeTargetId(job.url || job.recipient || job.url_or_recipient);
    if (key && !historicalKeys.has(key)) {
      historicalList.push(job);
      historicalKeys.add(key);
      newHistoricalCount++;
    }
  }

  const updatedHistorical = Array.isArray(historicalTotalObj)
    ? historicalList
    : { ...historicalTotalObj, total: historicalList.length, last_updated: new Date().toISOString(), jobs: historicalList };
  writeJsonAtomic(paths.historicalTotal, updatedHistorical);
  console.log(`[5-File Manager] Merged ${newHistoricalCount} today findings into historical total.`);

  // 3. Archive/cleanup daily files
  if (archive) {
    const archiveDir = path.join(baseDir, 'data', 'daily_archives');
    if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });

    [paths.todayTotal, paths.todayVerified, paths.todayApplied].forEach((filePath) => {
      if (fs.existsSync(filePath)) {
        const baseName = path.basename(filePath);
        fs.copyFileSync(filePath, path.join(archiveDir, `${baseName}.archived_${Date.now()}`));
        fs.unlinkSync(filePath);
        console.log(`[5-File Manager] Archived and cleaned ${baseName}`);
      }
    });
  }

  console.log(`[5-File Manager] Evening Rollover complete.`);
}
