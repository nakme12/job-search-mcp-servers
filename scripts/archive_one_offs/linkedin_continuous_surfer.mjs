import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

/**
 * CONTINUOUS ACCOUNT-SAFE LINKEDIN FEED SURFER DAEMON
 * 
 * Safety & Quality Protocols:
 * 1. Single tab rule (Rule 61): Exactly 1 LinkedIn tab open at any time.
 * 2. Rate-Limit / Bot Challenge Detection: If detected, logs loud alert and waits safely.
 * 3. Human Pacing: Random delays (4-8 seconds) between scrolls and queries to prevent flagging.
 * 4. Deduplication: Checks against applied_lifetime, applied_todays, and total_todays.
 * 5. Auto-Merges newly found leads into total_todays_2026-10-14_shift2.json and main file.
 */

const sleep = ms => new Promise(r => setTimeout(r, ms));
const TODAY_DATE = '2026-10-14';

const SEARCH_QUERIES = [
  'https://www.linkedin.com/search/results/content/?datePosted=%22past-24h%22&keywords=hiring%20react%20developer%20(Indore%20OR%20Remote%20OR%20Bangalore)&origin=FACETED_SEARCH&sortBy=%22date_posted%22',
  'https://www.linkedin.com/search/results/content/?datePosted=%22past-24h%22&keywords=hiring%20frontend%20developer%20(fresher%20OR%20%221%20year%22%20OR%20%222%20years%22)&origin=FACETED_SEARCH&sortBy=%22date_posted%22',
  'https://www.linkedin.com/search/results/content/?datePosted=%22past-24h%22&keywords=hiring%20mern%20stack%20developer&origin=FACETED_SEARCH&sortBy=%22date_posted%22',
  'https://www.linkedin.com/search/results/content/?datePosted=%22past-24h%22&keywords=%22share%20your%20resume%22%20(react%20OR%20frontend)&origin=FACETED_SEARCH&sortBy=%22date_posted%22',
  'https://www.linkedin.com/search/results/content/?datePosted=%22past-24h%22&keywords=%22send%20cv%22%20(react%20OR%20mern)%20%40gmail%20OR%20%40*&origin=FACETED_SEARCH&sortBy=%22date_posted%22'
];

