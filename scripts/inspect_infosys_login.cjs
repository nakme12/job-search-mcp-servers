const puppeteer = require('puppeteer-core');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  let browser;
  try {
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    let page = pages.find(p => p.url().includes('career.infosys.com'));
    if (!page) {
      console.log('No page');
      return;
    }
    await page.bringToFront();

    console.log('Navigating to https://career.infosys.com/login...');
    await page.goto('https://career.infosys.com/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(4000);

    console.log('Title:', await page.title());
    console.log('URL:', page.url());

    const loginDetails = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input')).map(i => ({
        type: i.type,
        placeholder: i.placeholder,
        name: i.name,
        id: i.id,
        ariaLabel: i.getAttribute('aria-label')
      }));

      const links = Array.from(document.querySelectorAll('a, button')).map(b => ({
        text: (b.innerText || b.value || '').trim().replace(/\n+/g, ' '),
        href: b.href || null
      })).filter(x => x.text.length > 2 && x.text.length < 50);

      const snippet = document.body.innerText.substring(0, 600).replace(/\n+/g, ' ');

      return { inputs, links, snippet };
    });

    console.log('=== INFOSYS LOGIN PAGE STATE ===');
    console.log(JSON.stringify(loginDetails, null, 2));

    browser.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    if (browser) browser.disconnect();
  }
})();
