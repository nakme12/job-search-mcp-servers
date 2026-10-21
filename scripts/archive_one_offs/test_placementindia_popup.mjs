import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('placementindia.com'));
  if (!page) {
    console.log('No placementindia tab found');
    await browser.disconnect();
    return;
  }

  console.log('Interacting with popup on PlacementIndia...');
  const result = await page.evaluate(async () => {
    const input = document.querySelector('#user_name');
    if (input) {
      input.value = 'pratikpatidar7990@gmail.com';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    const btn = document.querySelector('#step1 button[type="submit"]');
    if (btn) {
      btn.click();
    }
  });

  await new Promise(r => setTimeout(r, 4000));

  const afterState = await page.evaluate(() => {
    const popup = document.querySelector('.popup_box');
    return {
      text: popup ? popup.innerText : 'None',
      display: popup ? window.getComputedStyle(popup).display : 'none'
    };
  });

  console.log('State after entering email:', afterState);
  await browser.disconnect();
})();
