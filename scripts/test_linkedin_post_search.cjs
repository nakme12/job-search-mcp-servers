const puppeteer = require('puppeteer-core');
const fs = require('fs');
const { humanDelay, humanScroll, assertLinkedInTabsCeiling } = require('./linkedin_human_emulator.cjs');

const sleep = ms => new Promise(r => setTimeout(r, ms));

const SEARCH_URL = 'https://www.linkedin.com/search/results/content/?keywords=hiring%20react%20indore%20OR%20remote&origin=GLOBAL_SEARCH_HEADER&sortBy=%22date_posted%22';

(async () => {
  let browser;
  try {
    console.log('[LinkedIn Search Surfer] Connecting to Brave...');
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });

    await assertLinkedInTabsCeiling(browser);

    const pages = await browser.pages();
    let page = pages.find(p => p.url().includes('linkedin.com'));
    if (!page) {
      page = await browser.newPage();
    }
    await page.bringToFront();

    console.log('[LinkedIn Search Surfer] Navigating to Date-Posted sorted hiring search...');
    await page.goto(SEARCH_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await humanDelay(4000, 7000);

    console.log('[LinkedIn Search Surfer] Simulating human scroll and expanding posts...');
    await humanScroll(page, 3, 300);
    await humanDelay(3000, 5000);

    // Click visible see more buttons
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button')).filter(b => /see more/i.test(b.innerText));
      btns.slice(0, 8).forEach(b => { try { b.click(); } catch(e){} });
    });
    await sleep(2000);

    const text = await page.evaluate(() => document.body.innerText);
    console.log(`[LinkedIn Search Surfer] Total page text length: ${text.length}`);

    // Read f5 applied to skip already applied
    const f5Path = 'C:\\mcp\\job-search-mcp-engine\\applied_todays_2026-10-19.json';
    const f5 = fs.existsSync(f5Path) ? JSON.parse(fs.readFileSync(f5Path, 'utf8')) : { jobs: [] };
    const appliedEmails = new Set(f5.jobs.map(j => (j.recipient || '').toLowerCase()).filter(Boolean));

    // Extract all emails
    const emails = (text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [])
      .map(e => e.toLowerCase())
      .filter(e => !e.endsWith('.png') && !e.endsWith('.jpg') && !e.includes('example.com') && !appliedEmails.has(e));

    const uniqueEmails = Array.from(new Set(emails));
    console.log(`[LinkedIn Search Surfer] Found ${uniqueEmails.length} fresh unapplied recruiter emails!`);
    console.log('Emails:', uniqueEmails);

    // Save dump
    fs.writeFileSync('C:\\mcp\\linkedin_search_dump.txt', text, 'utf8');

    // Parse snippet for each email
    const findings = [];
    for (const email of uniqueEmails) {
      const idx = text.toLowerCase().indexOf(email);
      if (idx !== -1) {
        const start = Math.max(0, idx - 180);
        const end = Math.min(text.length, idx + 180);
        const snippet = text.substring(start, end).replace(/\n+/g, ' ');
        findings.push({ email, snippet });
        console.log(`\n📧 Email: ${email}`);
        console.log(`   Context: ${snippet}`);
      }
    }

    fs.writeFileSync('C:\\mcp\\fresh_linkedin_search_leads.json', JSON.stringify(findings, null, 2), 'utf8');

  } catch (err) {
    console.error('[LinkedIn Search Surfer] Error:', err.message);
  } finally {
    if (browser) await browser.disconnect();
  }
})();
