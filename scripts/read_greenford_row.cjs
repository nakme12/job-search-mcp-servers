const puppeteer = require('puppeteer-core');

(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const pages = await b.pages();
  const p = pages.find(x => x.url().includes('mail.google.com'));
  if (!p) {
    b.disconnect();
    return;
  }

  await p.goto('https://mail.google.com/mail/u/0/#search/Greenford', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await new Promise(r => setTimeout(r, 3000));

  // Find all rows
  const rows = await p.$$('tr[role="row"], tr.zA');
  console.log(`Total rows found: ${rows.length}`);

  // Let's inspect each row's text to find Greenford
  const matchingIndex = await p.evaluate(() => {
    const list = Array.from(document.querySelectorAll('tr[role="row"], tr.zA'));
    for (let i = 0; i < list.length; i++) {
      if (list[i].innerText.includes('Greenford')) {
        return i;
      }
    }
    return -1;
  });

  console.log(`Matching row index for Greenford: ${matchingIndex}`);

  if (matchingIndex !== -1) {
    // Click on matching row
    await p.evaluate((idx) => {
      const list = Array.from(document.querySelectorAll('tr[role="row"], tr.zA'));
      const row = list[idx];
      const target = row.querySelector('.bog') || row;
      target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    }, matchingIndex);

    await new Promise(r => setTimeout(r, 3000));

    const details = await p.evaluate(() => {
      const subject = document.querySelector('h2.hP')?.innerText || '';
      const senderEl = document.querySelector('.gD');
      const senderName = senderEl?.innerText || '';
      const senderEmail = senderEl?.getAttribute('email') || '';
      const dateEl = document.querySelector('.g3');
      const date = dateEl?.getAttribute('title') || dateEl?.innerText || '';
      const bodyEl = document.querySelector('.a3s');
      const body = bodyEl ? bodyEl.innerText : '';
      return { subject, senderName, senderEmail, date, body };
    });

    console.log('=== FULL GREENFORD EMAIL DETAILS ===');
    console.log(JSON.stringify(details, null, 2));
  }

  b.disconnect();
})();
