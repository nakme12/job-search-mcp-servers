const puppeteer = require('puppeteer-core');

async function clickSubmit() {
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

  console.log('Submitting Headout application...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => (b.innerText || '').toLowerCase().includes('submit'));
    if (btn) {
      btn.scrollIntoView();
      btn.click();
    }
  });

  console.log('Waiting 8 seconds for response...');
  await new Promise(r => setTimeout(r, 8000));

  const currentUrl = page.url();
  console.log('Current URL:', currentUrl);
  const text = await page.evaluate(() => document.body.innerText.slice(0, 400));
  console.log('Text snippet:', text);

  if (text.includes('Thank') || text.includes('successfully') || text.includes('received') || currentUrl.includes('confirmation')) {
    const ssPath = 'C:/mcp/job-search-mcp-engine/screenshots/2026-10-14/headout_fe_postsubmit.png';
    await page.screenshot({ path: ssPath, fullPage: true });
    console.log('Saved Headout confirmation screenshot:', ssPath);
    await page.close();
    console.log('Closed Headout tab under Rule 57');
  } else {
    console.log('Still on form page. Checking captcha or validation...');
    const errs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.error, .field-error')).map(e => e.innerText);
    });
    console.log('Errors:', errs);
  }

  process.exit(0);
}

clickSubmit().catch(err => {
  console.error(err);
  process.exit(1);
});
