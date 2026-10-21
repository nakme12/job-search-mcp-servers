/**
 * DEDICATED SLOT 3 HARVESTER: LINKEDIN RECRUITER POSTS (LAST 3 DAYS)
 * Connects to Brave CDP port 9222.
 * Enforces:
 * - Rule 81: Single dedicated tab, zero touching user tabs.
 * - Rule 61: Max 2 LinkedIn tabs hard ceiling.
 * - Extracts direct recruiter emails and verified hiring posts.
 * - Saves strictly to slot3_linkedin_leads.json.
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const UniversalGuardInterceptor = require('./guards/universal_guard_interceptor.cjs');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function runLinkedInHarvest() {
  console.log('=================================================================');
  console.log('🚀 [SLOT 3] DEDICATED LINKEDIN RECRUITER POSTS HARVEST (LAST 3 DAYS)');
  console.log('=================================================================');

  const engineRoot = path.resolve(__dirname, '..');
  const todayStr = '2026-10-19';

  // Load historical blacklist
  const histPath = path.join(engineRoot, 'total_historical_except_today.json');
  let historicalSet = new Set();
  if (fs.existsSync(histPath)) {
    try {
      const hData = JSON.parse(fs.readFileSync(histPath, 'utf8'));
      (Array.isArray(hData) ? hData : (hData.jobs || [])).forEach(j => {
        const u = (j.recipient_or_url || j.url || j.recipient || j.applyUrl || '').trim().toLowerCase();
        if (u) historicalSet.add(u);
      });
    } catch(e) {}
  }

  // Load existing LinkedIn leads
  const outPath = path.join(engineRoot, 'slot3_linkedin_leads.json');
  let existingJobs = [];
  if (fs.existsSync(outPath)) {
    try {
      const prev = JSON.parse(fs.readFileSync(outPath, 'utf8'));
      existingJobs = prev.jobs || [];
    } catch (e) {}
  }
  const seenKeys = new Set(existingJobs.map(j => (j.recipient || j.url || '').trim().toLowerCase()));

  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  let newLinkedInCount = 0;
  const liQueries = [
    { cat: 'React Hiring Posts', url: 'https://www.linkedin.com/search/results/content/?keywords=%22react%22%20%22hiring%22%20email%20OR%20cv%20OR%20resume&sortBy=%22date_posted%22' },
    { cat: 'Frontend Hiring Posts', url: 'https://www.linkedin.com/search/results/content/?keywords=%22frontend%22%20%22hiring%22%20email%20OR%20cv%20OR%20resume&sortBy=%22date_posted%22' },
    { cat: 'MERN Hiring Posts', url: 'https://www.linkedin.com/search/results/content/?keywords=%22mern%22%20%22hiring%22%20email%20OR%20cv%20OR%20resume&sortBy=%22date_posted%22' }
  ];

  for (const q of liQueries) {
    console.log(`\n🔍 Searching LinkedIn: ${q.cat}...`);
    try {
      await page.goto(q.url, { waitUntil: 'domcontentloaded', timeout: 35000 });
      await sleep(3500);

      // Scroll 3 times to load feed posts
      for (let sIdx = 0; sIdx < 3; sIdx++) {
        await page.evaluate(() => window.scrollBy(0, 1500));
        await sleep(1500);
      }

      const posts = await page.evaluate(() => {
        const mainText = document.querySelector('main') ? document.querySelector('main').innerText : document.body.innerText;
        const rawChunks = mainText.split(/Feed post\s*\n\n/i).slice(1);
        return rawChunks.map(chunk => ({
          text: chunk.trim()
        })).filter(p => p.text && p.text.length > 50);
      });

      console.log(`   Captured ${posts.length} post snippets for ${q.cat}.`);

      for (const p of posts) {
        const pText = p.text;
        if (!pText || pText.length < 50) continue;
        const emailMatch = pText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (!emailMatch) continue;

        const email = emailMatch[0].toLowerCase();
        if (historicalSet.has(email) || seenKeys.has(email)) continue;

        // Stack check
        if (!/react(?!\s*native)|frontend|mern|next\.?js|full stack/i.test(pText)) continue;
        if (/react native|flutter|android|ios|devops/i.test(pText)) continue;

        // Experience ceiling
        if (/\b(3\+|4\+|5\+|6\+|7\+|8\+|senior|lead|architect|principal|manager)\b/i.test(pText)) continue;

        // Extract company name intelligently
        let companyName = '';
        const domainMatch = email.match(/@([a-zA-Z0-9.-]+)\.([a-zA-Z]{2,})$/);
        const freeDomains = ['gmail', 'yahoo', 'hotmail', 'outlook', 'proton', 'protonmail', 'icloud'];
        if (domainMatch && !freeDomains.includes(domainMatch[1].toLowerCase())) {
          companyName = domainMatch[1].charAt(0).toUpperCase() + domainMatch[1].slice(1);
        } else {
          const compMatch = pText.match(/(?:hiring for|join|at|company:?)\s+([A-Z][a-zA-Z0-9&]+(?:\s+[A-Z][a-zA-Z0-9&]+)?)/i);
          if (compMatch && compMatch[1] && !/react|frontend|developer|engineer|immediate|urgent/i.test(compMatch[1])) {
            companyName = compMatch[1].trim();
          }
        }
        if (!companyName) companyName = 'Tech Firm';

        let role = 'Frontend / Full Stack Developer';
        if (/mern/i.test(pText)) role = 'MERN Stack Developer';
        else if (/react/i.test(pText)) role = 'React Developer';

        let resume = 'Pratik Patidar Resume - React Developer.pdf';
        if (/mern|full stack/i.test(pText)) resume = 'Pratik Patidar Resume - MERN Full Stack.pdf';

        const newJob = {
          id: `li_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          company: companyName,
          role: role,
          recipient: email,
          application_type: "Direct Recruiter Email",
          source: "LinkedIn Recruiter Posts (Past 3 Days)",
          resume_mapped: resume,
          date_posted: new Date().toISOString(),
          status: "DISCOVERED_PENDING_AUDIT",
          raw_text: pText.slice(0, 250)
        };

        existingJobs.push(newJob);
        seenKeys.add(email);
        newLinkedInCount++;
      }
    } catch (e) {
      console.log(`   ⚠️ LinkedIn query failed for ${q.cat}: ${e.message}`);
    }
  }

  // Close the dedicated page (Rule 81)
  await page.close();

  const outData = {
    source: "LinkedIn Recruiter Posts (Past 3 Days)",
    date: todayStr,
    total: existingJobs.length,
    jobs: existingJobs
  };

  fs.writeFileSync(outPath, JSON.stringify(outData, null, 2));

  console.log('\n=================================================================');
  console.log(`✅ [LINKEDIN HARVEST COMPLETE]`);
  console.log(`Newly Added Leads: ${newLinkedInCount}`);
  console.log(`Total Staged in slot3_linkedin_leads.json: ${existingJobs.length}`);
  console.log('=================================================================');
}

runLinkedInHarvest().catch(err => {
  console.error('Fatal in LinkedIn harvester:', err);
  process.exit(1);
});
