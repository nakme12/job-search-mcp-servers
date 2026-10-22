const puppeteer = require('puppeteer-core');
const fs = require('fs');

const sleep = ms => new Promise(r => setTimeout(r, ms));

const CHANNELS = [
  'merntech',
  'offcampusjobs4u',
  'freshersvoice',
  'freshershunt',
  'techjobsalert'
];

(async () => {
  let browser;
  try {
    console.log('[Telegram Channel Surfer] Connecting to Brave (Port 9222)...');
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });

    const pages = await browser.pages();
    const tgPage = pages.find(p => p.url().includes('web.telegram.org'));

    if (!tgPage) {
      console.log('❌ Telegram tab not found in Brave.');
      return;
    }

    console.log('✅ Found Telegram tab. Bringing to front...');
    await tgPage.bringToFront();
    await sleep(2000);

    const f5Path = 'C:\\mcp\\job-search-mcp-engine\\applied_todays_2026-10-19.json';
    const f5 = fs.existsSync(f5Path) ? JSON.parse(fs.readFileSync(f5Path, 'utf8')) : { jobs: [] };
    const appliedUrls = new Set(f5.jobs.map(j => (j.url || '').toLowerCase()).filter(Boolean));
    const appliedEmails = new Set(f5.jobs.map(j => (j.recipient || '').toLowerCase()).filter(Boolean));

    const freshLeads = [];

    for (const channel of CHANNELS) {
      console.log(`\n==============================================================`);
      console.log(`[TG Channel] Checking: @${channel}...`);

      // Focus search box
      await tgPage.evaluate(() => {
        const el = document.getElementById('telegram-search-input') || document.querySelector('input.form-control');
        if (el) { el.focus(); el.click(); }
      });
      await sleep(500);

      // Clear search input
      await tgPage.keyboard.down('Control');
      await tgPage.keyboard.press('A');
      await tgPage.keyboard.up('Control');
      await tgPage.keyboard.press('Backspace');
      await sleep(300);

      // Type channel name
      await tgPage.keyboard.type(channel, { delay: 50 });
      await sleep(3000);

      // Click first search result matching channel
      const clicked = await tgPage.evaluate((ch) => {
        const items = Array.from(document.querySelectorAll('.search-result, .ListItem[role="button"], .chatlist-chat'));
        const match = items.find(el => {
          const t = (el.innerText || '').toLowerCase();
          return t.includes(ch);
        }) || items[0];
        if (match) {
          match.click();
          return match.innerText.substring(0, 50).replace(/\n/g, ' ');
        }
        return null;
      }, channel);

      if (!clicked) {
        console.log(`  ⚠️ No search result found for @${channel}. Skipping.`);
        continue;
      }

      console.log(`  -> Selected chat: "${clicked}". Waiting for messages to render...`);
      await sleep(3500);

      // Extract last 6 messages
      const messages = await tgPage.evaluate(() => {
        const bubbles = Array.from(document.querySelectorAll('.Message, .message-content, [class*="bubble"], div.text-content')).map(el => {
          const text = (el.innerText || '').trim();
          const links = Array.from(el.querySelectorAll('a')).map(a => a.href).filter(Boolean);
          return { text, links };
        }).filter(m => m.text.length > 25);
        return bubbles.slice(-6);
      });

      console.log(`  -> Extracted ${messages.length} recent messages from @${channel}`);

      for (const msg of messages) {
        const text = msg.text;
        const lower = text.toLowerCase();

        // Check if job related & dev stack
        const isDev = /react|frontend|front end|mern|full stack|fullstack|javascript|typescript|software engineer|sde|web developer|node/i.test(lower);
        if (!isDev) continue;

        // Check experience
        const isSenior = /senior|sr\.|lead|architect|principal|3\+|4\+|5\+|6\+|3-5|4-6/i.test(lower);
        if (isSenior) {
          console.log(`     [DISQUALIFIED_SENIOR]: Required 3+ YOE / Senior.`);
          continue;
        }

        // Extract emails
        const emails = (text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []).map(e => e.toLowerCase());

        // Extract application links
        const applyLinks = msg.links.filter(u => !u.includes('t.me') && !u.includes('telegram.org'));

        if (emails.length > 0 || applyLinks.length > 0) {
          console.log(`\n  🎯 [FRESH TG LEAD]: @${channel}`);
          console.log(`     Snippet: ${text.substring(0, 150).replace(/\n/g, ' ')}...`);
          console.log(`     Emails: ${emails.join(', ') || 'None'}`);
          console.log(`     Links: ${applyLinks.join(', ') || 'None'}`);

          const alreadyApplied = emails.some(e => appliedEmails.has(e)) || applyLinks.some(u => appliedUrls.has(u.toLowerCase()));
          if (alreadyApplied) {
            console.log(`     ⚠️ Already applied. Skipping.`);
            continue;
          }

          freshLeads.push({
            channel: `@${channel}`,
            text: text,
            emails: emails,
            links: applyLinks,
            timestamp: new Date().toISOString()
          });
        }
      }

      await sleep(2000);
    }

    console.log(`\n==============================================================`);
    console.log(`[Telegram Channel Surfing Finished] Total Fresh Discovered Leads: ${freshLeads.length}`);
    fs.writeFileSync('C:\\mcp\\fresh_tg_channel_leads.json', JSON.stringify(freshLeads, null, 2), 'utf8');

  } catch (err) {
    console.error('[Telegram Surfer] Error:', err.message);
  } finally {
    if (browser) await browser.disconnect();
  }
})();
