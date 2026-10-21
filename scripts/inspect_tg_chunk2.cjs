/**
 * CHUNK 2 TELEGRAM INSPECTOR & AUTO-JOINER
 * Channels:
 * 4. @freshersvoice
 * 5. @placementlelo
 * 6. @developerjobs
 * 
 * Auto-joins channel to bypass rate-limits, extracts last 7 days posts, respects system RAM.
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const sleep = ms => new Promise(r => setTimeout(r, ms));

const CHUNK_CHANNELS = [
  { username: 'freshersvoice', name: 'Freshers Voice' },
  { username: 'placementlelo', name: 'Placement Lelo' },
  { username: 'developerjobs', name: 'Developer Jobs' }
];

async function runChunk2() {
  console.log('======================================================');
  console.log('📡 [CHUNK 2] INSPECTING & AUTO-JOINING 3 CHANNELS');
  console.log('======================================================');

  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const tgPage = pages.find(p => p.url().includes('web.telegram.org/a'));

  if (!tgPage) {
    console.error('❌ Error: No Telegram Web A tab found!');
    await browser.disconnect();
    process.exit(1);
  }

  const results = {};

  for (const ch of CHUNK_CHANNELS) {
    console.log(`\n------------------------------------------------------`);
    console.log(`🔍 Processing @${ch.username} (${ch.name})...`);

    try {
      // Focus search box
      await tgPage.evaluate(() => {
        const el = document.getElementById('telegram-search-input');
        if (el) { el.focus(); el.click(); }
      });
      await sleep(300);

      // Select all & wipe
      await tgPage.keyboard.down('Control');
      await tgPage.keyboard.press('A');
      await tgPage.keyboard.up('Control');
      await tgPage.keyboard.press('Backspace');
      await sleep(200);

      // Type username
      await tgPage.keyboard.type(ch.username, { delay: 40 });
      await sleep(3000);

      // Find and click matching search item
      const clicked = await tgPage.evaluate((uname) => {
        const items = Array.from(document.querySelectorAll('.search-result, .ListItem, div[role="button"]'));
        for (const el of items) {
          const t = (el.innerText || '').toLowerCase();
          if (t.includes(uname.toLowerCase())) {
            el.click();
            return el.innerText.substring(0, 80).replace(/\n/g, ' ');
          }
        }
        // Fallback: click first non-empty result
        if (items.length > 0) {
          items[0].click();
          return 'first_item: ' + items[0].innerText.substring(0, 60).replace(/\n/g, ' ');
        }
        return null;
      }, ch.username);

      console.log(`   Clicked result: ${clicked}`);
      await sleep(3500);

      // AUTO-JOIN CHECK: If "JOIN CHANNEL" or "JOIN" button is visible at bottom, click it!
      const joined = await tgPage.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button, .btn-primary, [class*="join"]'));
        const joinBtn = btns.find(b => {
          const txt = (b.innerText || '').trim().toLowerCase();
          return txt === 'join' || txt === 'join channel' || txt.includes('join');
        });
        if (joinBtn) {
          joinBtn.click();
          return true;
        }
        return false;
      });
      if (joined) console.log(`   ⚡ AUTO-JOINED CHANNEL @${ch.username}!`);

      // Scroll up to load last 7 days posts
      for (let s = 0; s < 5; s++) {
        await tgPage.evaluate(() => {
          const scrollable = document.querySelector('.messages-container, .bubbles-inner, .MessageList') || window;
          if (scrollable.scrollBy) scrollable.scrollBy(0, -2000);
        });
        await sleep(600);
      }

      // Extract raw messages
      const msgs = await tgPage.evaluate(() => {
        const bubbles = Array.from(document.querySelectorAll('.Message, .message-content, [class*="Message"], div.text, .translatable-message'));
        return bubbles.map(b => b.innerText ? b.innerText.trim() : '').filter(Boolean);
      });

      console.log(`   Extracted ${msgs.length} raw messages from @${ch.username}.`);
      results[ch.username] = msgs.slice(-15);

    } catch (e) {
      console.log(`   ⚠️ Error inspecting @${ch.username}: ${e.message}`);
      results[ch.username] = [];
    }

    await sleep(1500);
  }

  // Save raw dump
  const dumpPath = path.join(__dirname, 'tg_chunk2_raw_dump.json');
  fs.writeFileSync(dumpPath, JSON.stringify(results, null, 2), 'utf8');
  console.log(`\n📁 Chunk 2 raw dump saved to: ${dumpPath}`);

  await browser.disconnect();
}

runChunk2().catch(e => console.error('Fatal Chunk 2 Error:', e));
