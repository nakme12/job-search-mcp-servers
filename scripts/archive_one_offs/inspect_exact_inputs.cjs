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
      const g = document.querySelector('select[name="gender"]');
      const e = document.querySelector('select[name="total_work_exp_year"]');
      const q = document.querySelector('select[name="qualification"]');
      const name = document.querySelector('input[name="userFullName"]');
      const email = document.querySelector('input[name="userEmail"]');
      const mobile = document.querySelector('input[name="userMobileNo"]');
      const city = document.querySelector('input[name="city"]');
      return {
        genderVal: g ? g.value : null,
        expVal: e ? e.value : null,
        qualVal: q ? q.value : null,
        nameVal: name ? name.value : null,
        emailVal: email ? email.value : null,
        mobileVal: mobile ? mobile.value : null,
        cityVal: city ? city.value : null
      };
    });
    console.log('Input values:', JSON.stringify(vals, null, 2));
  } finally {
    await p.close();
    await browser.disconnect();
  }
})();
