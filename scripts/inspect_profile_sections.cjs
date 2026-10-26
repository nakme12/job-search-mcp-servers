const puppeteer = require('puppeteer-core');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  let browser;
  try {
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
    const pages = await browser.pages();
    let page = pages.find(p => p.url().includes('career.infosys.com'));
    if (!page) {
      b.disconnect();
      return;
    }
    await page.bringToFront();

    console.log('Clicking "Review and Save Profile"...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button, a')).find(b => b.innerText.includes('Review and Save Profile'));
      if (btn) btn.click();
    });
    await sleep(4000);

    console.log('Landed Profile URL:', page.url());
    console.log('Title:', await page.title());

    const profileState = await page.evaluate(() => {
      const sections = Array.from(document.querySelectorAll('mat-expansion-panel, .section, .card, form, mat-step, .mat-horizontal-stepper-header-container, mat-step-header')).map(s => s.innerText.replace(/\n+/g, ' | '));
      const inputs = Array.from(document.querySelectorAll('input, select, textarea')).map(i => ({
        name: i.name,
        type: i.type,
        placeholder: i.placeholder,
        value: (i.type === 'password' ? '***' : i.value)
      })).filter(x => x.name || x.placeholder || x.value);

      return {
        url: window.location.href,
        sections: sections.slice(0, 10),
        inputs: inputs.slice(0, 15)
      };
    });

    console.log('=== PROFILE PAGE DETAILS ===');
    console.log(JSON.stringify(profileState, null, 2));

    browser.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    if (browser) browser.disconnect();
  }
})();
