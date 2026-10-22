const puppeteer = require('puppeteer-core');
const fs = require('fs');
const { humanDelay, humanScroll, assertLinkedInTabsCeiling } = require('./linkedin_human_emulator.cjs');

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Past 24 hours filter on LinkedIn content search
const URL_PAST_24H = 'https://www.linkedin.com/search/results/content/?datePosted=%22past-24h%22&keywords=hiring%20(react%20OR%20frontend%20OR%20mern)%20(resume%20OR%20cv%20OR%20email)&origin=FACETED_SEARCH&sortBy=%22date_posted%22';

(async () => {
  let browser;
  try {
    console.log('[LinkedIn 24h Recruiter Search] Connecting to Brave...');
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });

    await assertLinkedInTabsCeiling(browser);

    const pages = await browser.pages();
    let page = pages.find(p => p.url().includes('linkedin.com'));
    if (!page) page = await browser.newPage();
    await page.bringToFront();

    console.log('[LinkedIn 24h Recruiter Search] Opening past-24h React/MERN hiring posts...');
    await page.goto(URL_PAST_24H, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await humanDelay(4000, 7000);

    console.log('[LinkedIn 24h Recruiter Search] Scrolling and expanding posts...');
    await humanScroll(page, 4, 300);
    await humanDelay(2500, 4500);

    // Expand all "see more" buttons
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button')).filter(b => /see more/i.test(b.innerText));
      btns.forEach(b => { try { b.click(); } catch (e) {} });
    });
    await sleep(2000);

    const text = await page.evaluate(() => document.body.innerText);
    console.log(`[LinkedIn 24h Recruiter Search] Extracted ${text.length} chars of live search DOM.`);

    // Extract emails
    const emails = (text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [])
      .map(e => e.toLowerCase())
      .filter(e => !e.endsWith('.png') && !e.endsWith('.jpg') && !e.includes('example.com') && !e.includes('wixpress.com'));

    const uniqueEmails = Array.from(new Set(emails));
    console.log(`[LinkedIn 24h Recruiter Search] Raw unique emails detected: ${uniqueEmails.length}`);

    const f5Path = 'C:\\mcp\\job-search-mcp-engine\\applied_todays_2026-10-19.json';
    const f5 = fs.existsSync(f5Path) ? JSON.parse(fs.readFileSync(f5Path, 'utf8')) : { jobs: [] };
    const appliedEmails = new Set(f5.jobs.map(j => (j.recipient || '').toLowerCase()).filter(Boolean));

    const f1Path = 'C:\\mcp\\job-search-mcp-engine\\total_historical_except_today.json';
    const f1Raw = fs.existsSync(f1Path) ? JSON.parse(fs.readFileSync(f1Path, 'utf8')) : [];
    const f1 = Array.isArray(f1Raw) ? f1Raw : (f1Raw.jobs || []);
    const histEmails = new Set(f1.map(j => (j.recipient || j.recipient_or_url || '').toLowerCase()).filter(Boolean));

    const freshEligible = [];

    for (const email of uniqueEmails) {
      if (appliedEmails.has(email) || histEmails.has(email)) {
        console.log(`  [DUPLICATE]: ${email} already in today or history.`);
        continue;
      }

      // Find surrounding text context
      const idx = text.toLowerCase().indexOf(email);
      const start = Math.max(0, idx - 400);
      const end = Math.min(text.length, idx + 250);
      const context = text.substring(start, end);
      const lowerContext = context.toLowerCase();

      // Check tech stack relevance
      const isTech = /react|frontend|front-end|mern|full stack|fullstack|javascript|typescript|web developer|node/i.test(lowerContext);
      if (!isTech) {
        console.log(`  [SKIPPED_NON_DEV]: ${email} (Non-web stack context).`);
        continue;
      }

      // Check senior / YOE
      const isSenior = /senior|sr\.|lead|architect|principal|3\+|4\+|5\+|6\+|3-5|4-6/i.test(lowerContext);
      if (isSenior) {
        console.log(`  [SKIPPED_SENIOR]: ${email} (Requires 3+ YOE / Senior).`);
        continue;
      }

      console.log(`\n  🎉 [FRESH VERIFIED 0-2 YOE LEAD DETECTED!]:`);
      console.log(`     Email: ${email}`);
      console.log(`     Snippet: ${context.replace(/\n+/g, ' ').substring(0, 200)}...`);

      freshEligible.push({
        email,
        context: context.replace(/\n+/g, ' ')
      });
    }

    console.log(`\n==============================================================`);
    console.log(`[LinkedIn 24h Search Completed] Fresh eligible leads: ${freshEligible.length}`);
    fs.writeFileSync('C:\\mcp\\fresh_linkedin_24h_leads.json', JSON.stringify(freshEligible, null, 2), 'utf8');

  } catch (err) {
    console.error('[LinkedIn 24h Search] Error:', err.message);
  } finally {
    if (browser) await browser.disconnect();
  }
})();
