const puppeteer = require('puppeteer-core');

async function checkLinkedInInput() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const data = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: data.webSocketDebuggerUrl });
  const pages = await browser.pages();
  const p = pages[1];

  const details = await p.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input'));
    return inputs.map((inp, idx) => ({
      idx,
      type: inp.type,
      id: inp.id,
      name: inp.name,
      val: inp.value,
      parentText: inp.parentElement?.innerText?.substring(0, 100)
    })).filter(i => i.type === 'text');
  });

  console.log('All Text Inputs on Page 5:\n', JSON.stringify(details, null, 2));
}

checkLinkedInInput().catch(console.error);
