const puppeteer = require('puppeteer-core');

(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const p = (await b.pages()).find(x => x.url().includes('mail.google.com'));
  if (!p) {
    b.disconnect();
    return;
  }
  await p.bringToFront();

  console.log('Navigating and reloading on #search/referral...');
  await p.goto('https://mail.google.com/mail/u/0/#search/referral', { waitUntil: 'domcontentloaded' });
  await p.reload({ waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 4500));

  const items = await p.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('tr.zA, tr[role="row"]')).filter(r => r.innerText.trim().length > 5);
    return rows.map((r, i) => {
      const sender = r.querySelector('.zF, .bA4, .yX, span[email]')?.innerText.trim() || '';
      const subject = r.querySelector('.bog, .bqe')?.innerText.trim() || '';
      const snippet = r.querySelector('.y2')?.innerText.trim() || '';
      const date = r.querySelector('.xW, .m1')?.innerText.trim() || '';
      return { idx: i, sender, subject, snippet, date };
    });
  });

  console.log(`Results for referral search: ${items.length}`);
  console.log(JSON.stringify(items.slice(0, 10), null, 2));

  b.disconnect();
})();
