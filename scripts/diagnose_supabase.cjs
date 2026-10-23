const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const sub = pages.find(p => p.url().includes('jobs.ashbyhq.com/supabase') && p.url().includes('/application'));
  if (!sub) {
    console.log('Supabase tab not found');
    process.exit(1);
  }

  sub.on('requestfailed', req => console.log('Request Failed:', req.url(), req.failure().errorText));
  sub.on('response', async res => {
    const url = res.url();
    if (url.includes('ashby') || url.includes('api')) {
      console.log('Response:', res.status(), url.slice(0, 100));
      if (res.status() >= 400) {
        try {
          const body = await res.text();
          console.log('Error Body:', body.slice(0, 300));
        } catch(e) {}
      }
    }
  });

  const info = await sub.evaluate(() => {
    const form = document.querySelector('form');
    const btn = document.querySelector('.ashby-application-form-submit-button') || document.querySelector('button[type="submit"]');
    const errors = Array.from(document.querySelectorAll('*'))
      .filter(el => {
        const c = typeof el.className === 'string' ? el.className.toLowerCase() : '';
        return c.includes('error') || el.getAttribute('aria-invalid') === 'true';
      })
      .map(e => e.innerText.trim()).filter(Boolean);

    return {
      hasForm: !!form,
      hasBtn: !!btn,
      btnDisabled: btn ? btn.disabled : null,
      errors: Array.from(new Set(errors))
    };
  });
  console.log('Form Info:', info);

  const btn = await sub.$('.ashby-application-form-submit-button');
  if (btn) {
    console.log('Triggering click...');
    await btn.click();
    await new Promise(r => setTimeout(r, 4000));
  }

  process.exit(0);
})();
