const puppeteer = require('puppeteer-core');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  let browser;
  try {
    console.log('[RED SAG Portal] Connecting to browser...');
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const p = await browser.newPage();

    console.log('Navigating to https://exams.red-sag.com/...');
    await p.goto('https://exams.red-sag.com/', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await sleep(4000);

    const title = await p.title();
    const url = p.url();
    console.log(`Landed on: ${title} (${url})`);

    const pageState = await p.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, a, input[type="submit"]')).map(el => ({
        tag: el.tagName,
        text: (el.innerText || el.value || '').trim().replace(/\n+/g, ' ')
      })).filter(b => b.text.length > 2);

      const snippet = document.body.innerText.substring(0, 1000).replace(/\n+/g, ' \n ');

      return { title: document.title, url: window.location.href, btns, snippet };
    });

    console.log('=== RED SAG PORTAL STATE ===');
    console.log(JSON.stringify(pageState, null, 2));

    await p.close();
    browser.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    if (browser) browser.disconnect();
  }
})();
