const puppeteer = require('puppeteer-core');

async function diagnose() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const amex = pages.find(p => p.url().includes('oraclecloud.com'));
  if (!amex) {
    console.log('AmEx not found');
    return;
  }

  // If on email page, advance
  if (amex.url().includes('/apply/email')) {
    console.log('On email page, advancing...');
    await amex.evaluate(() => {
      const emailInput = document.querySelector('input[type="email"]');
      if (emailInput) {
        emailInput.value = 'pratikpatidar7990@gmail.com';
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        emailInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const agreeBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim().toLowerCase() === 'agree');
      if (agreeBtn) agreeBtn.click();
      const checkbox = document.querySelector('#legal-disclaimer-checkbox');
      if (checkbox) {
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await new Promise(r => setTimeout(r, 1000));
    await amex.evaluate(() => {
      const nextBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim().toLowerCase() === 'next');
      if (nextBtn) nextBtn.click();
    });
    await new Promise(r => setTimeout(r, 4000));
  }

  console.log('Current URL:', amex.url());

  // Click 'Go to Next Issue' or find all errors
  const errors = await amex.evaluate(() => {
    const errorContainers = Array.from(document.querySelectorAll('.oj-message-detail, .oj-form-control-error-message, [aria-invalid="true"], .oj-invalid'));
    const issuesBanner = document.body.innerText.match(/You have \d+ issues[^\n]*/i);
    return {
      banner: issuesBanner ? issuesBanner[0] : null,
      errorMessages: errorContainers.map(e => e.innerText.trim()).filter(t => t.length > 0)
    };
  });

  console.log('Diagnosed Errors:', JSON.stringify(errors, null, 2));
}

diagnose().catch(console.error);
