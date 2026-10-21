const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const deltekPage = pages.find(p => p.url().includes('brassring.com'));
  if (!deltekPage) return;

  const fields = await deltekPage.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select')).map(s => ({
      id: s.id,
      name: s.name,
      label: (s.closest('div') ? s.closest('div').innerText.slice(0, 50) : ''),
      options: Array.from(s.options).map(o => ({ text: o.text.trim(), val: o.value }))
    }));

    const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"])')).map(i => ({
      tag: i.tagName,
      type: i.type,
      id: i.id,
      name: i.name,
      label: (i.closest('div') ? i.closest('div').innerText.slice(0, 50) : '')
    }));

    return { selects, inputs };
  });

  console.log('Step 3 Fields:', JSON.stringify(fields, null, 2));
})();
