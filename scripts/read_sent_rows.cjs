const puppeteer = require('puppeteer-core');

(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const pages = await b.pages();
  const p = pages.find(x => x.url().includes('mail.google.com'));
  if (!p) {
    b.disconnect();
    return;
  }
  await p.waitForSelector('tr.zA, tr[role="row"]', { timeout: 10000 });
  const rows = await p.evaluate(() => {
    const items = Array.from(document.querySelectorAll('tr.zA'));
    return items.slice(0, 5).map(r => {
      const recipient = r.querySelector('.zF, .bA4, .yX, span[email]')?.innerText.trim() || '';
      const subject = r.querySelector('.bog, .bqe')?.innerText.trim() || '';
      const snippet = r.querySelector('.y2')?.innerText.trim() || '';
      const date = r.querySelector('.xW, .m1')?.innerText.trim() || '';
      return { recipient, subject, snippet, date };
    });
  });

  console.log('Hydrated Sent Rows:\n', JSON.stringify(rows, null, 2));
  b.disconnect();
})();
