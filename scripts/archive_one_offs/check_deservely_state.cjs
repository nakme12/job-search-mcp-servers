const puppeteer = require('puppeteer-core');

async function checkDeservelyModal() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const data = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: data.webSocketDebuggerUrl });
  const pages = await browser.pages();
  const p = pages[pages.length - 1];

  const info = await p.evaluate(() => {
    const text = document.body.innerText;
    const btns = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(Boolean);
    const m = text.match(/(\d+\/\d+\s*pages?[\s\S]{0,800})/i);
    return {
      snippet: m ? m[0] : text.substring(0, 500),
      buttons: btns
    };
  });

  console.log('Deservely Modal State:\n', JSON.stringify(info, null, 2));
}

checkDeservelyModal().catch(console.error);
