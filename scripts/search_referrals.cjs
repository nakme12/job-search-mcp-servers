const puppeteer = require('puppeteer-core');

(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', protocolTimeout: 60000 });
  const pages = await b.pages();
  const p = pages.find(x => x.url().includes('mail.google.com'));
  if (!p) {
    b.disconnect();
    return;
  }
  await p.bringToFront();

  console.log('Searching "referral OR referred OR refer"...');
  await p.evaluate(() => {
    const input = document.querySelector('input[aria-label="Search mail"], input[name="q"]');
    if (input) {
      input.value = 'referral OR referred OR refer';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      const form = input.closest('form');
      if (form) form.dispatchEvent(new Event('submit', { bubbles: true }));
    }
  });

  await new Promise(r => setTimeout(r, 4000));

  const items = await p.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('tr.zA, tr[role="row"]')).filter(r => r.innerText.trim().length > 5);
    return rows.map((r, i) => {
      const sender = r.querySelector('.zF, .bA4, .yX, span[email]')?.innerText.trim() || '';
      const email = r.querySelector('.zF, .bA4, .yX, span[email]')?.getAttribute('email') || '';
      const subject = r.querySelector('.bog, .bqe')?.innerText.trim() || '';
      const snippet = r.querySelector('.y2')?.innerText.trim() || '';
      const date = r.querySelector('.xW, .m1')?.innerText.trim() || '';
      return { idx: i, sender, email, subject, snippet, date };
    });
  });

  console.log(`Matching rows for referral: ${items.length}`);
  console.log(JSON.stringify(items.slice(0, 15), null, 2));

  b.disconnect();
})();
