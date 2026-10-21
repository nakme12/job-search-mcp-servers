const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const pages = await browser.pages();
  const pratik = pages.find(p => p.url().includes('mail.google.com/mail/u/1'));
  if (!pratik) {
    console.log('No /u/1/ page found among tabs');
    pages.forEach(p => console.log('Tab:', p.url()));
    browser.disconnect();
    return;
  }

  console.log('Found tab:', await pratik.title(), 'at', pratik.url());

  // Wait for Gmail to finish loading UI
  await pratik.waitForSelector('div[role="main"]', { timeout: 15000 });
  await new Promise(r => setTimeout(r, 4000));

  const data = await pratik.evaluate(() => {
    const main = document.querySelector('div[role="main"]');
    if (!main) return { err: 'no main found' };
    const rows = Array.from(main.querySelectorAll('tr[role="row"]'));
    return {
      totalRows: rows.length,
      samples: rows.slice(0, 10).map(r => {
        // extract all text content
        const allSpans = Array.from(r.querySelectorAll('span, div')).map(el => el.textContent.trim()).filter(t => t.length > 2);
        return {
          textContent: r.textContent.trim().replace(/\s+/g, ' '),
          spans: allSpans.slice(0, 5),
          isUnread: r.className.includes('zE')
        };
      })
    };
  });

  console.log(`Total rows in div[role=main]: ${data.totalRows}`);
  (data.samples || []).forEach((s, idx) => {
    console.log(`[${idx + 1}] ${s.isUnread ? '🔴 UNREAD' : '⚪ READ'} | ${s.textContent}`);
    console.log(`     Spans:`, s.spans);
  });

  browser.disconnect();
})();
