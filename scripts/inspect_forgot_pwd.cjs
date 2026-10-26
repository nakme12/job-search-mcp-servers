const puppeteer = require('puppeteer-core');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  let browser;
  try {
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    let page = pages.find(p => p.url().includes('career.infosys.com') || p.url().includes('infosysapps.com'));
    if (!page) {
      console.log('No page');
      return;
    }
    await page.bringToFront();

    console.log('Navigating to forgot-password...');
    await page.goto('https://career.infosys.com/forgot-password', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(4000);

    console.log('Forgot Password Landed URL:', page.url());
    console.log('Title:', await page.title());

    const fields = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input')).map(i => ({
        type: i.type,
        placeholder: i.placeholder,
        name: i.name,
        id: i.id
      }));

      const btns = Array.from(document.querySelectorAll('button, a, input[type="submit"]')).map(b => ({
        text: (b.innerText || b.value || '').trim().replace(/\n+/g, ' ')
      })).filter(x => x.text.length > 2);

      const snippet = document.body.innerText.substring(0, 500).replace(/\n+/g, ' ');

      return { inputs, btns, snippet };
    });

    console.log('=== FORGOT PASSWORD STATE ===');
    console.log(JSON.stringify(fields, null, 2));

    browser.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    if (browser) browser.disconnect();
  }
})();
