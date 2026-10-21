const puppeteer = require('puppeteer-core');

async function checkOptions() {
  const browser = await puppeteer.connect({
    browserURL: 'http://localhost:9222',
    defaultViewport: null
  });

  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('headoutcareers'));
  if (!page) {
    console.log('page not found');
    process.exit(1);
  }

  // Let's find all controls
  const controls = await page.$$('.field div[class*="control"]');
  console.log('Total control elements found:', controls.length);

  for (let i = 0; i < controls.length; i++) {
    const label = await page.evaluate(el => {
      const p = el.closest('.field') || el.parentElement;
      return p ? p.innerText.split('\n')[0] : 'no label';
    }, controls[i]);

    console.log(`\nDropdown #${i}: "${label}"`);
    await controls[i].click();
    await new Promise(r => setTimeout(r, 600));

    const options = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('[class*="option"], div[role="option"]'));
      return els.map(e => e.innerText.trim()).filter(Boolean);
    });

    console.log(`Available options (${options.length}):`, options.slice(0, 10));

    // Click the first valid option or click again to close
    if (options.length > 0) {
      await page.evaluate(() => {
        const first = document.querySelector('[class*="option"], div[role="option"]');
        if (first) first.click();
      });
      await new Promise(r => setTimeout(r, 400));
    }
  }

  process.exit(0);
}

checkOptions().catch(err => {
  console.error(err);
  process.exit(1);
});
