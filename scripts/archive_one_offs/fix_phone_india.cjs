const puppeteer = require('puppeteer-core');

async function fixCountryToIndia() {
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

  console.log('Fixing phone country code strictly to India (+91)...');

  // Focus country select inside phone-input__country
  const input = await page.$('.phone-input__country input[id="country"]');
  if (input) {
    await input.focus();
    // Clear out current value by selecting all and typing India
    await page.keyboard.down('Control');
    await page.keyboard.press('A');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');

    await page.keyboard.type('India', { delay: 100 });
    await new Promise(r => setTimeout(r, 600));

    // Inspect options to ensure we click India (+91)
    await page.evaluate(() => {
      const options = Array.from(document.querySelectorAll('[class*="option"], div[role="option"]'));
      const indiaOpt = options.find(o => o.innerText.includes('India') && o.innerText.includes('+91'));
      if (indiaOpt) {
        indiaOpt.click();
      } else if (options[0]) {
        options[0].click();
      }
    });

    await new Promise(r => setTimeout(r, 500));
  }

  const result = await page.evaluate(() => {
    return document.querySelector('.phone-input__country .select__single-value')?.innerText;
  });

  console.log('Updated Phone Country:', result);
  process.exit(0);
}

fixCountryToIndia().catch(err => {
  console.error(err);
  process.exit(1);
});
