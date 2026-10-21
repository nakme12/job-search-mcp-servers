const puppeteer = require('puppeteer-core');

async function checkPenthara() {
  const browser = await puppeteer.connect({
    browserURL: 'http://localhost:9222',
    defaultViewport: null
  });

  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('zohorecruit.com'));
  if (!page) {
    console.log('Penthara page not found');
    process.exit(1);
  }

  console.log('Clicking "I\'m interested" button on Penthara Zoho Recruit...');
  const clicked = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button, a')).find(b => (b.innerText || '').toLowerCase().includes('interested'));
    if (btn) {
      btn.click();
      return btn.innerText;
    }
    return 'not found';
  });

  console.log('Clicked:', clicked);
  await new Promise(r => setTimeout(r, 4000));
  console.log('Current URL:', page.url());

  const inputs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input, select, textarea')).map(i => ({
      id: i.id,
      name: i.name,
      type: i.type,
      label: i.closest('div, td, tr')?.innerText?.split('\n')?.[0]
    }));
  });

  console.log('Penthara Form Inputs:\n', JSON.stringify(inputs, null, 2));
  process.exit(0);
}

checkPenthara().catch(err => {
  console.error(err);
  process.exit(1);
});
