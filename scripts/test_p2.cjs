const puppeteer = require('puppeteer-core');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const p = (await b.pages()).find(x => x.url().includes('mail.google.com'));
  if (!p) {
    b.disconnect();
    return;
  }
  await p.bringToFront();

  console.log('Navigating to page 2: #search/newer_than%3A15d/p2...');
  await p.goto('https://mail.google.com/mail/u/0/#search/newer_than%3A15d/p2', { waitUntil: 'domcontentloaded' });
  await p.reload({ waitUntil: 'domcontentloaded' });
  await sleep(4000);

  const rows = await p.evaluate(() => {
    const trs = Array.from(document.querySelectorAll('tr.zA, tr[role="row"]')).filter(r => r.innerText.trim().length > 5);
    return trs.slice(0, 10).map(r => {
      const sender = r.querySelector('.zF, .bA4, .yX, span[email]')?.innerText.trim() || '';
      const subject = r.querySelector('.bog, .bqe')?.innerText.trim() || '';
      const snippet = r.querySelector('.y2')?.innerText.trim() || '';
      const date = r.querySelector('.xW, .m1')?.innerText.trim() || '';
      return { sender, subject, snippet, date };
    });
  });

  console.log('Page 2 Rows:\n', JSON.stringify(rows, null, 2));

  b.disconnect();
})();
