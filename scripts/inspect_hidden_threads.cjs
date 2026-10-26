const puppeteer = require('puppeteer-core');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  let browser;
  try {
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
    const pages = await browser.pages();
    let p = pages.find(x => x.url().includes('mail.google.com'));
    if (!p) {
      b.disconnect();
      return;
    }
    await p.bringToFront();

    const targets = [
      { name: 'HR Ops Assessment', query: 'subject:"Pre-Screening assesment"' },
      { name: 'Himangi Thread', query: 'Himangi' },
      { name: 'Bhavna Thread', query: 'Bhavna' }
    ];

    for (const t of targets) {
      console.log(`\n========================================`);
      console.log(`Checking ${t.name}: ${t.query}`);
      console.log(`========================================`);

      await p.goto(`https://mail.google.com/mail/u/0/#search/${encodeURIComponent(t.query)}`, { waitUntil: 'domcontentloaded' });
      await sleep(3500);

      const row = await p.$('tr.zA');
      if (row) {
        await p.evaluate(() => {
          const r = document.querySelector('tr.zA');
          const target = r.querySelector('.bog') || r;
          target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        });
        await sleep(3000);

        const details = await p.evaluate(() => {
          const subject = document.querySelector('h2.hP')?.innerText || '';
          const senderEl = document.querySelector('.gD');
          const senderName = senderEl?.innerText || '';
          const senderEmail = senderEl?.getAttribute('email') || '';
          const date = document.querySelector('.g3')?.getAttribute('title') || document.querySelector('.g3')?.innerText || '';
          const body = document.querySelector('.a3s')?.innerText || '';
          return { subject, senderName, senderEmail, date, bodySnippet: body.slice(0, 400) };
        });

        console.log(JSON.stringify(details, null, 2));
      } else {
        console.log('No row found');
      }
    }

    browser.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    if (browser) browser.disconnect();
  }
})();
