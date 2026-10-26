const puppeteer = require('puppeteer-core');

(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const pages = await b.pages();
  const p = pages.find(x => x.url().includes('mail.google.com'));
  if (!p) {
    b.disconnect();
    return;
  }

  // Go to search "from:greenford" or "greenford construction"
  await p.goto('https://mail.google.com/mail/u/0/#search/%22Greenford+Construction%22', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await new Promise(r => setTimeout(r, 2500));

  const items = await p.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('tr[role="row"], tr.zA'));
    return rows.map((r, i) => {
      const sender = r.querySelector('.zF, .bA4, .yX, span[email]')?.innerText.trim() || '';
      const subject = r.querySelector('.bog, .bqe')?.innerText.trim() || '';
      const snippet = r.querySelector('.y2')?.innerText.trim() || '';
      const date = r.querySelector('.xW, .m1')?.innerText.trim() || '';
      return { idx: i, sender, subject, snippet, date };
    });
  });

  console.log('Results for "Greenford Construction":', JSON.stringify(items, null, 2));

  if (items.length > 0) {
    // Click on the first row
    await p.evaluate(() => {
      const row = document.querySelector('tr[role="row"], tr.zA');
      if (row) {
        const target = row.querySelector('.bog') || row;
        target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      }
    });
    await new Promise(r => setTimeout(r, 3000));

    const fullDetails = await p.evaluate(() => {
      const subject = document.querySelector('h2.hP')?.innerText || '';
      const senderEl = document.querySelector('.gD');
      const senderName = senderEl?.innerText || '';
      const senderEmail = senderEl?.getAttribute('email') || '';
      const toEl = document.querySelector('.g2');
      const to = toEl?.innerText || '';
      const dateEl = document.querySelector('.g3');
      const date = dateEl?.getAttribute('title') || dateEl?.innerText || '';
      const bodyEl = document.querySelector('.a3s');
      const body = bodyEl ? bodyEl.innerText : '';
      return { subject, senderName, senderEmail, to, date, body };
    });

    console.log('=== FULL GREENFORD EMAIL ===');
    console.log(JSON.stringify(fullDetails, null, 2));
  }

  b.disconnect();
})();
