const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const dustPage = pages.find(p => p.url().includes('jobs.ashbyhq.com/dust'));
  if (!dustPage) {
    console.log('Dust page not found in open tabs.');
    browser.disconnect();
    return;
  }

  const fields = await dustPage.evaluate(() => {
    const list = [];
    const elements = Array.from(document.querySelectorAll('input, textarea, button, [role="radio"], [role="button"]'));
    elements.forEach(el => {
      const tag = el.tagName;
      const type = el.type || el.getAttribute('role');
      const name = el.name || '';
      const id = el.id || '';
      const text = el.innerText || '';
      const label = el.closest('div')?.innerText?.slice(0, 80) || '';
      list.push({ tag, type, name, id, text: text.trim().slice(0, 30), label: label.trim().slice(0, 50) });
    });
    return list;
  });

  const filtered = fields.filter(f => f.label.includes('Compensation') || f.label.includes('authorization') || f.label.includes('office') || f.label.includes('Why do you want') || f.text.includes('Yes') || f.text.includes('No'));
  console.log('Detected Dust elements:', JSON.stringify(filtered, null, 2));

  browser.disconnect();
})();
