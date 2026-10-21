import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

/**
 * PRODUCTION-GRADE TELEGRAM CHUNK SCRAPER & MASTER MERGER FOR 2026-10-15
 * 
 * Strict Whitelist: 0-2 YOE, React/Next.js/MERN, Pan-India/Remote.
 * Deduplicates against lifetime and today's total lists.
 * Merges directly into total_todays_2026-10-15_shift1.json.
 */

const sleep = ms => new Promise(r => setTimeout(r, ms));
const CHUNK_SIZE = 3;

const now = new Date();
const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
const currentShift = now.getHours() >= 15 ? 2 : 1;
const TODAY_DATE = `${todayStr}_shift${currentShift}`;

async function run() {
  console.log(`=== [TELEGRAM CHUNK HARVESTER & MASTER MERGER (${TODAY_DATE})] Starting ===`);

  const registryPath = path.resolve('telegram/tg_channels_registry.json');
  if (!fs.existsSync(registryPath)) {
    console.error('❌ Registry not found at:', registryPath);
    process.exit(1);
  }

  const channels = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  console.log(`Loaded ${channels.length} channels from registry.`);

  // Load Lifetime & Today blacklists
  const appliedTodayPath = path.resolve(`applied_todays_${TODAY_DATE}.json`);
  const appliedLifetimePath = path.resolve('applied_lifetime_except_today.json');
  const totalTodayPath = path.resolve(`total_todays_${TODAY_DATE}.json`);

  const seenKeys = new Set();

  function indexJobs(filePath) {
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
  }

  indexJobs(appliedTodayPath);
  indexJobs(appliedLifetimePath);
  indexJobs(totalTodayPath);

  console.log(`Indexed ${seenKeys.size} unique keys for strict duplicate rejection.`);

  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const allHarvestedLeads = [];

  // Process in chunks of 3 channels
  for (let i = 0; i < channels.length; i += CHUNK_SIZE) {
    const chunk = channels.slice(i, i + CHUNK_SIZE);
    console.log(`\n--- Processing Chunk [${Math.floor(i / CHUNK_SIZE) + 1}/${Math.ceil(channels.length / CHUNK_SIZE)}]: ${chunk.map(c => '@' + c.username).join(', ')} ---`);

    const chunkPromises = chunk.map(async (c) => {
      const page = await browser.newPage();
      const channelLeads = [];
      try {
        const url = `https://t.me/s/${c.username}`;
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
        await sleep(1500);

        const posts = await page.evaluate(() => {
          const els = Array.from(document.querySelectorAll('.tgme_widget_message_text'));
          return els.map(el => el.innerText.trim()).filter(Boolean);
        });

        posts.forEach(post => {
          const emailMatch = post.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
          const linkMatch = post.match(/https?:\/\/[^\s]+/);
          const target = emailMatch ? emailMatch[0].toLowerCase() : (linkMatch ? linkMatch[0] : null);

          if (!target) return;

          // Whitelist: React / Frontend / MERN / Next.js
          const isStack = /react(?!\s*native)|frontend|front-end|mern|full stack|web developer|next\.?js/i.test(post);
          // Hard Bans
          const isBanned = /react native|flutter|android|ios|devops|systems|python developer|\.net developer/i.test(post);
          // 0-2 YOE Ceiling
          const isSenior = /\b(3\+|4\+|5\+|6\+|7\+|8\+|3–[4567]|4–[567]|5–[67]|2–5|senior|lead|architect|principal)\b/i.test(post);

          if (isStack && !isBanned && !isSenior) {
            let company = c.name;
            const compMatch = post.match(/(?:Company|🏢 Company):\s*([^\n|]+)/i);
            if (compMatch) {
              company = compMatch[1].trim();
            } else {
              const firstLine = post.split('\n')[0] || '';
              const guess = firstLine.replace(/🚀|HIRING|\|/g, '').trim();
              if (guess.length > 2 && guess.length < 35) company = guess;
            }

            const targetKey = target.toLowerCase();
            const compKey = company.toLowerCase();

            if (!seenKeys.has(targetKey) && !seenKeys.has(compKey)) {
              seenKeys.add(targetKey);
              seenKeys.add(compKey);

              const role = /mern|full stack/i.test(post) ? 'Full Stack Developer' : 'Frontend Engineer';
              const resume = /mern|full stack/i.test(post)
                ? 'Pratik Patidar Resume - MERN Full Stack.pdf'
                : 'Pratik Patidar Resume - React Developer.pdf';

              channelLeads.push({
                company,
                role,
                location: 'India / Remote',
                url: target,
                recipient: emailMatch ? target : undefined,
                channel: emailMatch ? 'Direct Email' : 'Portal Link',
                source: `Telegram (@${c.username})`,
                resume,
                status: 'APPROVED_FOR_VERIFY',
                timestamp: new Date().toISOString(),
                snippet: post.replace(/\n+/g, ' | ').slice(0, 180)
              });
            }
          }
        });
      } catch (err) {
        console.log(`⚠️ Skipped @${c.username}: ${err.message}`);
      } finally {
        await page.close();
      }
      return channelLeads;
    });

    const chunkResults = await Promise.all(chunkPromises);
    chunkResults.flat().forEach(j => {
      console.log(` ✅ DISCOVERED: [${j.company}] ${j.role} -> ${j.url} (${j.source})`);
      allHarvestedLeads.push(j);
    });
    await sleep(1000);
  }

  console.log(`\n======================================================`);
  console.log(`🎯 TOTAL NEW QUALIFIED LEADS HARVESTED FROM TG: ${allHarvestedLeads.length}`);
  console.log(`======================================================`);

  // 1. Save Scraped TG Chunk Results
  const chunkOutPath = path.resolve('telegram/scraped_chunk_results.json');
  fs.writeFileSync(chunkOutPath, JSON.stringify(allHarvestedLeads, null, 2));
  console.log(`💾 Saved chunk results to: ${chunkOutPath}`);

  // 2. Merge into total_todays_2026-10-15_shift1.json
  if (fs.existsSync(totalTodayPath)) {
    const totalData = JSON.parse(fs.readFileSync(totalTodayPath, 'utf8'));
    let currentJobs = totalData.jobs || [];
    let startId = currentJobs.length > 0 ? Math.max(...currentJobs.map(j => j.id || 0)) + 1 : 1;

    allHarvestedLeads.forEach(lead => {
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
    console.log(`🔥 SUCCESS: Merged ${allHarvestedLeads.length} fresh TG jobs into ${totalTodayPath}! New Total: ${totalData.total}`);
  }

  process.exit(0);
}

run().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
