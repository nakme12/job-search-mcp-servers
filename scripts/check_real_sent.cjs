const puppeteer = require('puppeteer-core');

(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const p = (await b.pages()).find(x => x.url().includes('mail.google.com'));
  if (!p) {
    b.disconnect();
    return;
  }
  await p.goto('https://mail.google.com/mail/u/0/#sent', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 4000));

  const rows = await p.evaluate(() => {
    const trs = Array.from(document.querySelectorAll('tr.zA, tr[role="row"]'));
    return trs.slice(0, 5).map(tr => {
      const rec = tr.querySelector('.zF, .bA4, .yX, span[email]')?.innerText || '';
      const subj = tr.querySelector('.bog, .bqe')?.innerText || '';
      const snip = tr.querySelector('.y2')?.innerText || '';
      const date = tr.querySelector('.xW, .m1')?.innerText || '';
      return { rec, subj, snip, date };
    });
  });

  console.log('ACTUAL TOP SENT ROWS:\n', JSON.stringify(rows, null, 2));
  b.disconnect();
})();
