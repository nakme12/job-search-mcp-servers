const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const sub = pages.find(p => p.url().includes('jobs.ashbyhq.com/supabase'));
  if (!sub) {
    console.log('Supabase tab not found');
    return;
  }

  console.log('Clicking .ashby-application-form-submit-button...');
  const btn = await sub.$('.ashby-application-form-submit-button');
  if (btn) {
    await btn.click();
    console.log('Button clicked successfully!');
  } else {
    console.log('Button not found by class');
  }

  await new Promise(r => setTimeout(r, 6000));
  const text = await sub.evaluate(() => document.body ? document.body.innerText : '');
  const url = sub.url();
  console.log('URL:', url);
  console.log('Snippet:\n', text.slice(0, 300));
})();
