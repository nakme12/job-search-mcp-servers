const puppeteer = require('puppeteer-core');

async function selectAccount() {
  const browser = await puppeteer.connect({
    browserURL: 'http://localhost:9222',
    defaultViewport: null
  });

  const pages = await browser.pages();
  const googlePage = pages.find(p => p.url().includes('accounts.google.com/v3/signin'));
  if (!googlePage) {
    console.log('google sign-in page not found');
    process.exit(1);
  }

  console.log('Selecting pratikpatidar7990@gmail.com on Google OAuth...');
  const res = await googlePage.evaluate(() => {
    const el = Array.from(document.querySelectorAll('div, li')).find(e => (e.innerText || '').includes('pratikpatidar7990@gmail.com'));
    if (el) {
      el.click();
      return 'clicked account';
    }
    return 'account text not found';
  });

  console.log('Result:', res);
  await new Promise(r => setTimeout(r, 6000));
  process.exit(0);
}

selectAccount().catch(err => {
  console.error(err);
  process.exit(1);
});
