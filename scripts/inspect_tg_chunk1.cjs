/**
 * CHUNK 1 INSPECTOR: Channels 1, 2, 3
 * 1. @merntech (Developer Hub)
 * 2. @remote_frontend_jobs
 * 3. @offcampusjobs4u
 * 
 * Deeply scrolls, extracts last 7 days raw message texts, prints full content.
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const sleep = ms => new Promise(r => setTimeout(r, ms));

const CHUNK_CHANNELS = [
  { username: 'merntech', name: 'Developer Hub | Jobs & Referrals' },
  { username: 'remote_frontend_jobs', name: 'Remote Frontend Jobs' },
  { username: 'offcampusjobs4u', name: 'Off Campus Jobs 4U' }
];

async function inspectChunk1() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const tgPage = pages.find(p => p.url().includes('web.telegram.org'));

  if (!tgPage) {
    console.error('❌ Error: No Telegram Web tab found open on port 9222!');
    await browser.disconnect();
    process.exit(1);
  }

  console.log('✅ Connected to Telegram Web tab:', tgPage.url());
  const results = {};

  for (const ch of CHUNK_CHANNELS) {
    console.log(`\n======================================================`);
    console.log(`📡 INSPECTING: @${ch.username} (${ch.name})`);
    console.log(`======================================================`);

    try {
      // Focus search input
      await tgPage.evaluate(() => {
        const el = document.getElementById('telegram-search-input') || document.querySelector('input.form-control');
        if (el) { el.focus(); el.click(); }
      });
      await sleep(300);

      // Clear search input via select all & backspace
      await tgPage.keyboard.down('Control');
      await tgPage.keyboard.press('A');
      await tgPage.keyboard.up('Control');
      await tgPage.keyboard.press('Backspace');
      await sleep(200);

      // Type username
      await tgPage.keyboard.type(ch.username, { delay: 50 });
      await sleep(3000);

      // Click on matching search result item
      const clicked = await tgPage.evaluate((uname, cname) => {
        const items = Array.from(document.querySelectorAll('.search-result, .ListItem, div[role="button"], .chatlist-chat'));
        for (const el of items) {
          const t = (el.innerText || '').toLowerCase();
          if (t.includes(uname.toLowerCase()) || t.includes(cname.toLowerCase().slice(0, 10))) {
            el.click();
            return true;
          }
        }
        // Fallback: click first search result
        const first = document.querySelector('.search-result, .ListItem');
        if (first) {
          first.click();
          return 'fallback_first';
        }
        return false;
      }, ch.username, ch.name);

      console.log(`   Result clicked: ${clicked}`);
      await sleep(3500);

      // Deep scroll up 6 times to get older messages (last 7 days)
      console.log(`   Scrolling up to load recent history...`);
      for (let s = 0; s < 6; s++) {
        await tgPage.evaluate(() => {
          const containers = document.querySelectorAll('.messages-container, .bubbles-inner, .MessageList, .chat-list, .messages-layout');
          for (const c of containers) {
            if (c.scrollBy) c.scrollBy(0, -2500);
          }
          window.scrollBy(0, -2500);
        });
        await sleep(700);
      }

      // Extract all message elements
      const msgs = await tgPage.evaluate(() => {
        const bubbles = Array.from(document.querySelectorAll('.message, .Message, .text-content, .message-content, div.text, .translatable-message'));
        return bubbles.map(b => b.innerText?.trim()).filter(Boolean);
      });

      console.log(`   Total raw messages pulled: ${msgs.length}`);
      results[ch.username] = msgs.slice(-15); // Last 15 unique messages

    } catch (e) {
      console.log(`   ⚠️ Error reading @${ch.username}: ${e.message}`);
      results[ch.username] = [`ERROR: ${e.message}`];
    }

    await sleep(2000);
  }

  // Save raw dump for inspection
  const dumpPath = path.join(__dirname, 'tg_chunk1_raw_dump.json');
  fs.writeFileSync(dumpPath, JSON.stringify(results, null, 2), 'utf8');
  console.log(`\n📁 Chunk 1 raw dump saved to: ${dumpPath}`);

  await browser.disconnect();
}

inspectChunk1().catch(e => console.error('Fatal Error:', e));
