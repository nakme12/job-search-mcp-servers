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

  console.log('Clicking Apply button on Redsag LinkedIn job...');
  const targetInfo = await liPage.evaluate(async () => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => (b.innerText || '').toLowerCase().includes('apply'));
    if (!btn) return { clicked: false };
    btn.click();
    await new Promise(r => setTimeout(r, 3000));
    return {
      clicked: true,
      currentUrl: window.location.href,
      modal: document.querySelector('.jobs-easy-apply-modal, .artdeco-modal')?.innerText.slice(0, 300) || 'None'
    };
  });

  console.log('Result after clicking Apply:', targetInfo);
  await browser.disconnect();
})();
