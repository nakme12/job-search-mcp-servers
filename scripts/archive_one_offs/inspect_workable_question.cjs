const puppeteer = require('puppeteer-core');

async function run() {
  const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: null });
  const page = await browser.newPage();
  try {
    await page.goto('https://apply.workable.com/antarcticaglobal/j/6F6B59A963/apply/', { waitUntil: 'networkidle2', timeout: 20000 });
    const text = await page.evaluate(() => {
      const fieldsets = Array.from(document.querySelectorAll('fieldset, div[role="group"], [data-ui="question"]'));
      if (fieldsets.length > 0) {
        return fieldsets.map(f => f.innerText);
      }
      return [document.body.innerText.slice(document.body.innerText.indexOf('Cover letter'), document.body.innerText.indexOf('Submit application') + 50)];
    });
    console.log('Question context:\n', text);
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await page.close();
    process.exit(0);
  }
}

run();
