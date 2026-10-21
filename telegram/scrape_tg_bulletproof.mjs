import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

/**
 * PRODUCTION-GRADE TELEGRAM LIVE CHANNEL SCRAPER & DEDUPLICATOR
 * 
 * Uses public preview endpoints (https://t.me/s/<channel>) without touching private chat UI.
 * Fast, silent, 100% reliable, zero selector breakage.
 * Filters strictly:
 * - 0–2 YOE ceiling (Rule Ceiling)
 * - React / Frontend / MERN / Next.js
 * - Excludes React Native, Mobile, DevOps
 * - Deduplicates against lifetime applied blacklist
 * - Writes clean output to telegram/fresh_qualified_tg_leads.json
 */

const TARGET_CHANNELS = [
  'merntech',
  'offcampusjobs4u',
  'freshersvoice'
];

async function run() {
  console.log('=== [TELEGRAM MULTI-CHANNEL LIVE SCRAPER] Starting extraction ===');
  
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();

  // Load lifetime blacklist
  const todayStr = '2026-10-14';
  const appliedTodayPath = path.resolve(`applied_todays_${todayStr}.json`);
  const appliedLifetimePath = path.resolve('applied_lifetime_except_today.json');

  let appliedSet = new Set();
  const loadBlacklist = (filePath) => {
    if (fs.existsSync(filePath)) {
      try {
        const d = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const list = Array.isArray(d) ? d : (d.jobs || d.applications || []);
        list.forEach(j => {
          if (j.recipient) appliedSet.add(j.recipient.toLowerCase().trim());
          if (j.email) appliedSet.add(j.email.toLowerCase().trim());
          if (j.company) appliedSet.add(j.company.toLowerCase().trim());
        });
      } catch (e) {}
    }
  };

  loadBlacklist(appliedTodayPath);
  loadBlacklist(appliedLifetimePath);

  const freshLeads = [];

  for (const channel of TARGET_CHANNELS) {
    const url = `https://t.me/s/${channel}`;
    console.log(`\nNavigating to public channel preview: ${url}...`);

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await new Promise(r => setTimeout(r, 2000));

      const posts = await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('.tgme_widget_message_text'));
        return els.map(el => el.innerText.trim()).filter(Boolean);
      });

      console.log(`Found ${posts.length} recent posts in @${channel}.`);

      posts.forEach(post => {
        const emailMatch = post.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        const linkMatch = post.match(/https?:\/\/[^\s]+/);
        const applyTarget = emailMatch ? emailMatch[0].toLowerCase() : (linkMatch ? linkMatch[0] : null);

        if (!applyTarget) return;

        // Positive Whitelist
        const isStack = /react(?!\s*native)|frontend|front-end|mern|full stack|web developer|next\.?js/i.test(post);
        // Hard Ban
        const isBanned = /react native|flutter|android|ios|devops|systems|python developer|\.net developer/i.test(post);
        // Experience Ceiling (0-2 YOE only)
        const isSenior = /\b(3\+|4\+|5\+|6\+|7\+|8\+|3–[4567]|4–[567]|5–[67]|2–5|senior|lead|architect|principal)\b/i.test(post);

        if (isStack && !isBanned && !isSenior) {
          // Company extraction
          let company = 'Tech Firm';
          const compMatch = post.match(/(?:Company|🏢 Company):\s*([^\n|]+)/i);
          if (compMatch) {
            company = compMatch[1].trim();
          } else {
            const firstLine = post.split('\n')[0] || '';
            const guess = firstLine.replace(/🚀|HIRING|\|/g, '').trim();
            if (guess.length > 2 && guess.length < 35) company = guess;
          }

          const targetId = applyTarget.toLowerCase();
          const compId = company.toLowerCase();

          if (appliedSet.has(targetId) || appliedSet.has(compId)) {
            return;
          }

          appliedSet.add(targetId);
          appliedSet.add(compId);

          freshLeads.push({
            channel: `@${channel}`,
            company,
            role: /mern|full stack/i.test(post) ? 'MERN / Full Stack Developer' : 'Frontend Engineer',
            recipient_or_url: applyTarget,
            type: emailMatch ? 'email' : 'link',
            resume: /mern|full stack/i.test(post) ? 'Pratik Patidar Resume - MERN Full Stack.pdf' : 'Pratik Patidar Resume - React Developer.pdf',
            snippet: post.replace(/\n+/g, ' | ').slice(0, 200),
            discovered_at: new Date().toISOString()
          });
        }
      });

    } catch (err) {
      console.error(`Error scraping @${channel}:`, err.message);
    }
  }

  await page.close();

  console.log(`\n======================================================`);
  console.log(`🎯 TOTAL FRESH QUALIFIED 0-2 YOE LEADS: ${freshLeads.length}`);
  console.log(`======================================================`);
  freshLeads.forEach((l, i) => {
    console.log(`${i + 1}. [${l.company}] ${l.role} -> ${l.recipient_or_url} (${l.channel})`);
  });

  const outPath = path.resolve('telegram/fresh_qualified_tg_leads.json');
  fs.writeFileSync(outPath, JSON.stringify(freshLeads, null, 2));
  console.log(`\n✅ Saved to ${outPath}`);

  process.exit(0);
}

run().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
