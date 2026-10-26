const puppeteer = require('puppeteer-core');

(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const p = (await b.pages()).find(x => x.url().includes('career.infosys.com'));
  if (!p) {
    b.disconnect();
    return;
  }

  // Find the recaptcha frame
  const frames = p.frames();
  const recaptchaFrame = frames.find(f => f.url().includes('recaptcha/api2/anchor'));

  if (recaptchaFrame) {
    console.log('Found reCAPTCHA anchor frame! Clicking checkbox...');
    const checkbox = await recaptchaFrame.$('#recaptcha-anchor');
    if (checkbox) {
      await checkbox.click();
      console.log('Clicked reCAPTCHA checkbox. Waiting 3s...');
      await new Promise(r => setTimeout(r, 3500));

      const isChecked = await recaptchaFrame.evaluate(() => {
        const anchor = document.querySelector('#recaptcha-anchor');
        return anchor ? anchor.getAttribute('aria-checked') : null;
      });

      console.log('reCAPTCHA status (aria-checked):', isChecked);

      const btnDisabled = await p.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(el => el.innerText.trim().toUpperCase() === 'SEND');
        return btn ? btn.disabled : null;
      });
      console.log('SEND Button disabled now?', btnDisabled);
    }
  } else {
    console.log('reCAPTCHA frame not found');
  }

  b.disconnect();
})();
