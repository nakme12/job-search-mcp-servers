const fs = require('fs');
const path = require('path');
const { CANONICAL_PATHS, getScreenshotsVault, getTodayString } = require('./canonical_paths.cjs');

function normalizeTargetId(target) {
  if (!target) return '';
  return target.trim().toLowerCase().replace(/\/+$/, '');
}

function runRolloverAndInit() {
  const TODAY = getTodayString();

  // Find yesterday / last active date from data/daily
  const dailyDir = path.join(CANONICAL_PATHS.ENGINE_ROOT, 'data', 'daily');
  let yestDateStr = null;
  if (fs.existsSync(dailyDir)) {
    const files = fs.readdirSync(dailyDir);
    const dateMatches = files
      .map(f => {
        const m = f.match(/total_todays_(\d{4}-\d{2}-\d{2})\.json/);
        return m ? m[1] : null;
      })
      .filter(d => d && d < TODAY)
      .sort()
      .reverse();
    if (dateMatches.length > 0) {
      yestDateStr = dateMatches[0];
    }
  }

  console.log(`[Slot 1 Initializer] Starting 5-File Lifecycle rollover from ${yestDateStr || 'previous'} to ${TODAY}...`);

  const file1Path = CANONICAL_PATHS.getFile1Historical();
  const file2Path = CANONICAL_PATHS.getFile2LifetimeApplied();
  const yestAppliedPath = yestDateStr ? path.join(dailyDir, `applied_todays_${yestDateStr}.json`) : null;
  const yestTotalPath = yestDateStr ? path.join(dailyDir, `total_todays_${yestDateStr}.json`) : null;

  // 1. Roll yesterday's applied into File 2 (applied_lifetime_except_today.json)
  let lifetimeApplied = { total: 0, last_updated: new Date().toISOString(), jobs: [] };
  if (fs.existsSync(file2Path)) {
    try {
      const raw = JSON.parse(fs.readFileSync(file2Path, 'utf8'));
      lifetimeApplied = Array.isArray(raw) ? { total: raw.length, jobs: raw } : raw;
      if (!lifetimeApplied.jobs) lifetimeApplied.jobs = [];
    } catch (e) {
      console.error('Error reading File 2:', e.message);
    }
  }

  const lifetimeKeys = new Set(lifetimeApplied.jobs.map(j => normalizeTargetId(j.url || j.recipient || j.url_or_recipient)));

  let newlyMergedApplied = 0;
  if (yestAppliedPath && fs.existsSync(yestAppliedPath)) {
    try {
      const yestAppObj = JSON.parse(fs.readFileSync(yestAppliedPath, 'utf8'));
      const yestList = Array.isArray(yestAppObj) ? yestAppObj : (yestAppObj.jobs || []);
      for (const job of yestList) {
        const key = normalizeTargetId(job.url || job.recipient || job.url_or_recipient);
        if (key && !lifetimeKeys.has(key)) {
          lifetimeApplied.jobs.push(job);
          lifetimeKeys.add(key);
          newlyMergedApplied++;
        }
      }
      lifetimeApplied.total = lifetimeApplied.jobs.length;
      lifetimeApplied.last_updated = new Date().toISOString();
      fs.writeFileSync(file2Path, JSON.stringify(lifetimeApplied, null, 2), 'utf8');
      console.log(`[File 2 Update] Merged ${newlyMergedApplied} confirmed jobs from ${yestDateStr} into lifetime applied.`);
    } catch (e) {
      console.error('Error merging yesterday applied:', e.message);
    }
  }

  // 2. Roll yesterday's total into File 1 (total_historical_except_today.json)
  let historicalTotal = { total: 0, last_updated: new Date().toISOString(), leads: [] };
  if (fs.existsSync(file1Path)) {
    try {
      const raw = JSON.parse(fs.readFileSync(file1Path, 'utf8'));
      historicalTotal = Array.isArray(raw) ? { total: raw.length, leads: raw } : raw;
      if (!historicalTotal.leads) historicalTotal.leads = [];
    } catch (e) {
      console.error('Error reading File 1:', e.message);
    }
  }

  const historicalKeys = new Set(historicalTotal.leads.map(j => normalizeTargetId(j.url || j.recipient || j.url_or_recipient)));

  let newlyMergedTotal = 0;
  if (yestTotalPath && fs.existsSync(yestTotalPath)) {
    try {
      const yestTotObj = JSON.parse(fs.readFileSync(yestTotalPath, 'utf8'));
      const yestList = Array.isArray(yestTotObj) ? yestTotObj : (yestTotObj.jobs || yestTotObj.leads || []);
      for (const lead of yestList) {
        const key = normalizeTargetId(lead.url || lead.recipient || lead.url_or_recipient);
        if (key && !historicalKeys.has(key)) {
          historicalTotal.leads.push(lead);
          historicalKeys.add(key);
          newlyMergedTotal++;
        }
      }
      historicalTotal.total = historicalTotal.leads.length;
      historicalTotal.last_updated = new Date().toISOString();
      fs.writeFileSync(file1Path, JSON.stringify(historicalTotal, null, 2), 'utf8');
      console.log(`[File 1 Update] Merged ${newlyMergedTotal} discovered leads from ${yestDateStr} into historical blacklist.`);
    } catch (e) {
      console.error('Error merging yesterday total:', e.message);
    }
  }

  // 3. Initialize Today's 5-File Architecture
  const file3Path = CANONICAL_PATHS.getFile3Today(TODAY);
  const file4Path = CANONICAL_PATHS.getFile4Verified(TODAY);
  const file5Path = CANONICAL_PATHS.getFile5Applied(TODAY);

  if (!fs.existsSync(file3Path)) {
    fs.writeFileSync(file3Path, JSON.stringify({
      date: TODAY,
      cycle: "Cycle 1 (11:00 AM - 03:00 PM)",
      description: `Raw and candidate jobs discovered on ${TODAY}`,
      total: 0,
      jobs: []
    }, null, 2), 'utf8');
    console.log(`[Init] Created fresh File 3: total_todays_${TODAY}.json`);
  }

  if (!fs.existsSync(file4Path)) {
    fs.writeFileSync(file4Path, JSON.stringify({
      date: TODAY,
      cycle: "Cycle 1 (11:00 AM - 03:00 PM)",
      description: `DOM-audited clean jobs ready for apply on ${TODAY} (0-2 YOE, PAN-India/Remote, Web Frontend)`,
      total: 0,
      jobs: []
    }, null, 2), 'utf8');
    console.log(`[Init] Created fresh File 4: verified_todays_${TODAY}.json`);
  }

  if (!fs.existsSync(file5Path)) {
    fs.writeFileSync(file5Path, JSON.stringify({
      date: TODAY,
      cycle: "Cycle 1 (11:00 AM - 03:00 PM)",
      description: `Confirmed submissions on ${TODAY} with live DOM confirmation & physical screenshot proof`,
      total: 0,
      jobs: []
    }, null, 2), 'utf8');
    console.log(`[Init] Created fresh File 5: applied_todays_${TODAY}.json`);
  }

  // Create today's screenshot vault
  const todayVault = getScreenshotsVault(TODAY, 'shift1');
  console.log(`[Init] Ensured screenshot vault: ${todayVault}`);

  console.log(`\n=======================================================`);
  console.log(`📊 5-FILE LIFECYCLE BASELINE FOR ${TODAY}:`);
  console.log(`   File 1 (Historical Blacklist): ${historicalTotal.total} total recorded leads`);
  console.log(`   File 2 (Lifetime Applied):     ${lifetimeApplied.total} confirmed applied jobs`);
  console.log(`   File 3 (Today's Raw Pool):     0 leads (Fresh)`);
  console.log(`   File 4 (Today's Verified):     0 leads (Ready for Slot 2 & 4)`);
  console.log(`   File 5 (Today's Applied):      0 leads (Target Floor: 100)`);
  console.log(`=======================================================`);
}

runRolloverAndInit();
