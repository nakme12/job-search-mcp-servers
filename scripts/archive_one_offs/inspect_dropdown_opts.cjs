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
    const opts = await p.evaluate(() => {
      const getOpts = sel => {
        const el = document.querySelector(sel);
        return el ? Array.from(el.options).map(o => ({ value: o.value, text: o.text.trim() })) : [];
      };
      return {
        gender: getOpts('select[name="gender"]'),
        exp: getOpts('select[name="total_work_exp_year"]'),
        qual: getOpts('select[name="qualification"]')
      };
    });
    console.log('Options for gender:', opts.gender);
    console.log('Options for exp (first 10):', opts.exp.slice(0, 10));
    console.log('Options for qual (matching graduate/b.e/b.tech):', opts.qual.filter(q => /grad|b\.e|b\.tech|b\.sc|b\.c\.a/i.test(q.text)));
  } finally {
    await p.close();
    await browser.disconnect();
  }
})();
