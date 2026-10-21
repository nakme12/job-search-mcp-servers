const puppeteer = require('puppeteer-core');

async function testEasyApply() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const data = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: data.webSocketDebuggerUrl });

  const p = await browser.newPage();
  console.log('Navigating to Training Basket...');
  await p.goto('https://in.linkedin.com/jobs/view/react-js-developer-at-training-basket-4477216230', { waitUntil: 'domcontentloaded', timeout: 35000 });
  await new Promise(r => setTimeout(r, 3500));

  const clicked = await p.evaluate(() => {
    const btn = document.querySelector('.jobs-apply-button--top-card, button[aria-label*="Easy Apply"]');
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });

  console.log('Clicked Easy Apply:', clicked);
  await new Promise(r => setTimeout(r, 2500));

  const state = await p.evaluate(() => {
    const modal = document.querySelector('.jobs-easy-apply-modal') || document.querySelector('[role="dialog"]');
    if (!modal) return { hasModal: false };
    const inputs = Array.from(modal.querySelectorAll('input, select, textarea')).map(el => {
      return {
        tag: el.tagName,
        id: el.id,
        name: el.name,
        ariaLabel: el.getAttribute('aria-label'),
        value: el.value,
        type: el.type
      };
    });
    return { hasModal: true, title: modal.querySelector('h3, h2')?.innerText || '', inputs };
  });

  console.log('Modal State:', JSON.stringify(state, null, 2));
}

testEasyApply().catch(console.error);
