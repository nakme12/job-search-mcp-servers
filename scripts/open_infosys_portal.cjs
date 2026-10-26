const puppeteer = require('puppeteer-core');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  let browser;
  try {
    console.log('[Infosys Portal] Connecting to browser...');
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    let page = pages.find(p => p.url().includes('career.infosys.com') || p.url().includes('infosysapps.com'));
    if (!page) {
      console.log('Opening new tab for Infosys Careers...');
      page = await browser.newPage();
    }
    await page.bringToFront();

    console.log('Navigating to https://career.infosys.com...');
    await page.goto('https://career.infosys.com', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await sleep(4000);

    const title = await page.title();
    const url = page.url();
    console.log(`Landed on: ${title} (${url})`);

    // Extract navigation options, login buttons, text
    const pageData = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, a, input[type="submit"]')).map(el => ({
        tag: el.tagName,
        text: (el.innerText || el.value || '').trim().replace(/\n+/g, ' '),
        href: el.href || null
      })).filter(b => b.text.length > 2 && b.text.length < 50);

      const forms = Array.from(document.querySelectorAll('form, input')).map(el => ({
        tag: el.tagName,
        type: el.type,
        placeholder: el.placeholder,
        name: el.name,
        id: el.id
      })).filter(f => f.type || f.placeholder || f.name);

      const snippet = document.body.innerText.substring(0, 500).replace(/\n+/g, ' ');

      return { btns: btns.slice(0, 15), forms: forms.slice(0, 10), snippet };
    });

    console.log('=== INFOSYS PORTAL STATE ===');
    console.log(JSON.stringify(pageData, null, 2));

    browser.disconnect();
  } catch (err) {
    console.error('Error opening Infosys portal:', err.message);
    if (browser) browser.disconnect();
  }
})();
