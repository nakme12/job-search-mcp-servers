const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const tgPage = pages.find(p => p.url().includes('web.telegram.org/a'));

  if (!tgPage) { console.log('No TG tab'); process.exit(1); }

  console.log('Inspecting active modal dialogs in Telegram...');
  const modalInfo = await tgPage.evaluate(() => {
    const modals = Array.from(document.querySelectorAll('.modal-dialog, .modal-content, .popup, [role="dialog"]'));
    return modals.map(m => ({
      text: m.innerText ? m.innerText.substring(0, 150).replace(/\n/g, ' ') : '',
      buttons: Array.from(m.querySelectorAll('button')).map(b => b.innerText ? b.innerText.trim() : '')
    }));
  });

  console.log('Modals found:', modalInfo);

  // Press Escape to dismiss backdrop
  console.log('Pressing Escape to dismiss modal...');
  await tgPage.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 1000));
  await tgPage.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 1000));

  // If modal-backdrop still present, remove it via DOM
  await tgPage.evaluate(() => {
    const b = document.querySelectorAll('.modal-backdrop, .modal, .popup');
    b.forEach(el => el.remove());
  });

  // Check if backdrop is gone
  const backdrop = await tgPage.evaluate(() => !!document.querySelector('.modal-backdrop'));
  console.log('Is modal-backdrop still present?:', backdrop);

  await browser.disconnect();
})().catch(e => console.error(e.message));
