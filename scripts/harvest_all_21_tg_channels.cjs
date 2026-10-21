/**
 * COMPREHENSIVE 21 TELEGRAM CHANNELS HARVESTER (LAST 7 DAYS)
 * Connects to open Telegram Web tab on Brave port 9222.
 * Cycles through all 21 channels from tg_channels_registry.json.
 * Validates via Layer 1 Interceptor & Dedup against Historical File 1.
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const UniversalGuardInterceptor = require('./guards/universal_guard_interceptor.cjs');
const { CANONICAL_PATHS } = require('./canonical_paths.cjs');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function harvest21Channels() {
  console.log('=================================================================');
  console.log('📡 [SLOT 3] STARTING HARVEST ACROSS ALL 21 TELEGRAM CHANNELS (7-DAY DEPTH)');
  console.log('=================================================================');

  const registryPath = path.join(__dirname, '..', 'telegram', 'tg_channels_registry.json');
  if (!fs.existsSync(registryPath)) {
    throw new Error('Telegram channels registry not found at: ' + registryPath);
  }
  const channels = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  console.log(`Loaded ${channels.length} Telegram channels from registry.`);

  // Connect to Brave port 9222
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const tgPage = pages.find(p => p.url().includes('web.telegram.org'));

  if (!tgPage) {
    console.error('❌ Error: No Telegram Web tab found open on port 9222!');
    console.error('Please ensure Telegram Web is open in Brave.');
    await browser.disconnect();
    process.exit(1);
  }

  console.log('✅ Attached to open Telegram Web tab:', tgPage.url());

  // Load Historical Blacklist (File 1) & Today's File 3 for Dedup
  const histPath = path.join(__dirname, '..', 'total_historical_except_today.json');
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

  const todayStr = '2026-10-19';
  const file3Path = path.join(__dirname, '..', `total_todays_${todayStr}_shift1.json`);
  let todayPool = { date: todayStr, shift: 1, total: 0, jobs: [] };
  if (fs.existsSync(file3Path)) {
    try {
      todayPool = JSON.parse(fs.readFileSync(file3Path, 'utf8'));
    } catch(e) {}
  }
  if (!Array.isArray(todayPool.jobs)) todayPool.jobs = [];

  const seenToday = new Set(todayPool.jobs.map(j => (j.url || j.recipient || '').trim().toLowerCase()));

  let totalScanned = 0;
  let totalNewQualified = 0;

  for (let i = 0; i < channels.length; i++) {
    const ch = channels[i];
    console.log(`\n-------------------------------------------------------------`);
    console.log(`[Channel ${i + 1}/${channels.length}] 🔍 Scanning @${ch.username} (${ch.name})...`);

    try {
      // Search / Navigate to channel
      const searchBox = await tgPage.$('#telegram-search-input');
      if (searchBox) {
        await tgPage.evaluate(() => {
          const el = document.getElementById('telegram-search-input');
          if (el) { el.focus(); el.click(); }
        });
        await sleep(300);
        // Clear existing search text
        await tgPage.keyboard.down('Control');
        await tgPage.keyboard.press('A');
        await tgPage.keyboard.up('Control');
        await tgPage.keyboard.press('Backspace');
        await sleep(200);

        await tgPage.keyboard.type(ch.username, { delay: 40 });
        await sleep(2500);

        // Click matching result
        const selected = await tgPage.evaluate((uname, cname) => {
          const items = Array.from(document.querySelectorAll('.search-result, .ListItem, div[role="button"]'));
          const target = items.find(el => {
            const t = (el.innerText || '').toLowerCase();
            return t.includes(uname.toLowerCase()) || t.includes(cname.toLowerCase());
          });
          if (target) {
            target.click();
            return true;
          }
          return false;
        }, ch.username, ch.name);

        if (!selected) {
          console.log(`   ⚠️ Could not click search result for @${ch.username}. Skipping to next.`);
          continue;
        }
      }

      await sleep(2500);

      // Scroll up 4 times to fetch last 7 days / recent history
      for (let s = 0; s < 4; s++) {
        await tgPage.evaluate(() => {
          const scrollable = document.querySelector('.messages-container, .bubbles-inner, .MessageList') || window;
          if (scrollable.scrollBy) scrollable.scrollBy(0, -1800);
        });
        await sleep(800);
      }

      // Extract text from visible message bubbles
      const messages = await tgPage.evaluate(() => {
        const bubbles = Array.from(document.querySelectorAll('.message, .Message, .text-content, .message-content, div.text'));
        return bubbles.map(b => b.innerText?.trim()).filter(Boolean);
      });

      console.log(`   Captured ${messages.length} raw messages from @${ch.username}.`);
      totalScanned += messages.length;

      // Parse & Filter
      for (const msg of messages) {
        if (!msg || msg.length < 40) continue;

        // Must match candidate stack: React, Frontend, MERN, Next.js, Web
        const isStack = /react(?!\s*native)|frontend|front-end|mern|next\.?js|web developer/i.test(msg);
        const isBanned = /react native|flutter|android|ios|devops|systems|embedded/i.test(msg);
        if (!isStack || isBanned) continue;

        // Extract apply target (email or form or direct URL)
        const emailMatch = msg.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        const formMatch = msg.match(/https?:\/\/(?:forms\.gle|docs\.google\.com\/forms|careers\.[a-zA-Z0-9.-]+|job-boards\.[a-zA-Z0-9.-]+|jobs\.[a-zA-Z0-9.-]+)[^\s]+/i);
        const directUrlMatch = msg.match(/https?:\/\/[^\s]+/);

        const email = emailMatch ? emailMatch[0].toLowerCase() : null;
        const targetUrl = formMatch ? formMatch[0] : (directUrlMatch ? directUrlMatch[0] : null);
        const primaryTarget = email || targetUrl;

        if (!primaryTarget) continue;

        const normTarget = primaryTarget.trim().toLowerCase();
        if (historicalSet.has(normTarget) || seenToday.has(normTarget)) continue;

        // Layer 1 Interceptor: YOE ceiling & Salary floor check
        const eligibility = UniversalGuardInterceptor.assertJobEligibility(msg);
        if (!eligibility.pass) {
          // console.log(`   [Dropped]: ${eligibility.reason}`);
          continue;
        }

        // Extract company and role
        const lines = msg.split('\n').map(l => l.trim()).filter(Boolean);
        let extractedCompany = 'Direct Telegram Lead';
        const compMatch = msg.match(/(?:company|organization|at|hiring at)\s*[:\-]?\s*([A-Za-z0-9\s&]{2,30})/i);
        if (compMatch && compMatch[1]) {
          const cand = compMatch[1].trim();
          if (!cand.toLowerCase().includes('hiring') && !cand.toLowerCase().includes('team')) {
            extractedCompany = cand;
          }
        }

        const newJob = {
          id: `tg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          title: "Frontend / React Developer",
          company: extractedCompany,
          location: "India / Remote",
          url: targetUrl || "",
          recipient: email || "",
          application_type: email ? "Direct Recruiter Email" : "Direct Form",
          source: `Telegram (@${ch.username})`,
          date_posted: new Date().toISOString(),
          status: "DISCOVERED_PENDING_AUDIT",
          raw_text: msg.substring(0, 500)
        };

        todayPool.jobs.push(newJob);
        seenToday.add(normTarget);
        totalNewQualified++;
        console.log(`   ✨ Qualified Lead: ${newJob.company} (${newJob.application_type}: ${primaryTarget})`);
      }

    } catch (err) {
      console.log(`   ⚠️ Error scanning @${ch.username}: ${err.message}`);
    }

    await sleep(1500);
  }

  todayPool.total = todayPool.jobs.length;
  todayPool.updated_at = new Date().toISOString();

  // Save back to File 3
  fs.writeFileSync(file3Path, JSON.stringify(todayPool, null, 2), 'utf8');
  fs.writeFileSync(path.join(__dirname, '..', `total_todays_${todayStr}.json`), JSON.stringify(todayPool, null, 2), 'utf8');

  console.log('\n=================================================================');
  console.log(`🎉 [SLOT 3 COMPLETE] 21 CHANNELS SCANNED!`);
  console.log(`- Total Messages Inspected: ${totalScanned}`);
  console.log(`- New Clean Leads Added:    ${totalNewQualified}`);
  console.log(`- Total Staged in File 3:   ${todayPool.total}`);
  console.log('=================================================================');

  await browser.disconnect();
}

harvest21Channels().catch(err => {
  console.error('Fatal Telegram Harvester Error:', err);
  process.exit(1);
});
