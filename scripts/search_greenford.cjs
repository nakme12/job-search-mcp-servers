const puppeteer = require('puppeteer-core');
const fs = require('fs');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  let browser;
  try {
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    
    let pratikTab = pages.find(p => p.url().includes('mail.google.com'));
    if (!pratikTab) {
      pratikTab = await browser.newPage();
      await pratikTab.goto('https://mail.google.com/mail/u/0/#inbox', { waitUntil: 'networkidle2' });
    }

    await pratikTab.bringToFront();
    const currentUrl = pratikTab.url();
    const baseUrlMatch = currentUrl.match(/https:\/\/mail\.google\.com\/mail\/u\/[^/]+\//);
    const baseUrl = baseUrlMatch ? baseUrlMatch[0] : 'https://mail.google.com/mail/u/0/';

    console.log(`Searching for "Greenford" in Gmail: ${baseUrl}#search/Greenford`);
    await pratikTab.goto(`${baseUrl}#search/Greenford`, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(3500);

    const results = await pratikTab.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tr[role="row"], tr.zA'));
      return rows.map((r, i) => {
        const senderEl = r.querySelector('.zF, .bA4, .yX, span[email]');
        const sender = senderEl ? senderEl.innerText.trim() : (r.querySelector('.yX')?.innerText.trim() || '');
        const subjectEl = r.querySelector('.bog, .bqe, span[data-thread-id]');
        const subject = subjectEl ? subjectEl.innerText.trim() : '';
        const snippetEl = r.querySelector('.y2');
        const snippet = snippetEl ? snippetEl.innerText.trim() : '';
        const dateEl = r.querySelector('.xW, .m1');
        const date = dateEl ? dateEl.innerText.trim() : '';
        const isUnread = r.classList.contains('zE');

        return {
          idx: i + 1,
          sender,
          subject,
          snippet,
          date,
          isUnread
        };
      });
    });

    console.log(`Results for "Greenford": ${results.length}`);
    console.log(JSON.stringify(results, null, 2));

    // Also check if no results, let's search in all mail `in:anywhere Greenford`
    if (results.length === 0) {
      console.log('Searching everywhere: in:anywhere Greenford');
      await pratikTab.goto(`${baseUrl}#search/in%3Aanywhere+Greenford`, { waitUntil: 'networkidle2', timeout: 30000 });
      await sleep(3500);
      const anywhereResults = await pratikTab.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('tr[role="row"], tr.zA'));
        return rows.map((r, i) => {
          const senderEl = r.querySelector('.zF, .bA4, .yX, span[email]');
          const sender = senderEl ? senderEl.innerText.trim() : (r.querySelector('.yX')?.innerText.trim() || '');
          const subjectEl = r.querySelector('.bog, .bqe, span[data-thread-id]');
          const subject = subjectEl ? subjectEl.innerText.trim() : '';
          const snippetEl = r.querySelector('.y2');
          const snippet = snippetEl ? snippetEl.innerText.trim() : '';
          const dateEl = r.querySelector('.xW, .m1');
          const date = dateEl ? dateEl.innerText.trim() : '';
          return { idx: i + 1, sender, subject, snippet, date };
        });
      });
      console.log(`Everywhere results: ${anywhereResults.length}`);
      console.log(JSON.stringify(anywhereResults, null, 2));
    }

    browser.disconnect();
  } catch (err) {
    console.error('Search error:', err.message);
    if (browser) browser.disconnect();
    process.exit(1);
  }
})();
