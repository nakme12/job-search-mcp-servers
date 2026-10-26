const puppeteer = require('puppeteer-core');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  let browser;
  try {
    console.log('[RED SAG Email] Connecting to browser...');
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', protocolTimeout: 60000 });
    const pages = await browser.pages();
    let p = pages.find(x => x.url().includes('mail.google.com'));
    if (!p) {
      p = await browser.newPage();
    }
    await p.bringToFront();

    console.log('Searching for RED SAG assessment email...');
    await p.goto('https://mail.google.com/mail/u/0/#search/%22RED+SAG+assessment%22', { waitUntil: 'domcontentloaded' });
    await p.reload({ waitUntil: 'domcontentloaded' });
    await sleep(4000);

    const row = await p.$('tr.zA');
    if (row) {
      console.log('Clicking RED SAG email row...');
      await p.evaluate(() => {
        const r = document.querySelector('tr.zA');
        const target = r.querySelector('.bog') || r;
        target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      });
      await sleep(3500);

      const emailData = await p.evaluate(() => {
        const subject = document.querySelector('h2.hP')?.innerText || '';
        const sender = document.querySelector('.gD')?.innerText || '';
        const senderEmail = document.querySelector('.gD')?.getAttribute('email') || '';
        const date = document.querySelector('.g3')?.getAttribute('title') || document.querySelector('.g3')?.innerText || '';
        const body = document.querySelector('.a3s')?.innerText || '';
        const links = Array.from(document.querySelectorAll('.a3s a, div[role="main"] a')).map(a => ({
          text: a.innerText.trim(),
          href: a.href
        })).filter(l => l.href && (l.href.includes('assessment') || l.text.toLowerCase().includes('start') || l.text.toLowerCase().includes('assessment') || l.href.includes('http')));

        return { subject, sender, senderEmail, date, body, links };
      });

      console.log('=== RED SAG EMAIL DETAILS ===');
      console.log(JSON.stringify(emailData, null, 2));

      fs.writeFileSync('red_sag_email_details.json', JSON.stringify(emailData, null, 2));
    } else {
      console.log('No row found for RED SAG assessment');
    }

    browser.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    if (browser) browser.disconnect();
  }
})();
