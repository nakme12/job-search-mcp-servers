const puppeteer = require('puppeteer-core');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  let browser;
  try {
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
    const pages = await browser.pages();
    let p = pages.find(x => x.url().includes('exams.red-sag.com'));
    if (!p) {
      console.log('No page');
      return;
    }
    await p.bringToFront();

    console.log('Clicking "Continue with Google"...');
    await p.evaluate(() => {
      const googleBtn = Array.from(document.querySelectorAll('button, a')).find(el => el.innerText.includes('Continue with Google'));
      if (googleBtn) googleBtn.click();
    });
    await sleep(4000);

    console.log('URL after clicking Google:', p.url());
    console.log('Title:', await p.title());

    // Check if account chooser appears or if popup opened
    const allPages = await browser.pages();
    console.log('All open pages count:', allPages.length);
    for (let i = 0; i < allPages.length; i++) {
      console.log(`Tab ${i}:`, await allPages[i].title(), allPages[i].url());
    }

    browser.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    if (browser) browser.disconnect();
  }
})();
