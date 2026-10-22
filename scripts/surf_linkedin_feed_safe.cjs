const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const { humanDelay, humanScroll, assertLinkedInTabsCeiling } = require('./linkedin_human_emulator.cjs');

const sleep = ms => new Promise(r => setTimeout(r, ms));

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const URL_REGEX = /https?:\/\/[^\s]+/g;

(async () => {
  let browser;
  let liPage;
  try {
    console.log('[LinkedIn Feed Surfer] Connecting to Brave (Port 9222)...');
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });

    // Assert Rule 61 / Rule 86: Max 2 LinkedIn tabs
    await assertLinkedInTabsCeiling(browser);

    const pages = await browser.pages();
    liPage = pages.find(p => p.url().includes('linkedin.com/feed'));

    if (!liPage) {
      console.log('[LinkedIn Feed Surfer] Opening LinkedIn feed tab with human pacing...');
      liPage = await browser.newPage();
      await liPage.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await humanDelay(4000, 7000);
    } else {
      console.log('[LinkedIn Feed Surfer] Found existing LinkedIn feed tab. Focusing...');
      await liPage.bringToFront();
      await humanDelay(2000, 4000);
    }

    console.log('[LinkedIn Feed Surfer] Reading historical and today applied files...');
    const f5Path = 'C:\\mcp\\job-search-mcp-engine\\applied_todays_2026-10-19.json';
    const f5 = fs.existsSync(f5Path) ? JSON.parse(fs.readFileSync(f5Path, 'utf8')) : { jobs: [] };
    const appliedEmails = new Set(f5.jobs.map(j => (j.recipient || '').toLowerCase()).filter(Boolean));

    const f1Path = 'C:\\mcp\\job-search-mcp-engine\\total_historical_except_today.json';
    const f1Raw = fs.existsSync(f1Path) ? JSON.parse(fs.readFileSync(f1Path, 'utf8')) : [];
    const f1 = Array.isArray(f1Raw) ? f1Raw : (f1Raw.jobs || []);
    const histEmails = new Set(f1.map(j => (j.recipient || j.recipient_or_url || '').toLowerCase()).filter(Boolean));

    console.log(`[LinkedIn Feed Surfer] Initialized. Applied today: ${f5.total || f5.jobs.length}. Starting human scroll & inspection...`);

    const extractedLeads = [];
    const seenPostTexts = new Set();

    // Scroll through feed in 6 human-paced cycles (approx 3-4 minutes of organic browsing)
    for (let cycle = 1; cycle <= 6; cycle++) {
      console.log(`\n--- [Cycle ${cycle}/6] Scrolling feed smoothly & reading posts ---`);
      
      // Expand "see more" buttons on posts
      await liPage.evaluate(() => {
        const seeMoreBtns = Array.from(document.querySelectorAll('button.feed-shared-inline-show-more-text__see-more-less-toggle, button[aria-label*="see more"], .see-more'));
        seeMoreBtns.slice(0, 5).forEach(b => {
          try { b.click(); } catch (e) {}
        });
      });

      await sleep(1500);

      // Extract visible posts text & metadata
      const rawPosts = await liPage.evaluate(() => {
        const containers = Array.from(document.querySelectorAll('.feed-shared-update-v2, div[data-urn*="urn:li:activity"]'));
        return containers.map(c => {
          const authorEl = c.querySelector('.update-components-actor__name, .feed-shared-actor__name, span[dir="ltr"]');
          const author = authorEl ? authorEl.innerText.trim() : 'Unknown';
          const titleEl = c.querySelector('.update-components-actor__description, .feed-shared-actor__description');
          const authorTitle = titleEl ? titleEl.innerText.trim() : '';
          const textEl = c.querySelector('.feed-shared-update-v2__description, .update-components-text, .feed-shared-text');
          const text = textEl ? textEl.innerText.trim() : '';
          return { author, authorTitle, text };
        }).filter(p => p.text.length > 30);
      });

      console.log(`  -> Detected ${rawPosts.length} posts on screen in this section.`);

      for (const p of rawPosts) {
        const hash = p.text.substring(0, 100);
        if (seenPostTexts.has(hash)) continue;
        seenPostTexts.add(hash);

        const lower = p.text.toLowerCase();

        // Check if hiring / job related
        const isHiring = /hiring|looking for|opening|urgent requirement|immediate joiner|we are looking|apply here|send cv|send resume|share resume|share cv|walk-in/i.test(lower);
        if (!isHiring) continue;

        // Check developer / relevant tech stack
        const isDev = /frontend|front-end|react|reactjs|react\.js|mern|full stack|fullstack|web developer|software engineer|sde|javascript|typescript|nextjs|next\.js/i.test(lower);
        if (!isDev) continue;

        // Discard 3+ YOE / Senior
        const isSenior = /senior|sr\.|lead|architect|principal|manager|head of|3\+|4\+|5\+|6\+|7\+|8\+|3-5|4-6|5-7/i.test(lower);
        if (isSenior) {
          console.log(`  [DISQUALIFIED_SENIOR]: By ${p.author} — Required senior / 3+ YOE.`);
          continue;
        }

        // Extract emails
        const emails = p.text.match(EMAIL_REGEX) || [];
        const cleanEmails = emails.map(e => e.trim().toLowerCase()).filter(e => !e.endsWith('.png') && !e.endsWith('.jpg') && !e.includes('example.com'));

        // Extract apply links
        const links = (p.text.match(URL_REGEX) || []).filter(u => !u.includes('linkedin.com/in/') && !u.includes('linkedin.com/company/'));

        if (cleanEmails.length > 0 || links.length > 0) {
          console.log(`\n  🎯 [POTENTIAL LEAD FOUND!]:`);
          console.log(`     Author: ${p.author} (${p.authorTitle.substring(0, 50)})`);
          console.log(`     Emails: ${cleanEmails.join(', ') || 'None'}`);
          console.log(`     Links: ${links.join(', ') || 'None'}`);
          console.log(`     Snippet: ${p.text.substring(0, 140).replace(/\n/g, ' ')}...`);

          // Duplicate check
          const isDup = cleanEmails.some(e => appliedEmails.has(e) || histEmails.has(e));
          if (isDup) {
            console.log(`     ⚠️ Already applied or in blacklist. Skipping.`);
            continue;
          }

          extractedLeads.push({
            author: p.author,
            authorTitle: p.authorTitle,
            emails: cleanEmails,
            links: links,
            postText: p.text,
            discoveredAt: new Date().toISOString()
          });
        }
      }

      // Human-like scroll down
      console.log('  -> Simulating natural smooth scroll down...');
      await humanScroll(liPage, 3, 350);
      await humanDelay(3000, 6000);
    }

    console.log(`\n==============================================================`);
    console.log(`[LinkedIn Feed Surfing Completed] Total Fresh Leads Found: ${extractedLeads.length}`);
    fs.writeFileSync('C:\\mcp\\fresh_linkedin_feed_leads.json', JSON.stringify(extractedLeads, null, 2), 'utf8');

    // Rule 61: Keep feed tab or close if not needed
    console.log('[LinkedIn Feed Surfer] Done. Leaving 1 clean feed tab.');

  } catch (err) {
    console.error('[LinkedIn Feed Surfer] Error:', err.message);
  } finally {
    if (browser) await browser.disconnect();
  }
})();
