import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

/**
 * PRODUCTION-GRADE NAUKRI SRP HARVESTER WITH RATE-LIMIT ALERTS & AUTO-MERGE
 * 
 * Rules Enforced:
 * 1. Single Tab: Max 1 Naukri tab open. Auto-closed at end.
 * 2. Rate-Limit Assertion: Immediate halt & loud user alert on restriction / captcha.
 * 3. 0-2 YOE ceiling: Drops 3+ YOE & React Native instantly.
 * 4. Freshness: Uses jobAge=1 (past 24 hours).
 * 5. Deduplication: Cross-checks applied_lifetime, applied_todays, and total_todays.
 * 6. Auto-merges clean findings into total_todays_<DATE>.json.
 */

const sleep = ms => new Promise(r => setTimeout(r, ms));
const TODAY_DATE = '2026-10-14';

const TARGET_QUERIES = [
  'https://www.naukri.com/react-developer-jobs-in-india?k=react%20developer&experience=0&experience=1&experience=2&jobAge=1',
  'https://www.naukri.com/frontend-developer-jobs-in-indore?k=frontend%20developer&experience=0&experience=1&experience=2&jobAge=1',
  'https://www.naukri.com/mern-stack-developer-jobs?k=mern%20stack&experience=0&experience=1&experience=2&jobAge=1'
];

