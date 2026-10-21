const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const sub = pages.find(p => p.url().includes('jobs.ashbyhq.com/supabase'));
  if (!sub) {
    console.log('Supabase tab not found');
    return;
  }

  await sub.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input[type="text"], input[type="email"], textarea'));
    inputs.forEach(inp => {
      inp.focus();
      inp.dispatchEvent(new Event('focus', { bubbles: true }));
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      inp.dispatchEvent(new Event('change', { bubbles: true }));
      inp.blur();
      inp.dispatchEvent(new Event('blur', { bubbles: true }));
    });
  });

  console.log('Focused, touched and blurred all inputs.');
  await new Promise(r => setTimeout(r, 1000));

  console.log('Clicking Submit button via DOM...');
  const res = await sub.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
    const b = document.querySelector('.ashby-application-form-submit-button');
    if (b) {
      b.scrollIntoView();
      b.click();
      return 'Clicked .ashby-application-form-submit-button';
    }
    return 'Not found';
  });
  console.log(res);

  await new Promise(r => setTimeout(r, 6000));
  const text = await sub.evaluate(() => document.body ? document.body.innerText : '');
  const title = await sub.title();
  console.log('Title:', title);
  console.log('Snippet:\n', text.slice(0, 400));
})();
