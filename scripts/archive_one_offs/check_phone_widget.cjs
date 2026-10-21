const puppeteer = require('puppeteer-core');

async function checkPhone() {
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

  const res = await page.evaluate(() => {
    const flag = document.querySelector('.iti__selected-flag');
    const title = flag ? flag.getAttribute('title') : 'none';
    const code = document.querySelector('.iti__selected-dial-code')?.innerText;
    const val = document.querySelector('#phone')?.value;
    const countryField = document.querySelector('#country')?.value;
    return { flagTitle: title, dialCode: code, phoneValue: val, countryField };
  });

  console.log('Live Phone & Country Info:', res);
  process.exit(0);
}

checkPhone().catch(err => {
  console.error(err);
  process.exit(1);
});
