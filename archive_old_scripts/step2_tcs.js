import puppeteer from 'puppeteer-core';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('tata-consultancy-services-4478511534')) || pages[0];

  try {
    console.log('Active page URL:', page.url());

    // Click Next button on page 1/4
    const clickedNext1 = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const nextBtn = btns.find(b => (b.innerText || '').trim().toLowerCase() === 'next');
      if (nextBtn) {
        nextBtn.click();
        return true;
      }
      return false;
    });

    console.log('Clicked Next 1:', clickedNext1);
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: 'screenshots/2026-10-13/tcs_step2.png' });

    // Step 2 inspection (likely Resume upload or review)
    const step2Info = await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h3, h4, [class*="header"]')).map(h => h.innerText);
      const inputs = Array.from(document.querySelectorAll('input, select, textarea')).map(i => ({
        type: i.type,
        name: i.name,
        id: i.id,
        value: i.value,
        ariaLabel: i.getAttribute('aria-label')
      }));
      return { headings, inputs };
    });
    console.log('Step 2 Info:', JSON.stringify(step2Info, null, 2));

  } catch (err) {
    console.error('Error on step 2:', err.message);
  }
})();
