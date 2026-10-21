const puppeteer = require('puppeteer-core');

async function triggerReactInput() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const data = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: data.webSocketDebuggerUrl });
  const pages = await browser.pages();
  const p = pages[1];

  await p.evaluate(() => {
    const input = document.getElementById('_r_32_') || Array.from(document.querySelectorAll('input')).pop();
    if (input) {
      input.focus();
      // Set native value via prototype setter so React picks it up
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      nativeInputValueSetter.call(input, 'https://www.linkedin.com/in/pratik-patidar');

      const ev1 = new Event('input', { bubbles: true });
      input.dispatchEvent(ev1);
      const ev2 = new Event('change', { bubbles: true });
      input.dispatchEvent(ev2);
    }
  });

  await new Promise(r => setTimeout(r, 1000));

  // Click Review button
  await p.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const rev = btns.find(b => b.innerText.trim() === 'Review');
    if (rev) rev.click();
  });

  await new Promise(r => setTimeout(r, 2000));

  const state = await p.evaluate(() => {
    const text = document.body.innerText;
    const btns = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(Boolean);
    return {
      buttons: btns,
      pageText: text.substring(0, 400)
    };
  });

  console.log('State After Native Setter:', JSON.stringify(state, null, 2));
}

triggerReactInput().catch(console.error);
