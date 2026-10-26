const puppeteer = require('puppeteer-core');

(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const pages = await b.pages();
  const p = pages.find(x => x.url().includes('mail.google.com'));
  if (!p) {
    console.log('No gmail tab');
    b.disconnect();
    return;
  }

  // Click row using evaluate to simulate real click
  await p.evaluate(() => {
    const row = document.querySelector('tr.zA, tr[role="row"]');
    if (row) {
      const target = row.querySelector('.bog') || row;
      target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    }
  });

  await new Promise(r => setTimeout(r, 2500));

  const details = await p.evaluate(() => {
    const subject = document.querySelector('h2.hP')?.innerText || '';
    const sender = document.querySelector('.gD')?.innerText || '';
    const email = document.querySelector('.gD')?.getAttribute('email') || '';
    const date = document.querySelector('.g3')?.getAttribute('title') || document.querySelector('.g3')?.innerText || '';
    const body = document.querySelector('.a3s')?.innerText || '';
    return { subject, sender, email, date, body };
  });

  console.log(JSON.stringify(details, null, 2));
  b.disconnect();
})();
