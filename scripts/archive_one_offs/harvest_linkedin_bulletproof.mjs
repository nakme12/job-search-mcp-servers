import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

/**
 * PRODUCTION-GRADE LINKEDIN FEED HARVESTER WITH RATE-LIMIT GUARDS & AUTO-MERGE
 * 
 * Rules Enforced:
 * 1. Rule 61: Max 2 LinkedIn tabs at any time. Clean pruning.
 * 2. Rate-Limit Assertion: Immediate halt & loud user alert on restriction / captcha.
 * 3. 0-2 YOE ceiling: Drops 3+ YOE & React Native instantly.
 * 4. Deduplication: Cross-checks applied_lifetime, applied_todays, and total_todays.
 * 5. Auto-merges clean findings into total_todays_<DATE>.json.
 */

const sleep = ms => new Promise(r => setTimeout(r, ms));
const TODAY_DATE = '2026-10-14';

const TARGET_QUERIES = [
  'https://www.linkedin.com/search/results/content/?datePosted=%22past-24h%22&keywords=hiring%20react%20developer%20(Indore%20OR%20Remote%20OR%20Bangalore)&origin=FACETED_SEARCH&sortBy=%22date_posted%22',
  'https://www.linkedin.com/search/results/content/?datePosted=%22past-24h%22&keywords=hiring%20frontend%20developer%20(fresher%20OR%20%221%20year%22%20OR%20%222%20years%22)&origin=FACETED_SEARCH&sortBy=%22date_posted%22',
  'https://www.linkedin.com/search/results/content/?datePosted=%22past-24h%22&keywords=hiring%20mern%20stack%20developer&origin=FACETED_SEARCH&sortBy=%22date_posted%22'
];

