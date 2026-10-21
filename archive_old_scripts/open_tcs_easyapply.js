import puppeteer from 'puppeteer-core';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  try {
    console.log('Navigating to TCS Easy Apply...');
    await page.goto('https://in.linkedin.com/jobs/view/reactjs-developer-at-tata-consultancy-services-4478511534', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // Click Easy Apply
    const clicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const ea = btns.find(b => (b.innerText || '').toLowerCase().includes('easy apply'));
      if (ea) {
        ea.click();
        return true;
      }
      return false;
    });

    console.log('Clicked Easy Apply:', clicked);
    await new Promise(r => setTimeout(r, 2500));

    await page.screenshot({ path: 'screenshots/2026-10-13/tcs_easy_apply_modal.png' });
    console.log('Saved screenshot of modal.');

    // Check modal steps
    const modalInfo = await page.evaluate(() => {
      const modal = document.querySelector('.jobs-easy-apply-modal, [role="dialog"]');
      if (!modal) return 'No modal found';
      return {
        header: modal.querySelector('h3, h2, h1')?.innerText,
        text: modal.innerText.slice(0, 500)
      };
    });

    console.log('Modal info:', modalInfo);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    // Keep page open in Brave so user sees it live!
  }
})();
