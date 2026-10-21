const puppeteer = require('puppeteer-core');

async function checkErr() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const data = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: data.webSocketDebuggerUrl });
  const pages = await browser.pages();
  const p = pages[1];

  const errs = await p.evaluate(() => {
    const list = [];
    document.querySelectorAll('*').forEach(el => {
      if (el.className && typeof el.className === 'string' && el.className.includes('error')) {
        list.push(el.innerText);
      }
      if (el.getAttribute('aria-invalid') === 'true') {
        list.push(el.getAttribute('aria-label') || el.name || el.id);
      }
    });
    return Array.from(new Set(list)).filter(Boolean);
  });

  console.log('Errors:', JSON.stringify(errs, null, 2));
}

checkErr().catch(console.error);
