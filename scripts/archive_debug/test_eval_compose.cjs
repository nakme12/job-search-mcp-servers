/**
 * TEST DIRECT COMPOSE BOX OPEN VIA GMAIL KEYBOARD SHORTCUT 'c' OR EVAL CLICK
 */
const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const pages = await browser.pages();
  const gmailPage = pages.find(p => p.url().includes('mail.google.com/mail/u/1/'));
  if (!gmailPage) {
    console.log('NO_PAGE');
    await browser.disconnect();
    return;
  }

  console.log('Navigating cleanly to #inbox...');
  await gmailPage.goto('https://mail.google.com/mail/u/1/#inbox', { waitUntil: 'networkidle2', timeout: 20000 });
  await new Promise(r => setTimeout(r, 2000));

  console.log('Evaluating Compose button click in DOM context...');
  const clicked = await gmailPage.evaluate(() => {
    // Look for compose button by role and attributes
    const btn = document.querySelector('div[role="button"][gh="cm"], div.T-I.T-I-KE.L3, [data-tooltip="Compose"]');
    if (btn) {
      btn.click();
      return true;
    }
    // Fallback: search by innerText 'Compose'
    const allDivs = Array.from(document.querySelectorAll('div[role="button"]'));
    const compose = allDivs.find(d => d.innerText && d.innerText.includes('Compose'));
    if (compose) {
      compose.click();
      return true;
    }
    return false;
  });

  console.log('Compose button found & clicked via evaluate:', clicked);
  await new Promise(r => setTimeout(r, 3000));

  const dialogFound = await gmailPage.evaluate(() => {
    const toInput = document.querySelector('input[role="combobox"][aria-label*="To"], input[peoplekit-id], textarea[name="to"]');
    return !!toInput;
  });

  console.log('Is Compose Dialog visible with To input:', dialogFound);
  await browser.disconnect();
})().catch(console.error);