async function run() {
  console.log('=== [LINKEDIN CONTINUOUS SURFER DAEMON] Starting safe background loop ===');

  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  
  // Rule 61: Prune any extra LinkedIn tabs
  const liTabs = pages.filter(p => p.url().includes('linkedin.com'));
  if (liTabs.length > 1) {
    for (let i = 1; i < liTabs.length; i++) {
      await liTabs[i].close();
    }
  }

  let liPage = liTabs[0] || (await browser.newPage());

  const appliedTodayPath = path.resolve(`applied_todays_${TODAY_DATE}.json`);
  const appliedLifetimePath = path.resolve('applied_lifetime_except_today.json');
  const totalTodayPath = path.resolve(`total_todays_${TODAY_DATE}.json`);
  const totalShift2Path = path.resolve(`total_todays_${TODAY_DATE}_shift2.json`);

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

  console.log(`Indexed ${seenKeys.size} duplicate keys.`);

  let cycle = 1;
  const startTime = Date.now();
  const DURATION_MS = 32 * 60 * 1000; // 32 minutes run

  while (Date.now() - startTime < DURATION_MS) {
    console.log(`\n======================================================`);
    console.log(`🔄 [CYCLE ${cycle}] Surfing live LinkedIn feeds (${new Date().toLocaleTimeString('en-IN')})`);
    console.log(`======================================================`);

    for (let qIdx = 0; qIdx < SEARCH_QUERIES.length; qIdx++) {
      const q = SEARCH_QUERIES[qIdx];
      console.log(`\nNavigating query [${qIdx + 1}/${SEARCH_QUERIES.length}]...`);

      try {
        await liPage.goto(q, { waitUntil: 'domcontentloaded', timeout: 35000 });
        await sleep(4000);

        // Security / Rate Limit Check
        const rateLimitCheck = await liPage.evaluate(() => {
          const text = document.body.innerText.toLowerCase();
          return text.includes('unusual traffic') ||
                 text.includes('security check') ||
                 text.includes('checkpoint') ||
                 text.includes('weekly search limit') ||
                 text.includes('please solve the challenge') ||
                 text.includes('too many requests');
        });

        if (rateLimitCheck) {
          console.error('\n🚨🚨🚨 [CRITICAL ALERT: LINKEDIN RATE LIMIT / SECURITY DETECTED] 🚨🚨🚨');
          console.error('Cooling down for 3 minutes before next check...\n');
          await sleep(180000); // 3 mins cool off
          continue;
        }

        // Paced scroll
        for (let s = 0; s < 4; s++) {
          const posts = await liPage.evaluate(() => {
            const els = Array.from(document.querySelectorAll('div.update-components-text, .feed-shared-update-v2__description-wrapper, div[data-view-name="feed-full-update"]'));
            return els.map(el => {
              const text = el.innerText || '';
              const links = Array.from(el.querySelectorAll('a')).map(a => a.href);
              return { text, links };
            }).filter(p => p.text.length > 30);
          });

          const newBatch = [];
          posts.forEach(p => {
            const text = p.text;
            const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
            const applyTarget = emailMatch ? emailMatch[0].toLowerCase() : (p.links.find(l => l.includes('http') && !l.includes('linkedin.com/feed')) || null);

            if (!applyTarget) return;

            const isStack = /react(?!\s*native)|frontend|front-end|mern|full stack|web developer|next\.?js/i.test(text);
            const isBanned = /react native|flutter|android|ios|devops|python/i.test(text);
            const isSenior = /\b(3\+|4\+|5\+|6\+|7\+|8\+|3–[4567]|4–[567]|5–[67]|2–5|senior|lead|architect|principal)\b/i.test(text);

            if (isStack && !isBanned && !isSenior) {
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

                const record = {
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
                };

                newBatch.push(record);
                console.log(` 🎯 FRESH DISCOVERY: [${company}] ${role} -> ${applyTarget}`);
              }
            }
          });

          // Merge into Shift 2 and main total
          if (newBatch.length > 0) {
            // Append to Shift 2 total
            if (fs.existsSync(totalShift2Path)) {
              const s2Data = JSON.parse(fs.readFileSync(totalShift2Path, 'utf8'));
              newBatch.forEach(b => s2Data.jobs.push(b));
              s2Data.total = s2Data.jobs.length;
              fs.writeFileSync(totalShift2Path, JSON.stringify(s2Data, null, 2));
            }
            // Append to main total
            if (fs.existsSync(totalTodayPath)) {
              const tData = JSON.parse(fs.readFileSync(totalTodayPath, 'utf8'));
              let startId = tData.jobs.length > 0 ? Math.max(...tData.jobs.map(j => j.id || 0)) + 1 : 1;
              newBatch.forEach(b => {
                tData.jobs.push({ id: startId++, ...b });
              });
              tData.total = tData.jobs.length;
              fs.writeFileSync(totalTodayPath, JSON.stringify(tData, null, 2));
            }
            console.log(`💾 Auto-merged ${newBatch.length} fresh leads into total_todays!`);
          }

          await liPage.evaluate(() => window.scrollBy(0, 900));
          await sleep(2500 + Math.random() * 2000);
        }

      } catch (err) {
        console.error(`Error on query:`, err.message);
      }
      
      // Delay between queries
      await sleep(4000 + Math.random() * 3000);
    }

    cycle++;
    console.log('Resting for 30s before starting next feed sweep cycle...');
    await sleep(30000);
  }

  // Cleanup tab at end
  await liPage.close();
  console.log('=== [LINKEDIN CONTINUOUS SURFER DAEMON] 30-min window complete. Tab closed cleanly. ===');
  process.exit(0);
}

run().catch(err => {
  console.error('Fatal daemon error:', err);
  process.exit(1);
});
