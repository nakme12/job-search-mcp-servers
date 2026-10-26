const puppeteer = require('puppeteer-core');
const fs = require('fs');

const CANDIDATE_EMAIL = 'pratikpatidar7990@gmail.com';
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  let browser;
  try {
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    
    let pratikTab = null;
    for (const p of pages) {
      const url = p.url();
      if (url.includes('mail.google.com')) {
        const title = await p.title();
        if (title.includes(CANDIDATE_EMAIL) || url.includes(CANDIDATE_EMAIL) || url.includes('/u/1/')) {
          pratikTab = p;
          break;
        }
      }
    }

    if (!pratikTab) {
      // Find any mail.google.com tab or create one
      pratikTab = pages.find(p => p.url().includes('mail.google.com'));
      if (!pratikTab) {
        pratikTab = await browser.newPage();
        await pratikTab.goto(`https://mail.google.com/mail/u/?authuser=${CANDIDATE_EMAIL}`, { waitUntil: 'networkidle2' });
      }
    }

    await pratikTab.bringToFront();
    const currentUrl = pratikTab.url();
    console.log(`Auditing Gmail tab: ${currentUrl}`);

    // Navigate to search: newer_than:7d
    // Extract base URL
    const baseUrlMatch = currentUrl.match(/https:\/\/mail\.google\.com\/mail\/u\/[^/]+\//);
    const baseUrl = baseUrlMatch ? baseUrlMatch[0] : 'https://mail.google.com/mail/u/1/';
    
    console.log(`Navigating to search for last 7 days: ${baseUrl}#search/newer_than%3A7d`);
    await pratikTab.goto(`${baseUrl}#search/newer_than%3A7d`, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(3000);

    // Wait for rows
    await pratikTab.waitForSelector('tr[role="row"], tr.zA', { timeout: 15000 });
    await sleep(2000);

    const rows = await pratikTab.evaluate(() => {
      const items = Array.from(document.querySelectorAll('tr[role="row"], tr.zA'));
      return items.map((r, i) => {
        const senderEl = r.querySelector('.zF, .bA4, .yX, span[email]');
        const sender = senderEl ? senderEl.innerText.trim() : (r.querySelector('.yX')?.innerText.trim() || '');
        const emailAttr = senderEl?.getAttribute('email') || '';
        const subjectEl = r.querySelector('.bog, .bqe, span[data-thread-id]');
        const subject = subjectEl ? subjectEl.innerText.trim() : '';
        const snippetEl = r.querySelector('.y2');
        const snippet = snippetEl ? snippetEl.innerText.trim() : '';
        const dateEl = r.querySelector('.xW, .m1');
        const date = dateEl ? dateEl.innerText.trim() : '';
        const isUnread = r.classList.contains('zE') || (subjectEl && window.getComputedStyle(subjectEl).fontWeight >= '700');

        return {
          idx: i + 1,
          sender,
          emailAttr,
          subject,
          snippet,
          date,
          isUnread
        };
      }).filter(x => x.sender || x.subject);
    });

    console.log(`Found ${rows.length} emails in the last 7 days.`);
    fs.writeFileSync('last_7_days_emails.json', JSON.stringify(rows, null, 2));

    // Print summary in console
    rows.forEach(r => {
      console.log(`[#${r.idx}] [${r.date}] [${r.isUnread ? 'UNREAD' : 'READ'}] From: ${r.sender} | Subject: ${r.subject} | Snippet: ${r.snippet.slice(0, 80)}...`);
    });

    browser.disconnect();
  } catch (err) {
    console.error('Error during 7 days email audit:', err.message);
    if (browser) browser.disconnect();
    process.exit(1);
  }
})();
