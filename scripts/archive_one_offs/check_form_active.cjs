const puppeteer = require('puppeteer-core');

async function checkNext() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const data = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: data.webSocketDebuggerUrl });
  const pages = await browser.pages();
  const p = pages[1];

  const content = await p.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input, select, textarea')).map(i => ({
      name: i.name,
      id: i.id,
      label: i.getAttribute('aria-label') || i.parentElement?.innerText || '',
      value: i.value,
      type: i.type
    }));
    return {
      inputs,
      formText: document.body.innerText.substring(0, 1000)
    };
  });

  console.log('Inputs & Form State:\n', JSON.stringify(content, null, 2));
}

checkNext().catch(console.error);
