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

  console.log('Opening Redsag on logged-in LinkedIn tab...');
  await liPage.goto('https://www.linkedin.com/jobs/view/4477269828/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await new Promise(r => setTimeout(r, 4000));

  const state = await liPage.evaluate(() => {
    const applyBtn = Array.from(document.querySelectorAll('button')).find(b => (b.innerText || '').toLowerCase().includes('easy apply') || (b.innerText || '').toLowerCase().includes('apply'));
    return {
      title: document.title,
      url: window.location.href,
      hasApplyBtn: !!applyBtn,
      btnText: applyBtn ? applyBtn.innerText.trim() : null
    };
  });

  console.log('Redsag state in logged-in LinkedIn:', state);
  await browser.disconnect();
})();
