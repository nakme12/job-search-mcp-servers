const puppeteer = require('puppeteer-core');

(async () => {
  let browser;
  try {
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const page = await browser.newPage();
    
    const landUrl = 'https://www.adzuna.in/land/ad/5925663944?aztt=eyJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3OTI0MTQxNjMsImV4cCI6MTc5MzAxODk2MywiY2kiOiJOblNVZ3J2TDhSR1RhTDRvYU56ekhBIiwidHMiOiJkZTIiLCJ0dCI6ImFwaSJ9.OrXWo3bGMf_8CsriTattx1Pp_mra4dp22nJ28kauMk4&from_adp=1&v=F97D682B7CF4C92D94E1671457669FB7AA8B1C1F&se=';

    console.log('Opening landUrl...');
    await page.goto(landUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));

    console.log('Current final page URL:', page.url());
    console.log('Current final page Title:', await page.title());

    await page.close();
  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    if (browser) await browser.disconnect();
    process.exit(0);
  }
})();
