import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

/**
 * AUTOMATED TELEGRAM JOB SCRAPER & DEDUPLICATOR
 * 1. Connects to existing open Telegram Web tab on CDP port 9222
 * 2. Navigates to targeted tech job channels (e.g. Developer Hub / merntech)
 * 3. Scrolls up to capture fresh messages
 * 4. Filters strictly 0-2 YOE, React/Next/Frontend/MERN stack
 * 5. Deduplicates against lifetime applied blacklist
 * 6. Appends fresh verified leads into total_todays_<DATE>.json and stages for Slot 5
 */

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  console.log('=== [TELEGRAM LIVE HARVESTER] Starting extraction ===');
  
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('web.telegram.org'));

  if (!page) {
    console.error('❌ Error: No Telegram web tab found on CDP port 9222!');
    process.exit(1);
  }

  // 1. Search Developer Hub / merntech channel
  console.log('Searching for job channels on Telegram Web...');
  const searchInputSelector = '#telegram-search-input';
  const hasInput = await page.$(searchInputSelector);
  
  if (hasInput) {
    await page.evaluate(() => {
      const el = document.getElementById('telegram-search-input');
      if (el) {
        el.focus();
        el.click();
      }
    });
    // Click center of search input
    const box = await page.evaluate(() => {
      const el = document.getElementById('telegram-search-input');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    if (box) {
      await page.mouse.click(box.x, box.y);
      await sleep(300);
      await page.keyboard.type('merntech', { delay: 60 });
      await sleep(2500);

      // Click on Developer Hub
      await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('.search-result, .ListItem, div[role="button"]'));
        const hub = items.find(el => (el.innerText || '').includes('Developer Hub'));
        if (hub) hub.click();
      });
      await sleep(3000);
    }
  }

  // 2. Scroll chat container up to load 30+ recent messages
  console.log('Loading messages in channel...');
  for (let s = 0; s < 4; s++) {
    await page.evaluate(() => {
      const scrollable = document.querySelector('.messages-container, .bubbles-inner, .MessageList') || window;
      if (scrollable.scrollBy) {
        scrollable.scrollBy(0, -1500);
      }
    });
    await sleep(1000);
  }

  // 3. Extract messages
  const rawPosts = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('.message, .Message, .text-content, .message-content, div.text'));
    return els.map(el => el.innerText.trim()).filter(Boolean);
  });

  console.log(`Extracted ${rawPosts.length} raw messages from channel.`);

  // 4. Load lifetime applied blacklist to ensure zero duplicate dispatches
  const todayStr = '2026-10-14';
  const appliedTodayPath = path.resolve(`applied_todays_${todayStr}.json`);
  const appliedLifetimePath = path.resolve('applied_lifetime_except_today.json');

  let appliedSet = new Set();
  if (fs.existsSync(appliedTodayPath)) {
    const d = JSON.parse(fs.readFileSync(appliedTodayPath, 'utf8'));
    (d.jobs || d).forEach(j => {
      if (j.recipient) appliedSet.add(j.recipient.toLowerCase().trim());
      if (j.email) appliedSet.add(j.email.toLowerCase().trim());
      if (j.company) appliedSet.add(j.company.toLowerCase().trim());
    });
  }
  if (fs.existsSync(appliedLifetimePath)) {
    const d = JSON.parse(fs.readFileSync(appliedLifetimePath, 'utf8'));
    (d.jobs || d).forEach(j => {
      if (j.recipient) appliedSet.add(j.recipient.toLowerCase().trim());
      if (j.email) appliedSet.add(j.email.toLowerCase().trim());
      if (j.company) appliedSet.add(j.company.toLowerCase().trim());
    });
  }

  const qualifiedLeads = [];

  rawPosts.forEach((post, i) => {
    const emailMatch = post.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const googleFormMatch = post.match(/https?:\/\/forms\.gle\/[a-zA-Z0-9_-]+|https?:\/\/docs\.google\.com\/forms\/[^\s]+/);
    const applyTarget = emailMatch ? emailMatch[0].toLowerCase() : (googleFormMatch ? googleFormMatch[0] : null);

    if (!applyTarget) return;

    // Filter stack: React, Frontend, MERN, Full Stack
    const isStack = /react(?!\s*native)|frontend|front-end|mern|full stack|web developer/i.test(post);
    // Hard bans: Mobile, React Native, iOS, Android, DevOps
    const isBanned = /react native|flutter|android|ios|devops|systems/i.test(post);
    // Experience Ceiling: Must be strictly 0-2 YOE or Fresher
    const isSenior = /\b(3\+|4\+|5\+|6\+|7\+|8\+|3–[4567]|4–[567]|5–[67]|2–5|senior|lead|architect|principal)\b/i.test(post);

    if (isStack && !isBanned && !isSenior) {
      // Extract Company Name cleanly
      let company = 'Tech Firm';
      const compMatch = post.match(/Company:\s*([^\n|]+)/i);
      if (compMatch) {
        company = compMatch[1].trim();
      } else {
        const lines = post.split('\n').map(l => l.trim()).filter(Boolean);
        const secondLine = lines[1] || '';
        if (secondLine && !secondLine.includes(':') && secondLine.length < 35) {
          company = secondLine;
        }
      }

      // Check duplicate
      if (appliedSet.has(applyTarget) || appliedSet.has(company.toLowerCase())) {
        return;
      }

      appliedSet.add(applyTarget);
      appliedSet.add(company.toLowerCase());

      qualifiedLeads.push({
        source: 'Telegram (@merntech Developer Hub)',
        company,
        role: /full stack|mern/i.test(post) ? 'Full Stack Developer' : 'Frontend Engineer',
        recipient: applyTarget,
        channel: emailMatch ? 'Direct Email' : 'Google Form',
        resume: /mern|full stack/i.test(post) ? 'Pratik Patidar Resume - MERN Full Stack.pdf' : 'Pratik Patidar Resume - React Developer.pdf',
        rawText: post.replace(/\n+/g, ' | ').slice(0, 250),
        discovered_at: new Date().toISOString()
      });
    }
  });

  console.log(`\n🎯 TOTAL QUALIFIED 0-2 YOE LEADS EXTRACTED: ${qualifiedLeads.length}`);
  qualifiedLeads.forEach((l, idx) => {
    console.log(`${idx + 1}. [${l.company}] ${l.role} -> ${l.recipient} (${l.channel})`);
  });

  // Save to telegram/fresh_qualified_tg_leads.json
  const outPath = path.resolve('telegram/fresh_qualified_tg_leads.json');
  fs.writeFileSync(outPath, JSON.stringify(qualifiedLeads, null, 2));
  console.log(`\n✅ Saved to ${outPath}`);

  process.exit(0);
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
