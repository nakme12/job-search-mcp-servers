const puppeteer = require('puppeteer-core');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  let browser;
  try {
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    let pratikTab = pages.find(p => p.url().includes('mail.google.com'));
    if (!pratikTab) {
      console.log('Gmail tab not found');
      browser.disconnect();
      return;
    }
    await pratikTab.bringToFront();

    console.log('Navigating to Greenford search...');
    await pratikTab.goto('https://mail.google.com/mail/u/0/#search/Greenford', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await sleep(2500);

    // Wait for row
    await pratikTab.waitForSelector('tr[role="row"], tr.zA', { timeout: 10000 });
    const row = await pratikTab.$('tr[role="row"], tr.zA');
    if (row) {
      console.log('Clicking on row...');
      await row.click();
      await sleep(2500);

      const emailDetails = await pratikTab.evaluate(() => {
        const subject = document.querySelector('h2.hP')?.innerText || '';
        const senderEl = document.querySelector('.gD');
        const senderName = senderEl?.innerText || '';
        const senderEmail = senderEl?.getAttribute('email') || '';
        const dateEl = document.querySelector('.g3');
        const date = dateEl?.getAttribute('title') || dateEl?.innerText || '';
        const bodyEl = document.querySelector('.a3s, .adP');
        const body = bodyEl ? bodyEl.innerText : '';

        return { subject, senderName, senderEmail, date, body };
      });

      console.log('=== GREENFORD EMAIL FULL DETAILS ===');
      console.log(JSON.stringify(emailDetails, null, 2));
    } else {
      console.log('Row not found');
    }

    browser.disconnect();
  } catch (e) {
    console.error('Error:', e.message);
    if (browser) browser.disconnect();
  }
})();
