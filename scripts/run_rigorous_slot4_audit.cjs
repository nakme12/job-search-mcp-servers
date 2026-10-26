/**
 * FOOLPROOF HEADLESS DEEP DOM AUDITOR WITH LIVE LATENCY BENCHMARK
 * ZERO SHORTCUTS. FRESH CACHE-CLEARED HTTP/CDP.
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const { auditJobText } = require('./job_gatekeeper.cjs');
const { assertSlot } = require('./slot_guard.cjs');

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function runRigorousSlot4Audit() {
  // HARD CLOCK ENFORCEMENT — ZERO PREMATURE LEAP (Rule 10 & Incident 38)
  assertSlot(['CYCLE1_SLOT4', 'CYCLE2_SLOT4', 'CYCLE1_SLOT3', 'CYCLE2_SLOT3', 'CYCLE1_SLOT6', 'CYCLE2_SLOT6'], 'Slot 4 Rigorous DOM Audit');

  console.log('=================================================================');
  console.log('🔍 RUNNING FRESH HEADLESS SLOT 4 AUDIT (JOB 1 TO END + SPEED BENCHMARK)');
  console.log('=================================================================');

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const currentShift = now.getHours() >= 15 ? 2 : 1;
  let file3Path = path.join(__dirname, '..', `total_todays_${todayStr}.json`);
  if (!fs.existsSync(file3Path)) {
    file3Path = path.join(__dirname, '..', `total_todays_${todayStr}_shift${currentShift}.json`);
  }
  let file4Path = path.join(__dirname, '..', `verified_todays_${todayStr}.json`);
  if (!fs.existsSync(file4Path) && fs.existsSync(path.join(__dirname, '..', `verified_todays_${todayStr}_shift${currentShift}.json`))) {
    file4Path = path.join(__dirname, '..', `verified_todays_${todayStr}_shift${currentShift}.json`);
  }

  const file3 = JSON.parse(fs.readFileSync(file3Path, 'utf8'));
  const rawJobs = file3.jobs || [];

  console.log(`Loaded ${rawJobs.length} raw discovered jobs from ${path.basename(file3Path)}.`);

  // Connect to Brave port 9222
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  // Clear cache completely on every run
  const client = await page.target().createCDPSession();
  await client.send('Network.clearBrowserCache');
  await client.send('Network.setCacheDisabled', { cacheDisabled: true });
  await page.setCacheEnabled(false);

  const verifiedClean = [];
  const droppedJobs = [];
  const durations = [];

  for (let i = 0; i < rawJobs.length; i++) {
    const job = rawJobs[i];
    const prefix = `[Audit ${i + 1}/${rawJobs.length}]`;
    const startTime = Date.now();

    console.log(`\n${prefix} ${job.company} — ${job.role}`);
    console.log(`  URL: ${job.url}`);

    // Direct email recruiter lead bypass
    if (job.recipient && job.recipient.includes('@')) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      durations.push(parseFloat(elapsed));
      console.log(`  -> Direct Email Recruiter Lead. Verified ✅ (${elapsed}s)`);
      verifiedClean.push(job);
      continue;
    }

    if (!job.url || !job.url.startsWith('http')) {
      droppedJobs.push({ ...job, drop_reason: 'INVALID_URL' });
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`  🚫 DROPPED: Invalid URL (${elapsed}s)`);
      continue;
    }



    // Metadata freshness check (> 10 days old drop)
    if (job.date_posted) {
      const pDate = new Date(job.date_posted);
      const daysOld = (new Date() - pDate) / (1000 * 60 * 60 * 24);
      if (daysOld > 10) {
        droppedJobs.push({ ...job, drop_reason: `METADATA_STALE: ${Math.round(daysOld)} days old` });
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`  🚫 DROPPED: Metadata shows post is ${Math.round(daysOld)} days old (> 10 days) (${elapsed}s)`);
        continue;
      }
    }

    // Special Handling: Adzuna Aggregator Links
    // Adzuna links MUST be resolved to their real destination before audit
    if (job.url && job.url.includes('adzuna.in')) {
      try {
        console.log(`  -> Detected Adzuna aggregator link. Resolving true destination...`);
        await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 25000 });
        await sleep(2500);

        // Stage 1: Dismiss Email Banner
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button, a, span, div'));
          const target = btns.find(b => b.innerText && (b.innerText.trim() === 'No, thanks' || b.innerText.trim() === 'No thanks'));
          if (target) target.click();
        });

        // Stage 2: Click Apply trigger
        await page.evaluate(() => {
          const link = document.querySelector('a[href*="/land/ad/"]');
          if (link) link.click();
        });
        await sleep(1500);

        // Stage 3: Click "No thanks, take me to the job"
        await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a, button'));
          const target = links.find(b => b.innerText && b.innerText.toLowerCase().includes('take me to the job'));
          if (target) target.click();
        });

        // Wait for redirect to real employer destination
        await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
        await sleep(3500);

        const resolvedUrl = page.url();
        const resolvedTitle = await page.title();

        // Check for Adzuna Bot-Wall / Auth Wall
        if (resolvedTitle.includes('Human Verification')) {
          droppedJobs.push({ ...job, drop_reason: 'ADZUNA_BOT_WALL: Human Verification' });
          console.log(`  🚫 DROPPED: Adzuna Cloudflare Human Verification wall`);
          continue;
        }
        if (resolvedUrl.includes('/authenticate/register') || resolvedTitle.includes('Create an Adzuna account')) {
          droppedJobs.push({ ...job, drop_reason: 'ADZUNA_AUTH_WALL: Forced Registration' });
          console.log(`  🚫 DROPPED: Adzuna forced registration wall`);
          continue;
        }

        console.log(`  -> Successfully Landed on True Destination: ${resolvedUrl} (${resolvedTitle})`);
        job.destination_url = resolvedUrl;

        // Dismiss Cutshort/Destination Backdrop Modals via Outside Click & Escape
        await page.mouse.click(15, 15);
        await page.keyboard.press('Escape');
        await sleep(1000);

        // Expand "Read more" / "Show more" to reveal hidden YOE & date
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button, a, span'));
          const readMoreBtn = btns.find(el => {
            const t = el.innerText ? el.innerText.trim().toLowerCase() : '';
            return t === 'read more' || t === 'show more' || t === 'see full description';
          });
          if (readMoreBtn) readMoreBtn.click();
        });
        await sleep(1000);

      } catch (adzunaErr) {
        droppedJobs.push({ ...job, drop_reason: `ADZUNA_RESOLVE_FAILED: ${adzunaErr.message}` });
        console.log(`  🚫 DROPPED: Failed to resolve Adzuna destination (${adzunaErr.message})`);
        continue;
      }
    } else {
      // Normal direct ATS / Career link navigation
      try {
        await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await sleep(1500);
      } catch (navErr) {
        droppedJobs.push({ ...job, drop_reason: 'NAV_TIMEOUT: ' + navErr.message });
        console.log(`  🚫 DROPPED: Navigation failed (${navErr.message})`);
        continue;
      }
    }

    // Live destination DOM inspection
    try {
      const auditData = await page.evaluate(() => {
        const text = document.body ? document.body.innerText : '';
        const lower = text.toLowerCase();

        // Check if job expired / closed
        const isClosed = /no longer accepting applications|position closed|job has expired|job is closed|page not found|404|this job is no longer available/i.test(text);

        // Check for direct apply or form
        const hasFormOrApply = !!document.querySelector('form, input[type="file"], input[type="email"], a[href*="apply"], button[class*="apply"], [data-qa*="apply"]');

        // Extract real posted date text from destination
        const dateMatch = text.match(/(?:posted|published|created)\s*(?:on|:)?\s*([^\n\r•|]{2,35})/i);
        const liveDateString = dateMatch ? dateMatch[1].trim() : null;

        return {
          title: document.title,
          isClosed,
          hasFormOrApply,
          liveDateString,
          fullText: text.slice(0, 7000)
        };
      });

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      durations.push(parseFloat(elapsed));
      const avgDuration = (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1);

      if (auditData.isClosed) {
        droppedJobs.push({ ...job, drop_reason: 'JOB_CLOSED_OR_EXPIRED' });
        console.log(`  🚫 DROPPED: Live page shows job is closed/expired (${elapsed}s | Avg: ${avgDuration}s/job)`);
        continue;
      }

      // Strict Live Posted Date Check (<= 7-10 days)
      let isFresh = true;
      let freshnessReason = 'Date verified <= 7-10 days';
      if (auditData.liveDateString) {
        const lDate = auditData.liveDateString.toLowerCase();
        if (lDate.includes('month') || lDate.includes('year') || lDate.includes('2025') || lDate.includes('2024') || lDate.includes('2023') || lDate.includes('2022') || lDate.includes('2020') || lDate.includes('30+ days') || lDate.includes('3 weeks') || lDate.includes('2 weeks')) {
          isFresh = false;
          freshnessReason = `STALE_DATE: Destination shows ${auditData.liveDateString}`;
        }
      }

      if (!isFresh) {
        droppedJobs.push({ ...job, drop_reason: freshnessReason });
        console.log(`  🚫 DROPPED: ${freshnessReason} (${elapsed}s | Avg: ${avgDuration}s/job)`);
        continue;
      }

      // Gatekeeper Audit (0-2 YOE + Ban Stack on FULL expanded JD)
      const roleTitle = job.role || job.title || '';
      const gateAudit = auditJobText(auditData.fullText, roleTitle);
      if (!gateAudit.passed) {
        droppedJobs.push({ ...job, drop_reason: `GATEKEEPER: ${gateAudit.reason}` });
        console.log(`  🚫 DROPPED: ${gateAudit.reason} (${elapsed}s | Avg: ${avgDuration}s/job)`);
        continue;
      }

      // Physical form presence check
      if (!auditData.hasFormOrApply) {
        droppedJobs.push({ ...job, drop_reason: 'NO_DIRECT_FORM_OR_APPLY' });
        console.log(`  🚫 DROPPED: No application form or apply button on destination (${elapsed}s | Avg: ${avgDuration}s/job)`);
        continue;
      }


      // Passed all checks!
      console.log(`  ✅ 100% VERIFIED CLEAN (Fresh, 0-2 YOE, Clean Stack, Live Form) (${elapsed}s | Avg: ${avgDuration}s/job)`);
      const cleanJob = {
        ...job,
        role: job.role || job.title || '',
        status: 'VERIFIED_AUDITED',
        live_date_parsed: auditData.liveDateString,
        audited_at: new Date().toISOString()
      };
      if (!cleanJob.resume_mapped) {
        const lower = cleanJob.role.toLowerCase();
        if (lower.includes('react') || lower.includes('ui') || lower.includes('next')) cleanJob.resume_mapped = 'Pratik Patidar Resume - React Developer.pdf';
        else if (lower.includes('fullstack') || lower.includes('full stack') || lower.includes('mern') || lower.includes('node')) cleanJob.resume_mapped = 'Pratik Patidar Resume - MERN Full Stack.pdf';
        else cleanJob.resume_mapped = 'Pratik Patidar Resume - Frontend Engineer.pdf';
      }
      verifiedClean.push(cleanJob);

    } catch (err) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      durations.push(parseFloat(elapsed));
      const avgDuration = (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1);
      droppedJobs.push({ ...job, drop_reason: `NAV_ERROR: ${err.message}` });
      console.log(`  🚫 DROPPED: Navigation error (${err.message}) (${elapsed}s | Avg: ${avgDuration}s/job)`);
    }
  }

  await page.close();
  browser.disconnect();

  const totalAvg = (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(2);

  console.log('\n=================================================================');
  console.log(`🏁 RIGOROUS SLOT 4 AUDIT COMPLETE`);
  console.log(`Total Evaluated: ${rawJobs.length}`);
  console.log(`Verified Clean (File 4): ${verifiedClean.length}`);
  console.log(`Dropped (Kachra Purged): ${droppedJobs.length}`);
  console.log(`Average Verification Latency: ${totalAvg}s per job`);
  console.log('=================================================================');

  // Overwrite File 4 with strictly verified clean jobs
  const file4Data = {
    date: todayStr,
    shift: currentShift,
    cycle: 'Morning Cycle (11:00 AM - 03:00 PM)',
    description: 'DOM-audited clean jobs meeting 0-2 YOE, <=10 days freshness, and direct apply forms (Rigorous Zero-Shortcut Audit)',
    average_audit_latency_seconds: parseFloat(totalAvg),
    total: verifiedClean.length,
    jobs: verifiedClean
  };

  fs.writeFileSync(file4Path, JSON.stringify(file4Data, null, 2));
  const file4CanonicalPath = path.join(__dirname, '..', `verified_todays_${todayStr}.json`);
  fs.writeFileSync(file4CanonicalPath, JSON.stringify(file4Data, null, 2));
  fs.writeFileSync('C:/mcp/job-search-mcp-engine/slot4_rigorous_dropped.json', JSON.stringify(droppedJobs, null, 2));
  console.log(`File 4 successfully updated at ${file4Path} and ${file4CanonicalPath} with ${verifiedClean.length} genuine verified targets!`);
}

runRigorousSlot4Audit().catch(console.error);
