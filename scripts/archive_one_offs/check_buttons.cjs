const puppeteer = require('puppeteer-core');

async function checkButtons() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const data = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: data.webSocketDebuggerUrl });
  const pages = await browser.pages();
  const p = pages[1];

  const btns = await p.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map(b => ({
      text: b.innerText.trim(),
      ariaLabel: b.getAttribute('aria-label'),
      className: b.className
    })).filter(b => b.text || b.ariaLabel);
  });

  console.log('Buttons on page:', JSON.stringify(btns, null, 2));
}

checkButtons().catch(console.error);
