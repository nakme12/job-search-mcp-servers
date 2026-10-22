const puppeteer = require('puppeteer-core');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    const infy = pages.find(p => p.url().includes('infosys'));

    if (!infy) {
      console.log('No Infosys tab found');
      return;
    }

    await infy.bringToFront();
    console.log('[Infosys Forgot Password] Navigating to https://career.infosys.com/forgot-password ...');
    await infy.goto('https://career.infosys.com/forgot-password', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await sleep(3000);

    console.log('Title:', await infy.title());
    console.log('URL:', infy.url());

    // Inspect inputs on forgot password page
    const inputsInfo = await infy.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), button')).map(i => ({
        tag: i.tagName,
        type: i.type,
        id: i.id,
        name: i.name,
        placeholder: i.placeholder,
        text: i.innerText ? i.innerText.trim() : ''
      }));
      return { inputs, bodySnippet: document.body.innerText.substring(0, 300).replace(/\n+/g, ' ') };
    });

    console.log('Inputs info:\n', JSON.stringify(inputsInfo, null, 2));

    // Fill email if input found
    const emailFilled = await infy.evaluate(() => {
      const emailInput = document.querySelector('input[type="email"], input[type="text"], #email, #username, input[name="email"], input[name="username"]') ||
                         Array.from(document.querySelectorAll('input')).find(i => /email/i.test(i.placeholder || i.name || i.id));
      if (emailInput) {
        emailInput.value = 'pratikpatidar7990@gmail.com';
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        emailInput.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
      return false;
    });

    if (emailFilled) {
      console.log('✅ Filled email: pratikpatidar7990@gmail.com');
      // Look for submit or send OTP button
      const btnClicked = await infy.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button, input[type="submit"], a.btn'));
        const submitBtn = btns.find(b => /submit|continue|send otp|reset|send/i.test((b.innerText || b.value || '').trim()));
        if (submitBtn) {
          submitBtn.click();
          return submitBtn.innerText || submitBtn.value;
        }
        return null;
      });

      console.log(`Submitted button: "${btnClicked}"`);
      await sleep(3000);

      const postSubmitText = await infy.evaluate(() => document.body.innerText.substring(0, 400).replace(/\n+/g, ' '));
      console.log('Post submit text:\n', postSubmitText);
    }

    await browser.disconnect();

  } catch (err) {
    console.error('Error:', err.message);
  }
})();
