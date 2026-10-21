const puppeteer = require('puppeteer-core');

async function checkDeservelyDom() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const data = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: data.webSocketDebuggerUrl });
  const pages = await browser.pages();
  const p = pages[pages.length - 1];

  const info = await p.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input, select')).map(el => {
      const parent = el.closest('div');
      return {
        tag: el.tagName,
        id: el.id,
        name: el.name,
        type: el.type,
        val: el.value,
        ariaLabel: el.getAttribute('aria-label'),
        surroundingText: el.parentElement?.parentElement?.innerText?.substring(0, 150)
      };
    });
    return inputs;
  });

  console.log('DOM Elements:\n', JSON.stringify(info, null, 2));
}

checkDeservelyDom().catch(console.error);
