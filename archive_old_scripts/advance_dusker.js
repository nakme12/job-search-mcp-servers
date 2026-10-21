import puppeteer from 'puppeteer-core';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('dusker-ai-4475661338'));

  if (!page) {
    console.log('Dusker page not found');
    return;
  }

  await page.bringToFront();

  // Click Next on page 1/4
  await page.click('footer button.artdeco-button--primary');
  await new Promise(r => setTimeout(r, 2000));

  await page.screenshot({ path: 'screenshots/2026-10-13/dusker_ai_step2.png' });
  console.log('Step 2 reached.');

  // Click Next on page 2 (Resume selection)
  await page.click('footer button.artdeco-button--primary');
  await new Promise(r => setTimeout(r, 2000));

  await page.screenshot({ path: 'screenshots/2026-10-13/dusker_ai_step3.png' });
  console.log('Step 3 reached.');

  // Check if Review button is visible
  const isReviewOrSubmit = await page.evaluate(() => {
    const btn = document.querySelector('footer button.artdeco-button--primary');
    return btn ? btn.innerText.trim() : 'none';
  });

  console.log('Primary button text at current step:', isReviewOrSubmit);

  if (isReviewOrSubmit.toLowerCase() === 'review') {
    await page.click('footer button.artdeco-button--primary');
    await new Promise(r => setTimeout(r, 2000));
    console.log('Advanced to final review screen!');
  }

  // Pre-submit screenshot (Final review screen ready for user to click submit)
  await page.screenshot({ path: 'screenshots/2026-10-13/dusker_ai_final_review_screen.png' });
  console.log('Saved final review screenshot: screenshots/2026-10-13/dusker_ai_final_review_screen.png');

})();
