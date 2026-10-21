const puppeteer = require('puppeteer-core');

async function triggerFormSubmit() {
  const browser = await puppeteer.connect({
    browserURL: 'http://localhost:9222',
    defaultViewport: null
  });

  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('headoutcareers'));
  if (!page) {
    console.log('Headout page not found');
    process.exit(1);
  }

  console.log('Calling form.requestSubmit() via Puppeteer...');
  const res = await page.evaluate(() => {
    const submitBtn = document.querySelector('button[type="submit"]');
    if (!submitBtn) return 'no submit button';
    const form = submitBtn.closest('form');
    if (form) {
      form.requestSubmit(submitBtn);
      return 'form.requestSubmit executed';
    }
    return 'no form found';
  });

  console.log('Result:', res);
  console.log('Waiting 8 seconds for server response...');
  await new Promise(r => setTimeout(r, 8000));

  const url = page.url();
  console.log('Current URL:', url);
  const text = await page.evaluate(() => document.body.innerText.slice(0, 400));
  console.log('Body snippet:\n', text);

  if (text.includes('Thank') || text.includes('successfully') || text.includes('received') || url.includes('confirmation')) {
    const ssPath = 'C:/mcp/job-search-mcp-engine/screenshots/2026-10-14/headout_fe_postsubmit.png';
    await page.screenshot({ path: ssPath, fullPage: true });
    console.log('Saved Headout post-submit confirmation screenshot:', ssPath);
    await page.close();
    console.log('Closed Headout tab under Rule 57');
  }

  process.exit(0);
}

triggerFormSubmit().catch(err => {
  console.error(err);
  process.exit(1);
});