async function run() {
  console.log('=== [NAUKRI LIVE SRP HARVESTER] Starting extraction ===');

  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();

  // Index blacklists
  const appliedTodayPath = path.resolve(`applied_todays_${TODAY_DATE}.json`);
  const appliedLifetimePath = path.resolve('applied_lifetime_except_today.json');
  const totalTodayPath = path.resolve(`total_todays_${TODAY_DATE}.json`);

  const seenKeys = new Set();
  const indexBlacklist = (filePath) => {
    if (fs.existsSync(filePath)) {
      try {
        const d = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const list = Array.isArray(d) ? d : (d.jobs || d.applications || []);
        list.forEach(j => {
          if (j.url) seenKeys.add(j.url.toLowerCase().trim());
          if (j.company) seenKeys.add(j.company.toLowerCase().trim());
        });
      } catch (e) {}
    }
  };

  indexBlacklist(appliedTodayPath);
  indexBlacklist(appliedLifetimePath);
  indexBlacklist(totalTodayPath);

  console.log(`Indexed ${seenKeys.size} unique keys for strict duplicate rejection.`);

  const harvestedJobs = [];

  for (let qIdx = 0; qIdx < TARGET_QUERIES.length; qIdx++) {
    const q = TARGET_QUERIES[qIdx];
    console.log(`\n[${qIdx + 1}/${TARGET_QUERIES.length}] Navigating query: ${q.slice(0, 80)}...`);

    try {
      await page.goto(q, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await sleep(3500);

      // Check for Rate Limit / Bot Verification
      const rateLimitCheck = await page.evaluate(() => {
        const text = document.body.innerText.toLowerCase();
        const hasWarning = text.includes('verify you are human') ||
                           text.includes('unusual traffic') ||
                           text.includes('too many requests') ||
                           text.includes('access denied') ||
                           text.includes('security check');
        return hasWarning;
      });

      if (rateLimitCheck) {
        console.error('\n🚨🚨🚨 [CRITICAL ALERT: NAUKRI BOT VERIFICATION / RATE LIMIT DETECTED] 🚨🚨🚨');
        console.error('Halting execution immediately per user protocol. Notify user right away!\n');
        break; // Stop immediately
      }

      // Extract SRP Cards
      const jobs = await page.evaluate(() => {
        const wrappers = Array.from(document.querySelectorAll('.srp-jobtuple-wrapper, .cust-job-tuple'));
        return wrappers.map(w => {
          const title = w.querySelector('a.title')?.innerText || '';
          const comp = w.querySelector('a.comp-name')?.innerText || '';
          const url = w.querySelector('a.title')?.href || '';
          const exp = w.querySelector('.expwdth, .experience')?.innerText || '';
          const loc = w.querySelector('.locWdth, .location')?.innerText || 'India';
          const snippet = w.querySelector('.job-desc, .row4')?.innerText || '';
          const isQuickApply = !!w.querySelector('.apply-button') || w.innerText.includes('Apply');
          return { title, comp, url, exp, loc, snippet, isQuickApply };
        });
      });

      console.log(`Found ${jobs.length} listings on SRP page.`);

      jobs.forEach(j => {
        if (!j.url || !j.title || !j.comp) return;

        const isStack = /react(?!\s*native)|frontend|front-end|mern|full stack|web developer|next\.?js/i.test(j.title);
        const isBanned = /react native|flutter|android|ios|devops|python/i.test(j.title);
        const isSenior = /\b(3\+|4\+|5\+|6\+|7\+|8\+|3–[4567]|4–[567]|5–[67]|2–5|senior|lead|architect|principal)\b/i.test(j.title);

        if (isStack && !isBanned && !isSenior) {
          const urlKey = j.url.toLowerCase().trim();
          const compKey = j.comp.toLowerCase().trim();

          if (!seenKeys.has(urlKey) && !seenKeys.has(compKey)) {
            seenKeys.add(urlKey);
            seenKeys.add(compKey);

            const role = /mern|full stack/i.test(j.title) ? 'MERN Stack Developer' : 'Frontend Engineer';
            const resume = /mern|full stack/i.test(j.title)
              ? 'Pratik Patidar Resume - MERN Full Stack.pdf'
              : 'Pratik Patidar Resume - React Developer.pdf';

            harvestedJobs.push({
              company: j.comp,
              role,
              location: j.loc,
              url: j.url,
              channel: 'Naukri (Direct Job)',
              source: 'Naukri.com (Past 24h SRP)',
              resume,
              status: 'APPROVED_FOR_VERIFY',
              timestamp: new Date().toISOString(),
              snippet: (j.title + ' | ' + j.exp + ' | ' + j.snippet).slice(0, 180)
            });
            console.log(` ✅ DISCOVERED: [${j.comp}] ${j.title} (${j.exp}) -> ${j.url}`);
          }
        }
      });

    } catch (err) {
      console.error(`Error navigating query:`, err.message);
    }
  }

  // Close tab to maintain single tab cleanliness
  await page.close();

  console.log(`\n======================================================`);
  console.log(`🎯 TOTAL NEW QUALIFIED LEADS HARVESTED FROM NAUKRI: ${harvestedJobs.length}`);
  console.log(`======================================================`);

  // 1. Save local snapshot
  const snapPath = path.resolve('scripts/naukri_harvested_fresh.json');
  fs.writeFileSync(snapPath, JSON.stringify(harvestedJobs, null, 2));
  console.log(`💾 Saved to: ${snapPath}`);

  // 2. Merge into total_todays_2026-10-14.json
  if (harvestedJobs.length > 0 && fs.existsSync(totalTodayPath)) {
    const totalData = JSON.parse(fs.readFileSync(totalTodayPath, 'utf8'));
    let currentJobs = totalData.jobs || [];
    let startId = currentJobs.length > 0 ? Math.max(...currentJobs.map(j => j.id || 0)) + 1 : 1;

    harvestedJobs.forEach(lead => {
      currentJobs.push({
        id: startId++,
        company: lead.company,
        role: lead.role,
        location: lead.location,
        url: lead.url,
        recipient: lead.url,
        source: lead.source,
        resume: lead.resume,
        status: lead.status,
        timestamp: lead.timestamp
      });
    });

    totalData.total = currentJobs.length;
    totalData.jobs = currentJobs;

    fs.writeFileSync(totalTodayPath, JSON.stringify(totalData, null, 2));
    console.log(`🔥 SUCCESS: Merged ${harvestedJobs.length} fresh Naukri jobs into ${totalTodayPath}! New Total: ${totalData.total}`);
  }

  process.exit(0);
}

run().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
