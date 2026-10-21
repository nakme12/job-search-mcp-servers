const puppeteer = require('puppeteer-core');

async function submitPentharaFinal() {
  const browser = await puppeteer.connect({
    browserURL: 'http://localhost:9222',
    defaultViewport: null
  });

  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('zohorecruit.com'));
  if (!page) {
    console.log('page not found');
    process.exit(1);
  }

  console.log('Clicking Submit Application on Penthara Zoho Recruit...');
  const clicked = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button, input, a')).find(b => {
      const t = (b.innerText || b.value || '').toLowerCase();
      return t.includes('submit application') || t === 'submit';
    });
    if (btn) {
      btn.scrollIntoView();
      btn.click();
      return btn.innerText || btn.value;
    }
    return 'submit button not found';
  });

  console.log('Result:', clicked);
  console.log('Waiting 8 seconds for server response...');
  await new Promise(r => setTimeout(r, 8000));

  const text = await page.evaluate(() => document.body.innerText.slice(0, 500));
  const currentUrl = page.url();
  console.log('Current URL:', currentUrl);
  console.log('Text snippet:\n', text);

  if (text.includes('Thank') || text.includes('successfully') || text.includes('received') || currentUrl.includes('thank') || currentUrl.includes('applied') || currentUrl.includes('success')) {
    const ssPath = 'C:/mcp/job-search-mcp-engine/screenshots/2026-10-14/penthara_fe_postsubmit.png';
    await page.screenshot({ path: ssPath, fullPage: true });
    console.log('Saved Penthara post-submit screenshot:', ssPath);
    await page.close();
    console.log('Closed Penthara tab under Rule 57');
  }

  process.exit(0);
}

submitPentharaFinal().catch(err => {
  console.error(err);
  process.exit(1);
});
