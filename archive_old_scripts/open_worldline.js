import puppeteer from 'puppeteer-core';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  try {
    const worldlineAts = 'https://jobs.worldline.com/job/Application-Engineer-ReactJS-Frontend/304985-en_US?src=LinkedIn';
    console.log('Navigating to Worldline official careers portal:', worldlineAts);
    await page.goto(worldlineAts, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));

    console.log('Page title:', await page.title());
    await page.screenshot({ path: 'screenshots/2026-10-13/worldline_direct_portal.png' });

    // Look for apply button on Worldline portal
    const applyInfo = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('a, button, input[type="button"]'));
      const app = btns.find(b => (b.innerText || b.value || '').trim().toLowerCase().includes('apply now') || (b.innerText || '').trim().toLowerCase() === 'apply');
      return app ? { text: app.innerText || app.value, href: app.href || null } : null;
    });

    console.log('Worldline portal apply info:', applyInfo);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await page.close();
  }
})();
