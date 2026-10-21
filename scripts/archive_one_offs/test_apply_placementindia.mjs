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

  console.log('Testing Apply button on:', page.url());
  const clicked = await page.evaluate(() => {
    const btn = document.querySelector('a#applyJob, a.btn-dark');
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });

  console.log('Clicked Apply button:', clicked);
  await new Promise(r => setTimeout(r, 4000));

  const state = await page.evaluate(() => {
    const pop = document.querySelector('.modal, .popup, .sweet-alert, div[class*="popup"], div[class*="modal"]');
    return {
      currentUrl: window.location.href,
      modalText: pop ? pop.innerText.slice(0, 300) : 'None',
      bodySnippet: document.body.innerText.slice(0, 300)
    };
  });

  console.log('Post Click State:', state);
  await browser.disconnect();
})();
