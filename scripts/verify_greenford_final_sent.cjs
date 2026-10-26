const puppeteer = require('puppeteer-core');

(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const p = (await b.pages()).find(x => x.url().includes('mail.google.com'));
  if (!p) {
    b.disconnect();
    return;
  }

  // Search to:hrd@greenfordconstruction.co.uk
  await p.goto('https://mail.google.com/mail/u/0/#search/to%3Ahrd%40greenfordconstruction.co.uk', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await new Promise(r => setTimeout(r, 3500));

  const items = await p.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('tr[role="row"], tr.zA'));
    return rows.map(r => {
      const recipient = r.querySelector('.zF, .bA4, .yX, span[email]')?.innerText.trim() || '';
      const subject = r.querySelector('.bog, .bqe')?.innerText.trim() || '';
      const snippet = r.querySelector('.y2')?.innerText.trim() || '';
      const date = r.querySelector('.xW, .m1')?.innerText.trim() || '';
      return { recipient, subject, snippet, date };
    });
  });

  console.log('Search to:hrd@greenfordconstruction.co.uk results:');
  console.log(JSON.stringify(items, null, 2));

  b.disconnect();
})();
