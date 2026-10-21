const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const p = await browser.newPage();
  try {
    await p.goto('https://www.placementindia.com/job-detail/full-stack-developer-in-impact-hr-km-solutions-at-nashik-1467115.htm', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));
    await p.evaluate(() => {
      const all = Array.from(document.querySelectorAll('a, button'));
      const apply = all.find(el => el.innerText && el.innerText.trim() === 'Apply');
      if (apply) apply.click();
    });
    await new Promise(r => setTimeout(r, 2000));

    // Fill qualification B.E
    await p.select('select[name="qualification"]', 'BE^UG');
    await p.evaluate(() => {
      const q = document.querySelector('select[name="qualification"]');
      if (q) q.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await new Promise(r => setTimeout(r, 2000));

    const specOpts = await p.evaluate(() => {
      const s = document.querySelector('select[name="specialization"]');
      return s ? Array.from(s.options).map(o => ({ value: o.value, text: o.text.trim() })) : [];
    });
    console.log('Specialization options count:', specOpts.length);
    console.log('Specialization options (first 10):', specOpts.slice(0, 10));
  } finally {
    await p.close();
    await browser.disconnect();
  }
})();
