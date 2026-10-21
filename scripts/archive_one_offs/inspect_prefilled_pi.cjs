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
    const vals = await p.evaluate(() => {
      const getVal = sel => {
        const el = document.querySelector(sel);
        return el ? (el.value || el.innerText) : null;
      };
      return {
        userFullName: getVal('input[name="userFullName"]'),
        userEmail: getVal('input[name="userEmail"]'),
        userMobileNo: getVal('input[name="userMobileNo"]'),
        city: getVal('input[name="city"]'),
        gender: getVal('select[name="gender"]'),
        exp: getVal('select[name="total_work_exp_year"]'),
        qual: getVal('select[name="qualification"]')
      };
    });
    console.log('Pre-filled values in popup:', JSON.stringify(vals, null, 2));
  } finally {
    await p.close();
    await browser.disconnect();
  }
})();
