const puppeteer = require('puppeteer-core');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const p = (await b.pages()).find(x => x.url().includes('mail.google.com'));
  if (p) {
    await p.waitForSelector('input[name="subjectbox"], input[aria-label="To recipients"], div[aria-label="Message Body"]', { timeout: 15000 });
    const info = await p.evaluate(() => {
      const to = document.querySelector('input[aria-label="To recipients"], input[name="to"]');
      const chip = document.querySelector('span[email], div[data-hovercard-id]');
      const subj = document.querySelector('input[name="subjectbox"]');
      const body = document.querySelector('div[aria-label="Message Body"]');
      return {
        toVal: to ? to.value : null,
        chip: chip ? chip.innerText : null,
        subj: subj ? subj.value : null,
        hasBody: !!body
      };
    });
    console.log('Fields loaded:', JSON.stringify(info, null, 2));
  }
  b.disconnect();
})();
