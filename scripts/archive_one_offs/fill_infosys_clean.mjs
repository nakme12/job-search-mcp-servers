import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const p = pages.find(x => x.url().includes('career.infosys.com'));
  if (!p) {
    console.log('No Infosys page found');
    await browser.disconnect();
    return;
  }

  console.log('Filling exact Angular Material inputs on Infosys...');

  async function setAngularInput(selector, text) {
    const el = await p.$(selector);
    if (el) {
      await el.click({ clickCount: 3 });
      await p.keyboard.press('Backspace');
      await p.keyboard.type(text, { delay: 30 });
      await el.evaluate(e => {
        e.dispatchEvent(new Event('input', { bubbles: true }));
        e.dispatchEvent(new Event('change', { bubbles: true }));
        e.dispatchEvent(new Event('blur', { bubbles: true }));
      });
    }
  }

  // 1. First Name
  await setAngularInput('#mat-input-0', 'Pratik');

  // 2. Last Name
  await setAngularInput('#mat-input-2', 'Patidar');

  // 3. Email ID
  await setAngularInput('#mat-input-3', 'pratikpatidar7990@gmail.com');

  // 4. Password
  await setAngularInput('#mat-input-4', 'Mmmmmm@1');

  // 5. Verify Password
  await setAngularInput('#mat-input-5', 'Mmmmmm@1');

  // 6. Checkbox
  await p.evaluate(() => {
    const chk = document.querySelector('input[type="checkbox"]');
    if (chk && !chk.checked) chk.click();
  });

  await new Promise(r => setTimeout(r, 1500));

  const screenshotDir = path.resolve('screenshots/2026-10-13');
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
  await p.screenshot({ path: path.resolve(screenshotDir, 'infosys_form_perfectly_filled.png'), fullPage: true });

  const finalCheck = await p.evaluate(() => {
    return {
      firstName: document.querySelector('#mat-input-0')?.value,
      lastName: document.querySelector('#mat-input-2')?.value,
      email: document.querySelector('#mat-input-3')?.value,
      pwd: document.querySelector('#mat-input-4')?.value ? '********' : 'empty',
      cPwd: document.querySelector('#mat-input-5')?.value ? '********' : 'empty',
      checkbox: document.querySelector('input[type="checkbox"]')?.checked
    };
  });

  console.log('INFOSYS_VERIFIED_DATA:', JSON.stringify(finalCheck, null, 2));
  await browser.disconnect();
})();
