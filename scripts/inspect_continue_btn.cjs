const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const deltekPage = pages.find(p => p.url().includes('brassring.com'));
  if (!deltekPage) return;

  const btnInfo = await deltekPage.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, a, input[type="button"]'));
    const contBtn = btns.find(b => (b.innerText||b.value||'').trim().toLowerCase() === 'continue');
    return contBtn ? {
      tag: contBtn.tagName,
      id: contBtn.id,
      className: contBtn.className,
      html: contBtn.outerHTML
    } : 'not found';
  });

  console.log('Continue button info:', btnInfo);
})();
