const puppeteer = require('puppeteer-core');

(async () => {
  let browser;
  try {
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const page = await browser.newPage();

    // VY Systems on Adzuna land
    const vyLand = 'https://www.adzuna.in/land/ad/5927319637?aztt=eyJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3OTI0MTU3ODQsImV4cCI6MTc5MzAyMDU4NCwiY2kiOiJOblNVZ3J2TDhSR1RhTDRvYU56ekhBIiwidHMiOiJkZTIiLCJ0dCI6ImFwaSJ9.qf6eLw_sZ9nO1s1yJ5E6_821B2J8914v8gG824h18k';
    console.log('[Audit 2] Opening VY Systems Adzuna land link...');
    await page.goto(vyLand, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 4000));

    console.log('Final URL for VY Systems:', page.url());

    const audit2 = await page.evaluate(() => {
      const text = document.body.innerText;
      const postedMatch = text.match(/(?:posted|active|date)[\s:]*([^\n]+)/i)?.[0] || 'Unknown';
      const expMatch = text.match(/(\d+[\s–-]*\d*\s*(?:years?|yrs?|yr))/i)?.[0] || 'Unknown';
      return {
        title: document.title,
        posted: postedMatch,
        exp: expMatch,
        snippet: text.substring(0, 500).replace(/\n+/g, ' ')
      };
    });

    console.log('\n================ VY SYSTEMS AUDIT ================');
    console.log(audit2);

    await page.close();
  } catch (err) {
    console.error('Audit Error:', err.message);
  } finally {
    if (browser) await browser.disconnect();
    process.exit(0);
  }
})();
