const puppeteer = require('puppeteer-core');

(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const p = (await b.pages()).find(x => x.url().includes('career.infosys.com'));
  if (!p) {
    b.disconnect();
    return;
  }

  const result = await p.evaluate(() => {
    const input = document.querySelector('#mat-input-0');
    if (!input) return { error: 'input not found' };

    input.focus();
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeSetter.call(input, 'pratikpatidar7990@gmail.com');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new Event('blur', { bubbles: true }));

    const btn = Array.from(document.querySelectorAll('button')).find(el => el.innerText.trim().toUpperCase() === 'SEND');
    return {
      val: input.value,
      btnDisabled: btn ? btn.disabled : null,
      btnClass: btn ? btn.className : null
    };
  });

  console.log('After Angular native setter:\n', JSON.stringify(result, null, 2));

  // If enabled, click it!
  if (result.btnDisabled === false) {
    console.log('Button is enabled! Clicking SEND...');
    await p.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(el => el.innerText.trim().toUpperCase() === 'SEND');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 4000));

    const finalFeedback = await p.evaluate(() => {
      const msgs = Array.from(document.querySelectorAll('.snack, .toast, .alert, .success, .error, mat-snack-bar-container, p, div'))
        .map(el => el.innerText.trim())
        .filter(t => t.toLowerCase().includes('sent') || t.toLowerCase().includes('email') || t.toLowerCase().includes('link') || t.toLowerCase().includes('success') || t.toLowerCase().includes('error'));
      return msgs.slice(0, 5);
    });

    console.log('Feedback after clicking SEND:\n', JSON.stringify(finalFeedback, null, 2));
  } else {
    // Try typing space and backspace via real keyboard
    console.log('Trying keyboard focus + space + backspace...');
    await p.focus('#mat-input-0');
    await p.keyboard.press('Space');
    await new Promise(r => setTimeout(r, 100));
    await p.keyboard.press('Backspace');
    await new Promise(r => setTimeout(r, 500));

    const btnState = await p.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(el => el.innerText.trim().toUpperCase() === 'SEND');
      return btn ? btn.disabled : null;
    });
    console.log('Button disabled after keypress?', btnState);

    if (btnState === false) {
      console.log('Clicking SEND button now...');
      await p.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(el => el.innerText.trim().toUpperCase() === 'SEND');
        if (btn) btn.click();
      });
      await new Promise(r => setTimeout(r, 4000));
      const alerts = await p.evaluate(() => {
        return Array.from(document.querySelectorAll('p, div, span'))
          .map(el => el.innerText.trim())
          .filter(t => t.toLowerCase().includes('sent') || t.toLowerCase().includes('email') || t.toLowerCase().includes('link') || t.toLowerCase().includes('success') || t.toLowerCase().includes('reset'));
      });
      console.log('Alerts:', alerts.slice(0, 5));
    }
  }

  b.disconnect();
})();
