const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const p = await browser.newPage();
  try {
    await p.goto('https://www.placementindia.com/job-detail/full-stack-developer-in-impact-hr-km-solutions-at-nashik-1467115.htm', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));
    await p.evaluate(() => {
      const btn = document.querySelector('a.btn-dark#applyJob');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 2000));
    const hiddenCity = await p.evaluate(() => {
      const h = document.querySelector('#search_city_hidden') || document.querySelector('input[name="current_location"]');
      const cc = document.querySelector('#country_code');
      return {
        hiddenCityVal: h ? h.value : null,
        hiddenCityName: h ? h.name : null,
        countryCodeVal: cc ? cc.value : null
      };
    });
    console.log('City hidden & country_code info:', hiddenCity);
  } finally {
    await p.close();
    await browser.disconnect();
  }
})();
