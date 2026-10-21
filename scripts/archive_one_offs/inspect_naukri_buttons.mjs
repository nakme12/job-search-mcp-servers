import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const n = pages.find(p => p.url().includes('naukri.com'));
  if (!n) {
    console.log('No Naukri tab found');
    await browser.disconnect();
    return;
  }

  console.log('Current URL in tab:', n.url());
  const btns = await n.evaluate(() => {
    return Array.from(document.querySelectorAll('button, a, div[role="button"]'))
      .filter(b => (b.innerText || '').toLowerCase().includes('apply'))
      .map(b => ({ tag: b.tagName, text: b.innerText.trim(), class: b.className, id: b.id }));
  });

  console.log('Apply buttons on Naukri JD:', btns);
  await browser.disconnect();
})();
