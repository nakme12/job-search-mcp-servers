const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const deltekPage = pages.find(p => p.url().includes('brassring.com'));
  if (!deltekPage) return;

  const sourceOptions = await deltekPage.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select'));
    const sourceSelect = selects.find(s => {
      const parent = (s.closest('div') ? s.closest('div').innerText : '');
      return parent.includes('How did you hear');
    });
    return sourceSelect ? Array.from(sourceSelect.options).map(o => ({ text: o.text.trim(), val: o.value })) : [];
  });

  console.log('Source Options:', sourceOptions);
})();
