const puppeteer = require('puppeteer-core');

(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const p = (await b.pages()).find(x => x.url().includes('mail.google.com'));
  if (!p) {
    b.disconnect();
    return;
  }
  await p.bringToFront();

  // Click the Sent link in left sidebar
  console.log('Clicking Sent navigation link...');
  await p.evaluate(() => {
    const sentLink = document.querySelector('a[href*="#sent"], a[aria-label*="Sent"]');
    if (sentLink) sentLink.click();
  });
  await new Promise(r => setTimeout(r, 3500));

  const items = await p.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('tr.zA, tr[role="row"]')).filter(r => r.innerText.trim().length > 5);
    return rows.slice(0, 5).map(r => {
      const rec = r.querySelector('.zF, .bA4, .yX, span[email]')?.innerText || '';
      const subj = r.querySelector('.bog, .bqe')?.innerText || '';
      const snip = r.querySelector('.y2')?.innerText || '';
      const date = r.querySelector('.xW, .m1')?.innerText || '';
      return { rec, subj, snip, date };
    });
  });

  console.log('Real Sent Items:\n', JSON.stringify(items, null, 2));
  b.disconnect();
})();
