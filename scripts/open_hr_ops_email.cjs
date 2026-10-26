const puppeteer = require('puppeteer-core');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  let browser;
  try {
    console.log('[HR Ops Email] Connecting to browser...');
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', protocolTimeout: 60000 });
    const pages = await browser.pages();
    let p = pages.find(x => x.url().includes('mail.google.com'));
    if (!p) {
      p = await browser.newPage();
    }
    await p.bringToFront();

    console.log('Searching for "Pre-Screening assesment"...');
    await p.goto('https://mail.google.com/mail/u/0/#search/Pre-Screening+assesment', { waitUntil: 'domcontentloaded' });
    await p.reload({ waitUntil: 'domcontentloaded' });
    await sleep(4000);

    // Click matching row
    const row = await p.$('tr.zA');
    if (row) {
      console.log('Clicking on HR Ops email row...');
      await p.evaluate(() => {
        const r = document.querySelector('tr.zA');
        const target = r.querySelector('.bog') || r;
        target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      });
      await sleep(3500);

      const emailData = await p.evaluate(() => {
        const subject = document.querySelector('h2.hP')?.innerText || '';
        const senderEl = document.querySelector('.gD');
        const senderName = senderEl?.innerText || '';
        const senderEmail = senderEl?.getAttribute('email') || '';
        const dateEl = document.querySelector('.g3');
        const date = dateEl?.getAttribute('title') || dateEl?.innerText || '';
        const bodyEl = document.querySelector('.a3s');
        const body = bodyEl ? bodyEl.innerText : '';
        const links = Array.from(document.querySelectorAll('.a3s a')).map(a => ({
          text: a.innerText.trim(),
          href: a.href
        }));
        return { subject, senderName, senderEmail, date, body, links };
      });

      console.log('=== HR OPS EMAIL FULL DETAILS ===');
      console.log(JSON.stringify(emailData, null, 2));
    } else {
      console.log('No row found for Pre-Screening assesment');
    }

    browser.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    if (browser) browser.disconnect();
  }
})();
