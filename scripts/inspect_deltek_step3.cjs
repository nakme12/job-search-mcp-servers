const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const deltek = (await browser.pages()).find(p => p.url().includes('sjobs.brassring.com'));
  if (!deltek) {
    console.log('Deltek tab not found');
    process.exit(0);
  }
  const vals = await deltek.evaluate(() => {
    return Array.from(document.querySelectorAll('input:not([type="hidden"]), select, textarea')).map(e => ({
      id: e.id,
      name: e.name,
      val: e.value,
      checked: e.checked
    }));
  });
  console.log(JSON.stringify(vals, null, 2));
  process.exit(0);
})();
