import puppeteer from 'puppeteer-core';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages[1]; // Page 1 is Dusker AI

  console.log('Focusing Dusker AI page:', page.url());
  await page.bringToFront();

  // Step 1 -> Next
  console.log('Clicking Next on step 1...');
  await page.click('footer button.artdeco-button--primary');
  await new Promise(r => setTimeout(r, 2000));

  // Step 2 (Resume selection) -> Next
  console.log('Clicking Next on step 2...');
  await page.click('footer button.artdeco-button--primary');
  await new Promise(r => setTimeout(r, 2000));

  // Check if Review button or inputs
  const btnText = await page.evaluate(() => {
    const btn = document.querySelector('footer button.artdeco-button--primary');
    return btn ? btn.innerText.trim() : 'none';
  });
  console.log('Button text at step 3:', btnText);

  if (btnText.toLowerCase() === 'review') {
    await page.click('footer button.artdeco-button--primary');
    await new Promise(r => setTimeout(r, 2000));
  }

  // Pre-submit screenshot
  await page.screenshot({ path: 'screenshots/2026-10-13/dusker_ai_final_review_ready.png' });
  console.log('Dusker AI reached final review screen! Screenshot saved.');
})();
