const puppeteer = require('puppeteer-core');

async function inspectNetwork() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('jobs.ashbyhq.com/plane')) || pages[0];
  
  page.on('request', req => {
    if (req.method() === 'POST' || req.url().includes('ashby') || req.url().includes('application')) {
      console.log('REQ:', req.method(), req.url());
    }
  });
  page.on('response', async res => {
    if (res.request().method() === 'POST' || res.url().includes('ashby') || res.url().includes('application')) {
      try {
        const txt = await res.text();
        console.log('RES:', res.status(), res.url(), txt.substring(0, 200));
      } catch (e) {}
    }
  });

  console.log('Clicking submit button to watch network...');
  const btn = await page.$('.ashby-application-form-submit-button');
  if (btn) await btn.click();
  await new Promise(r => setTimeout(r, 6000));
  await browser.disconnect();
}
inspectNetwork().catch(console.error);
