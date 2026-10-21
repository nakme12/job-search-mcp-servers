import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const liPage = pages.find(p => p.url().includes('linkedin.com'));
  if (!liPage) {
    console.log('No LinkedIn tab found');
    await browser.disconnect();
    return;
  }

  const btnDetails = await liPage.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => (b.innerText || '').toLowerCase().includes('apply'));
    return {
      text: btn ? btn.innerText : null,
      outerHTML: btn ? btn.outerHTML : null,
      parentHTML: btn ? btn.parentElement.outerHTML : null
    };
  });

  console.log('LinkedIn Apply button details:', btnDetails);
  await browser.disconnect();
})();
