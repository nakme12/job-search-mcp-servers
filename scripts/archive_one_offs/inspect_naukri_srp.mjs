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

  console.log('Navigating to SRP to find fast apply jobs...');
  await n.goto('https://www.naukri.com/react-developer-jobs?experience=1', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await new Promise(r => setTimeout(r, 4000));

  const srpJobs = await n.evaluate(() => {
    const wrappers = Array.from(document.querySelectorAll('.srp-jobtuple-wrapper'));
    return wrappers.map(w => {
      const title = w.querySelector('a.title')?.innerText;
      const comp = w.querySelector('a.comp-name')?.innerText;
      const url = w.querySelector('a.title')?.href;
      const fastApply = !!w.querySelector('.apply-button, .fast-apply, [class*="apply"]');
      const text = w.innerText;
      return { title, comp, url, hasQuickApplyBadge: text.includes('Apply') && !text.includes('company site') };
    });
  });

  console.log('SRP Jobs sample:', srpJobs.slice(0, 8));
  await browser.disconnect();
})();
