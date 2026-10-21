const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const p = await browser.newPage();
  try {
    await p.goto('https://www.zaax.com/submit-resume/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    const options = await p.evaluate(() => {
      const selects = Array.from(document.querySelectorAll('select'));
      return selects.map(s => ({
        id: s.id,
        name: s.name,
        options: Array.from(s.options).map(o => ({ text: o.text.trim(), val: o.value }))
      }));
    });

    console.log(JSON.stringify(options, null, 2));
  } finally {
    await p.close();
  }
})();
