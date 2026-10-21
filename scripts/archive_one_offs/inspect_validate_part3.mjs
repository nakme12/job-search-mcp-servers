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
      return validateSeekerRegistration.toString().slice(2500, 4500);
    }
    return 'not found';
  });

  console.log('validateSeekerRegistration part 3:', funcStr);
  await browser.disconnect();
})();