async function run() {
  console.log('=== [LINKEDIN LIVE HARVESTER] Starting extraction ===');

  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  
  // Rule 61: Ensure maximum 1 existing LinkedIn tab before starting
  const liTabs = pages.filter(p => p.url().includes('linkedin.com'));
  if (liTabs.length > 1) {
    console.log(`Pruning ${liTabs.length - 1} extra LinkedIn tabs to honor Rule 61...`);
    for (let i = 1; i < liTabs.length; i++) {
      await liTabs[i].close();
    }
  }

  let liPage = liTabs[0] || (await browser.newPage());

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
          if (j.recipient) seenKeys.add(j.recipient.toLowerCase().trim());
          if (j.email) seenKeys.add(j.email.toLowerCase().trim());
          if (j.company) seenKeys.add(j.company.toLowerCase().trim());
        });
      } catch (e) {}
    }
  };

  indexBlacklist(appliedTodayPath);
  indexBlacklist(appliedLifetimePath);
  indexBlacklist(totalTodayPath);

  const harvestedLeads = [];

  for (let qIdx = 0; qIdx < TARGET_QUERIES.length; qIdx++) {
    const q = TARGET_QUERIES[qIdx];
    console.log(`\n[${qIdx + 1}/${TARGET_QUERIES.length}] Navigating query: ${q.slice(0, 85)}...`);

    try {
      await liPage.goto(q, { waitUntil: 'domcontentloaded', timeout: 35000 });
      await sleep(3000);

      // Check for Rate Limit / Security Checkpoint
      const rateLimitCheck = await liPage.evaluate(() => {
        const text = document.body.innerText.toLowerCase();
        const hasWarning = text.includes('unusual traffic') ||
                           text.includes('security check') ||
                           text.includes('checkpoint') ||
                           text.includes('weekly search limit') ||
                           text.includes('please solve the challenge') ||
                           text.includes('too many requests');
        return hasWarning;
      });

      if (rateLimitCheck) {
        console.error('\n🚨🚨🚨 [CRITICAL ALERT: LINKEDIN RATE LIMIT / SECURITY CHECKPOINT DETECTED] 🚨🚨🚨');
        console.error('Halting execution immediately per user protocol. Notify user right away!\n');
        break; // Stop immediately
      }

      // Human-paced scrolling
      for (let s = 0; s < 3; s++) {
        const posts = await liPage.evaluate(() => {
          const els = Array.from(document.querySelectorAll('div.update-components-text, .feed-shared-update-v2__description-wrapper, div[data-view-name="feed-full-update"]'));
          return els.map(el => {
            const text = el.innerText || '';
            const links = Array.from(el.querySelectorAll('a')).map(a => a.href);
            return { text, links };
          }).filter(p => p.text.length > 30);
        });

        posts.forEach(p => {
          const text = p.text;
          const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
          const applyTarget = emailMatch ? emailMatch[0].toLowerCase() : (p.links.find(l => l.includes('http') && !l.includes('linkedin.com/feed')) || null);

          if (!applyTarget) return;

          // Filters
          const isStack = /react(?!\s*native)|frontend|front-end|mern|full stack|web developer|next\.?js/i.test(text);
          const isBanned = /react native|flutter|android|ios|devops|python/i.test(text);
          const isSenior = /\b(3\+|4\+|5\+|6\+|7\+|8\+|3–[4567]|4–[567]|5–[67]|2–5|senior|lead|architect|principal)\b/i.test(text);

          if (isStack && !isBanned && !isSenior) {
            // Extract company / author name
            let company = 'LinkedIn Tech Lead';
            const compMatch = text.match(/(?:Company|Hiring at|At):\s*([^\n|]+)/i);
            if (compMatch) {
              company = compMatch[1].trim();
            } else {
              const firstLine = text.split('\n')[0] || '';
              if (firstLine.length > 2 && firstLine.length < 35) company = firstLine;
            }

            const targetKey = applyTarget.toLowerCase();
            const compKey = company.toLowerCase();

            if (!seenKeys.has(targetKey) && !seenKeys.has(compKey)) {
              seenKeys.add(targetKey);
              seenKeys.add(compKey);

              const role = /mern|full stack/i.test(text) ? 'MERN Stack Developer' : 'Frontend Engineer';
              const resume = /mern|full stack/i.test(text)
                ? 'Pratik Patidar Resume - MERN Full Stack.pdf'
                : 'Pratik Patidar Resume - React Developer.pdf';

              harvestedLeads.push({
                company,
                role,
                location: 'PAN-India / Remote',
                url: applyTarget,
                recipient: emailMatch ? applyTarget : undefined,
                channel: emailMatch ? 'Direct Email (LinkedIn Lead)' : 'Direct Link',
                source: 'LinkedIn Feed (Past 24h)',
                resume,
                status: 'APPROVED_FOR_VERIFY',
                timestamp: new Date().toISOString(),
                snippet: text.replace(/\n+/g, ' | ').slice(0, 180)
              });
              console.log(` ✅ DISCOVERED: [${company}] ${role} -> ${applyTarget}`);
            }
          }
        });

        await liPage.evaluate(() => window.scrollBy(0, 1000));
        await sleep(2200);
      }

    } catch (err) {
      console.error(`Error on query:`, err.message);
    }
  }

  // Close tab to maintain Rule 61 hygiene
  await liPage.close();

  console.log(`\n======================================================`);
  console.log(`🎯 TOTAL NEW QUALIFIED LEADS HARVESTED FROM LINKEDIN: ${harvestedLeads.length}`);
  console.log(`======================================================`);

  // 1. Save local snapshot
  const snapPath = path.resolve('scripts/linkedin_harvested_fresh.json');
  fs.writeFileSync(snapPath, JSON.stringify(harvestedLeads, null, 2));
  console.log(`💾 Saved to: ${snapPath}`);

  // 2. Merge into total_todays_2026-10-14.json if any fresh leads found
  if (harvestedLeads.length > 0 && fs.existsSync(totalTodayPath)) {
    const totalData = JSON.parse(fs.readFileSync(totalTodayPath, 'utf8'));
    let currentJobs = totalData.jobs || [];
    let startId = currentJobs.length > 0 ? Math.max(...currentJobs.map(j => j.id || 0)) + 1 : 1;

    harvestedLeads.forEach(lead => {
      currentJobs.push({
        id: startId++,
        company: lead.company,
        role: lead.role,
        location: lead.location,
        url: lead.url,
        recipient: lead.recipient,
        source: lead.source,
        resume: lead.resume,
        status: lead.status,
        timestamp: lead.timestamp
      });
    });

    totalData.total = currentJobs.length;
    totalData.jobs = currentJobs;

    fs.writeFileSync(totalTodayPath, JSON.stringify(totalData, null, 2));
    console.log(`🔥 SUCCESS: Merged ${harvestedLeads.length} fresh LinkedIn jobs into ${totalTodayPath}! New Total: ${totalData.total}`);
  }

  process.exit(0);
}

run().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
