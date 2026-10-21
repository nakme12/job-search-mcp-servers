const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const sub = pages.find(p => p.url().includes('jobs.ashbyhq.com/supabase'));
  if (!sub) {
    console.log('Supabase tab not found');
    return;
  }

  console.log('Finding submit button with Puppeteer selector...');
  // Find the button element directly
  const submitButton = await sub.evaluateHandle(() => {
    return Array.from(document.querySelectorAll('button')).find(b => /submit application/i.test(b.innerText.trim()));
  });

  const btnElement = submitButton.asElement();
  if (btnElement) {
    console.log('Found button element! Scrolling and clicking natively...');
    await btnElement.hover();
    await btnElement.click();
    console.log('Clicked via Puppeteer mouse click!');
  } else {
    console.log('Submit button not found');
  }

  await new Promise(r => setTimeout(r, 6000));
  const text = await sub.evaluate(() => document.body ? document.body.innerText : '');
  const title = await sub.title();
  console.log('Title:', title);
  console.log('Text preview:\n', text.slice(0, 400));
})();
