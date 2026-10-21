const puppeteer = require('puppeteer-core');

async function submitNexDuo() {
  const browser = await puppeteer.connect({
    browserURL: 'http://localhost:9222',
    defaultViewport: null
  });

  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('nexduo.in'));
  if (!page) {
    console.log('NexDuo page not found');
    process.exit(1);
  }

  console.log('Clicking Submit application button inside modal...');
  const clicked = await page.evaluate(() => {
    const form = document.querySelector('form');
    if (form) {
      const btn = form.querySelector('button[type="submit"]') || 
                  Array.from(form.querySelectorAll('button')).find(b => b.innerText.includes('Submit'));
      if (btn) {
        btn.click();
        return btn.innerText;
      }
    }
    return 'form submit button not found';
  });

  console.log('Clicked:', clicked);
  console.log('Waiting 6 seconds for response...');
  await new Promise(r => setTimeout(r, 6000));

  const text = await page.evaluate(() => document.body.innerText.slice(0, 600));
  console.log('Post-submit snippet:\n', text);

  if (text.includes('Thank') || text.includes('received') || text.includes('successfully') || text.includes('submitted')) {
    const ssPath = 'C:/mcp/job-search-mcp-engine/screenshots/2026-10-14/nexduo_fe_postsubmit.png';
    await page.screenshot({ path: ssPath, fullPage: true });
    console.log('Saved NexDuo post-submit screenshot:', ssPath);
    await page.close();
    console.log('Closed NexDuo tab under Rule 57');
  }

  process.exit(0);
}

submitNexDuo().catch(err => {
  console.error(err);
  process.exit(1);
});
