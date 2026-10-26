const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const sleep = ms => new Promise(r => setTimeout(r, ms));

const ENGINE_ROOT = path.resolve(__dirname, '..');
const TODAY_DATE = '2026-10-26';
const FILE3_PATH = path.join(ENGINE_ROOT, `total_todays_${TODAY_DATE}.json`);
const HIST_PATH = path.join(ENGINE_ROOT, 'total_historical_except_today.json');

(async () => {
  console.log('Connecting to Brave CDP for Deep @merntech sweep...');
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const tgPage = pages.find(p => p.url().includes('web.telegram.org'));
  
  if (!tgPage) {
    console.error('No Telegram Web page open in Brave!');
    browser.disconnect();
    return;
  }

  console.log('Attached to Telegram Web:', tgPage.url());

  // 1. Load Historical Set
  const historicalSet = new Set();
  if (fs.existsSync(HIST_PATH)) {
    try {
      const hData = JSON.parse(fs.readFileSync(HIST_PATH, 'utf8'));
      (Array.isArray(hData) ? hData : (hData.jobs || [])).forEach(j => {
        const u = (j.recipient_or_url || j.url || j.recipient || j.applyUrl || '').trim().toLowerCase();
        if (u) historicalSet.add(u);
      });
    } catch(e) {}
  }

  // 2. Load File 3
  let todayPool = { date: TODAY_DATE, total: 0, jobs: [] };
  if (fs.existsSync(FILE3_PATH)) {
    try {
      todayPool = JSON.parse(fs.readFileSync(FILE3_PATH, 'utf8'));
    } catch(e) {}
  }
  const seenToday = new Set(todayPool.jobs.map(j => (j.url || j.recipient || '').trim().toLowerCase()).filter(Boolean));

  // 3. Search and open @merntech
  console.log('Searching for @merntech...');
  await tgPage.evaluate(() => {
    const searchInput = document.getElementById('telegram-search-input');
    if (searchInput) {
      searchInput.focus();
      searchInput.click();
    }
  });
  await sleep(400);
  await tgPage.keyboard.down('Control');
  await tgPage.keyboard.press('A');
  await tgPage.keyboard.up('Control');
  await tgPage.keyboard.press('Backspace');
  await sleep(300);
  await tgPage.keyboard.type('merntech', { delay: 40 });
  await sleep(2500);

  // Click on merntech search result
  const opened = await tgPage.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.search-result, .ListItem, div[role="button"]'));
    const target = items.find(el => {
      const t = (el.innerText || '').toLowerCase();
      return t.includes('merntech') || t.includes('developer hub');
    });
    if (target) {
      target.click();
      return true;
    }
    return false;
  });
  console.log('Target clicked:', opened);
  await sleep(3000);

  // 4. Scroll up multiple times to load both READ and UNREAD history (last 2-3 days)
  console.log('Scrolling up to load full recent history (Read + Unread)...');
  for (let i = 0; i < 8; i++) {
    await tgPage.evaluate(() => {
      const scrollable = document.querySelector('.messages-container, .bubbles-inner, .MessageList') || window;
      if (scrollable.scrollBy) {
        scrollable.scrollBy(0, -1500);
      }
    });
    await sleep(800);
  }

  // 5. Extract all message bubbles
  const rawPosts = await tgPage.evaluate(() => {
    const bubbles = Array.from(document.querySelectorAll('.message, .Message, .text-content, .message-content, div.text'));
    return bubbles.map(b => b.innerText ? b.innerText.trim() : '').filter(t => t.length > 30);
  });

  // Deduplicate raw texts
  const uniquePosts = [...new Set(rawPosts)];
  console.log(`\n=============================================================`);
  console.log(`Extracted ${uniquePosts.length} unique posts from @merntech history!`);
  console.log(`=============================================================`);

  let addedCount = 0;
  for (let i = 0; i < uniquePosts.length; i++) {
    const post = uniquePosts[i];
    console.log(`\n--- [POST ${i + 1}/${uniquePosts.length}] ---`);
    console.log(post.substring(0, 200).replace(/\n/g, ' '));

    const isStack = /react(?!\s*native)|frontend|front-end|mern|next\.?js|web developer/i.test(post);
    const isBanned = /flutter|react native|ios|android|embedded/i.test(post);

    if (!isStack || isBanned) {
      console.log('   -> Skipped (Non-stack or mobile)');
      continue;
    }

    const emailMatch = post.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const linkMatch = post.match(/https?:\/\/[^\s]+/);
    const email = emailMatch ? emailMatch[0].toLowerCase() : null;
    const link = linkMatch ? linkMatch[0] : null;
    const primaryTarget = email || link;

    if (!primaryTarget) {
      console.log('   -> Skipped (No email or link found)');
      continue;
    }

    const norm = primaryTarget.trim().toLowerCase();
    if (historicalSet.has(norm)) {
      console.log(`   -> Skipped Duplicate (Historical): ${primaryTarget}`);
      continue;
    }
    if (seenToday.has(norm)) {
      console.log(`   -> Skipped Duplicate (Already staged today): ${primaryTarget}`);
      continue;
    }

    // Extract company and role
    const lines = post.split('\n').map(l => l.trim()).filter(Boolean);
    let company = 'Tech Company';
    let role = 'Frontend / MERN Developer';
    for (const l of lines) {
      if (/company\s*:/i.test(l)) {
        company = l.replace(/.*company\s*:\s*/i, '').replace(/[*_#]/g, '').trim();
      }
      if (/hiring\s*:\s*|role\s*:\s*|position\s*:\s*/i.test(l)) {
        role = l.replace(/.*(?:hiring|role|position)\s*:\s*/i, '').replace(/[*_#]/g, '').trim();
      }
    }

    const newJob = {
      id: todayPool.jobs.length + 1,
      company: company || 'Tech Company',
      role: role || 'Frontend / MERN Developer',
      location: 'India / Remote',
      url: link || email,
      recipient: email || null,
      channel: email ? 'Direct Recruiter Email' : 'Direct ATS Form',
      source: 'Telegram (@merntech Deep Sweep)',
      resume_mapped: /mern|full stack|node/i.test(role) ? 'Pratik Patidar Resume - MERN Full Stack.pdf' : 'Pratik Patidar Resume - Frontend Engineer.pdf',
      date_posted: new Date().toISOString(),
      raw_snippet: post.substring(0, 300),
      status: email ? 'READY_FOR_DIRECT_EMAIL' : 'DISCOVERED_PENDING_AUDIT',
      discovered_at: new Date().toISOString()
    };

    todayPool.jobs.push(newJob);
    seenToday.add(norm);
    addedCount++;
    console.log(`   ✨ [NEW QUALIFIED LEAD ADDED]: ${newJob.company} — ${newJob.role} (${newJob.channel}: ${primaryTarget})`);
  }

  todayPool.total = todayPool.jobs.length;
  fs.writeFileSync(FILE3_PATH, JSON.stringify(todayPool, null, 2), 'utf8');

  console.log(`\n=============================================================`);
  console.log(`🏁 Deep Sweep Complete! Added ${addedCount} new leads from @merntech.`);
  console.log(`File 3 Total Leads: ${todayPool.total}`);
  console.log(`=============================================================`);

  browser.disconnect();
})();
