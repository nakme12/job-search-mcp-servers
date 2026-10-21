const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const p = await browser.newPage();
  try {
    await p.goto('https://www.red-sag.com/careers/apply/junior-frontend-developer', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));
    const radios = await p.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input[type="radio"]'));
      return inputs.map(r => ({
        id: r.id,
        value: r.value,
        name: r.name,
        checked: r.checked,
        text: r.parentElement ? r.parentElement.innerText.trim() : ''
      }));
    });
    console.log('Radios found:', radios);
  } finally {
    await p.close();
    await browser.disconnect();
  }
})();
