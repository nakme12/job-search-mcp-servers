import puppeteer from 'puppeteer-core';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('Tata+Consultancy+Services') || p.url().includes('4478511534'));

  if (!page) {
    console.log('Page not found');
    return;
  }

  await page.bringToFront();

  // Fill questions accurately based on Pratik's profile:
  // CSS: 2
  // JavaScript: 2
  // Total IT Experience: 2
  // Notice period: 0 (or 15, immediate joiner = 0)
  const filled = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input[type="text"], input:not([type])'));
    
    inputs.forEach(inp => {
      const parentText = (inp.closest('.jobs-easy-apply-form-section__grouping, div')?.innerText || '').toLowerCase();
      const aria = (inp.getAttribute('aria-label') || '').toLowerCase();
      const combined = parentText + ' ' + aria;

      let val = '';
      if (combined.includes('cascading style sheets') || combined.includes('css')) val = '2';
      else if (combined.includes('javascript')) val = '2';
      else if (combined.includes('total it experience') || combined.includes('total experience')) val = '2';
      else if (combined.includes('notice period') || combined.includes('days of notice')) val = '0';

      if (val) {
        inp.value = val;
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        inp.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    return true;
  });

  console.log('Filled questionnaire inputs:', filled);
  await new Promise(r => setTimeout(r, 1500));

  await page.screenshot({ path: 'screenshots/2026-10-13/tcs_questions_filled.png' });
  console.log('Screenshot saved: screenshots/2026-10-13/tcs_questions_filled.png');

  // Click Review button
  const reviewClicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const rev = btns.find(b => (b.innerText || '').trim().toLowerCase() === 'review');
    if (rev) {
      rev.click();
      return true;
    }
    return false;
  });

  console.log('Review clicked:', reviewClicked);
  await new Promise(r => setTimeout(r, 2000));

  await page.screenshot({ path: 'screenshots/2026-10-13/tcs_pre_submit_review.png' });
  console.log('Pre-submit review screenshot saved: screenshots/2026-10-13/tcs_pre_submit_review.png');
})();
