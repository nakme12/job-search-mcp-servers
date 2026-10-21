import puppeteer from 'puppeteer-core';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  try {
    console.log('Navigating to Worldline listing...');
    await page.goto('https://in.linkedin.com/jobs/view/application-engineer-reactjs-frontend-at-worldline-4469882087', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // Find the external link behind Apply
    const destinationUrl = await page.evaluate(() => {
      const applyBtn = Array.from(document.querySelectorAll('a, button')).find(b => (b.innerText || '').trim().toLowerCase().includes('apply'));
      if (applyBtn) {
        if (applyBtn.tagName === 'A' && applyBtn.href) return applyBtn.href;
      }
      return null;
    });

    console.log('Found direct anchor href:', destinationUrl);
    
    // Or click it and listen for popup/navigation
    const newTargetPromise = new Promise(resolve => browser.once('targetcreated', target => resolve(target.page())));
    
    await page.evaluate(() => {
      const applyBtn = Array.from(document.querySelectorAll('a, button')).find(b => (b.innerText || '').trim().toLowerCase().includes('apply'));
      if (applyBtn) applyBtn.click();
    });

    const newPage = await Promise.race([
      newTargetPromise,
      new Promise(r => setTimeout(() => r(null), 6000))
    ]);

    if (newPage) {
      await newPage.bringToFront();
      await new Promise(r => setTimeout(r, 4000));
      console.log('External ATS Page opened:', await newPage.title());
      console.log('External URL:', newPage.url());
      await newPage.screenshot({ path: 'screenshots/2026-10-13/worldline_ats_page.png' });
    } else {
      console.log('Current page URL:', page.url());
      await page.screenshot({ path: 'screenshots/2026-10-13/worldline_after_click.png' });
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    const pages = await browser.pages();
    // close redundant pages, keep browser clean
    for (let p of pages) {
      if (p.url().includes('linkedin.com/jobs/view')) await p.close();
    }
  }
})();
