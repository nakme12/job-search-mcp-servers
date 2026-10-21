const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  let p = pages.find(page => page.url().includes('jobs.ashbyhq.com/supabase'));
  if (!p) {
    console.log('No Supabase page found.');
    return;
  }

  const errs = await p.evaluate(() => {
    const errorElements = Array.from(document.querySelectorAll('*')).filter(el => {
      const cls = el.className && typeof el.className === 'string' ? el.className.toLowerCase() : '';
      return cls.includes('error') || cls.includes('alert') || el.getAttribute('role') === 'alert';
    });
    return {
      errors: errorElements.map(e => e.innerText.trim()).filter(Boolean).slice(0, 10),
      buttons: Array.from(document.querySelectorAll('button')).map(b => ({
        text: b.innerText.trim(),
        disabled: b.disabled,
        visible: b.offsetParent !== null
      }))
    };
  });

  console.log('Errors / Buttons on Supabase:\n', JSON.stringify(errs, null, 2));
})();
