const puppeteer = require('puppeteer-core');

async function checkThreeDropdowns() {
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

  const ids = ['question_8705238006', 'question_8647640006', 'question_8687533006'];

  for (const id of ids) {
    const selector = '[id="' + id + '"]';
    const input = await page.$(selector);
    if (input) {
      await input.focus();
      await page.keyboard.press('ArrowDown');
      await new Promise(r => setTimeout(r, 600));

      const opts = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('[class*="option"], div[role="option"]')).map(e => e.innerText.trim()).filter(Boolean);
      });
      console.log(`\nOptions for ${id}:`, opts);

      // Click the first matching option
      if (opts.length > 0) {
        // Let's choose the best fit
        let chosen = opts[0];
        if (id.includes('8705238006') || id.includes('8647640006')) {
          chosen = opts.find(o => o.includes('1') || o.includes('2') || o.includes('Less than')) || opts[0];
        } else if (id.includes('8687533006')) {
          chosen = opts.find(o => o.includes('LPA') || o.includes('2') || o.includes('3') || o.includes('Below')) || opts[0];
        }

        console.log(`Selecting: "${chosen}"`);
        await page.evaluate((ch) => {
          const els = Array.from(document.querySelectorAll('[class*="option"], div[role="option"]'));
          const target = els.find(e => e.innerText.trim() === ch);
          if (target) target.click();
        }, chosen);

        await new Promise(r => setTimeout(r, 500));
      }
    }
  }

  const remaining = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input.remix-css-1a0ro4n-requiredInput')).filter(i => !i.value).length;
  });

  console.log('\nFinal remaining empty required dropdowns:', remaining);
  process.exit(0);
}

checkThreeDropdowns().catch(err => {
  console.error(err);
  process.exit(1);
});
