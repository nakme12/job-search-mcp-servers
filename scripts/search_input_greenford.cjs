const puppeteer = require('puppeteer-core');

(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const pages = await b.pages();
  const p = pages.find(x => x.url().includes('mail.google.com'));
  if (!p) {
    b.disconnect();
    return;
  }

  // Type in the search box directly
  const searchInput = await p.$('input[aria-label="Search mail"], input[name="q"]');
  if (searchInput) {
    await searchInput.click({ clickCount: 3 });
    await searchInput.press('Backspace');
    await searchInput.type('in:anywhere Greenford', { delay: 50 });
    await searchInput.press('Enter');
    await new Promise(r => setTimeout(r, 4000));

    const rows = await p.evaluate(() => {
      const items = Array.from(document.querySelectorAll('tr[role="row"], tr.zA'));
      return items.map((r, i) => {
        return {
          idx: i,
          text: r.innerText.replace(/\n+/g, ' | ')
        };
      });
    });

    console.log(`Found ${rows.length} rows for in:anywhere Greenford`);
    console.log(JSON.stringify(rows, null, 2));

    if (rows.length > 0) {
      // Click first row
      await p.evaluate(() => {
        const row = document.querySelector('tr[role="row"], tr.zA');
        const target = row.querySelector('.bog') || row;
        target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      });
      await new Promise(r => setTimeout(r, 3000));

      const details = await p.evaluate(() => {
        const subject = document.querySelector('h2.hP')?.innerText || '';
        const sender = document.querySelector('.gD')?.innerText || '';
        const email = document.querySelector('.gD')?.getAttribute('email') || '';
        const date = document.querySelector('.g3')?.getAttribute('title') || document.querySelector('.g3')?.innerText || '';
        const body = document.querySelector('.a3s')?.innerText || '';
        return { subject, sender, email, date, body };
      });

      console.log('=== EMAIL DETAILS ===');
      console.log(JSON.stringify(details, null, 2));
    }
  }

  b.disconnect();
})();
