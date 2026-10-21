const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('affirm'));
  if (!page) {
    console.log('Affirm tab not found');
    browser.disconnect();
    return;
  }

  // React-select helper: types query, waits for popup option, clicks Enter
  async function fillReactSelect(selector, textToType) {
    try {
      const el = await page.$(selector);
      if (el) {
        await el.click();
        await page.waitForTimeout(300);
        await el.type(textToType, { delay: 80 });
        await page.waitForTimeout(800);
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(200);
        await page.keyboard.press('Enter');
        console.log(`React-select filled: ${selector} -> ${textToType}`);
      }
    } catch (e) {
      console.log(`Error in React-select ${selector}:`, e.message);
    }
  }

  console.log('Filling Comboboxes on Affirm...');
  await fillReactSelect('#country', 'India');
  await fillReactSelect('#school--0', 'Barkatullah');
  await fillReactSelect('#degree--0', 'Bachelor');
  await fillReactSelect('#discipline--0', 'Computer Science');
  await fillReactSelect('#start-month--0', 'August');
  await fillReactSelect('#end-month--0', 'June');

  // Fill Year numbers
  const sYear = await page.$('#start-year--0');
  if (sYear) await sYear.type('2020', { delay: 60 });

  const eYear = await page.$('#end-year--0');
  if (eYear) await eYear.type('2024', { delay: 60 });

  // Custom Comboboxes
  await fillReactSelect('#question_32942348003', 'Yes'); // Sponsorship now
  await fillReactSelect('#question_32942349003', 'Yes'); // Sponsorship future
  await fillReactSelect('#question_32942350003', 'Not Applicable'); // Province/State
  await fillReactSelect('#question_32942351003', 'LinkedIn'); // Learn about Affirm
  await fillReactSelect('#question_32942356003', 'No'); // Previously employed

  console.log('Combobox fill cycle completed.');
  browser.disconnect();
})();
