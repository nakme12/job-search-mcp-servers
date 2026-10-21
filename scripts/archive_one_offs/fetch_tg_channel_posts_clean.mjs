import puppeteer from 'puppeteer-core';
import fs from 'fs';
import { loadMasterStatusRegistry } from '../servers/master-status-filter.js';

const masterRegistry = loadMasterStatusRegistry();

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
    const pages = await browser.pages();
    let page = pages.find(p => p.url().includes('web.telegram.org'));
    if (!page) {
      console.log('No Telegram Web tab found');
      await browser.disconnect();
      return;
    }

    console.log('Telegram Web connected. Extracting latest messages from current chat/channel...');
    const rawPosts = await page.evaluate(() => {
      const msgEls = Array.from(document.querySelectorAll('.message, .Message, .text-content, .message-content, .bubble-content'));
      return msgEls.map(m => m.innerText.trim()).filter(Boolean);
    });

    console.log(`Extracted ${rawPosts.length} raw messages from Telegram.`);

    const qualified = [];

    for (const post of rawPosts) {
      const t = post.toLowerCase();
      // Must be hiring
      if (!t.includes('hiring') && !t.includes('opening') && !t.includes('looking for') && !t.includes('developer')) continue;
      // Must be React / Frontend / MERN
      if (!t.includes('react') && !t.includes('frontend') && !t.includes('front-end') && !t.includes('mern') && !t.includes('next.js')) continue;
      // Must NOT be senior / 3+ YOE
      if (t.includes('senior') || t.includes('lead') || t.includes('architect') || t.includes('3+ years') || t.includes('4+ years') || t.includes('5+ years') || t.includes('3+ yoe')) continue;

      // Extract emails
      const emails = (post.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi) || []).map(e => e.toLowerCase());
      // Extract links
      const links = (post.match(/https?:\/\/[^\s]+/gi) || []);

      const primaryContact = emails[0] || links[0] || null;
      if (!primaryContact) continue;

      // Master Status Filter Gate: Reject if ALREADY_APPLIED or ALREADY_SKIPPED
      const check = masterRegistry.checkStatus(primaryContact);
      if (!check.shouldAudit) {
        console.log(`Skipping already processed lead: ${primaryContact} (${check.status})`);
        continue;
      }

      qualified.push({
        rawText: post.slice(0, 500),
        contact: primaryContact,
        emails,
        links,
        timestamp: new Date().toISOString()
      });
    }

    console.log(`🎯 QUALIFIED FRESH TELEGRAM POSTS: ${qualified.length}`);
    fs.writeFileSync('scripts/telegram_fresh_slot3_prepped.json', JSON.stringify(qualified, null, 2));

    await browser.disconnect();
  } catch (err) {
    console.error('Telegram prep error:', err.message);
  }
})();
