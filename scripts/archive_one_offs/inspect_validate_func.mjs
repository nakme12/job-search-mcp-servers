import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('placementindia.com'));
  if (!page) {
    console.log('No placementindia tab found');
    await browser.disconnect();
    return;
  }

  const funcStr = await page.evaluate(() => {
    if (typeof validateSeekerRegistration === 'function') {
      return validateSeekerRegistration.toString();
    }
    return 'not found';
  });

  console.log('validateSeekerRegistration code:', funcStr.slice(0, 1500));
  await browser.disconnect();
})();
