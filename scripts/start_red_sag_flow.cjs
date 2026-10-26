const puppeteer = require('puppeteer-core');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  let browser;
  try {
    console.log('[RED SAG Start] Connecting to browser...');
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    let p = pages.find(x => x.url().includes('exams.red-sag.com'));
    if (!p) {
      console.log('Opening new tab for RED SAG...');
      p = await browser.newPage();
      await p.goto('https://exams.red-sag.com/', { waitUntil: 'domcontentloaded', timeout: 35000 });
    }
    await p.bringToFront();
    await sleep(2000);

    console.log('Clicking "Start: sign in →"...');
    await p.evaluate(() => {
      const signInBtn = Array.from(document.querySelectorAll('a, button')).find(el => el.innerText.includes('Start: sign in') || el.innerText.trim() === 'Sign in');
      if (signInBtn) signInBtn.click();
    });
    await sleep(3000);

    console.log('Landed URL:', p.url());
    console.log('Title:', await p.title());

    const pageInfo = await p.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, a')).map(b => b.innerText.trim().replace(/\n+/g, ' ')).filter(t => t.length > 2);
      const inputs = Array.from(document.querySelectorAll('input')).map(i => ({ type: i.type, name: i.name, placeholder: i.placeholder }));
      const snippet = document.body.innerText.substring(0, 600).replace(/\n+/g, ' ');
      return { btns, inputs, snippet };
    });

    console.log('=== SIGN IN PAGE STATE ===');
    console.log(JSON.stringify(pageInfo, null, 2));

    browser.disconnect();
  } catch (err) {
    console.error('Error starting RED SAG:', err.message);
    if (browser) browser.disconnect();
  }
})();
