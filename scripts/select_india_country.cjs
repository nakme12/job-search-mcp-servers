const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('affirm'));

  await page.mouse.click(105, 290);
  await new Promise(r => setTimeout(r, 200));
  await page.keyboard.type('India', { delay: 60 });
  await new Promise(r => setTimeout(r, 400));

  const result = await page.evaluate(() => {
    const opts = Array.from(document.querySelectorAll('div[role="option"], .select__option'));
    const ind = opts.find(o => o.innerText.trim().startsWith('India') || o.innerText.includes('India (+91)'));
    if (ind) {
      ind.click();
      return ind.innerText;
    }
    return 'Not found. Options present: ' + opts.map(o => o.innerText).join(', ');
  });

  console.log('Result selecting country:', result);
  browser.disconnect();
})();
