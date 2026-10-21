const puppeteer = require('puppeteer-core');

async function inspectDarwinbox() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const data = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: data.webSocketDebuggerUrl });
  const pages = await browser.pages();
  const dbTab = pages.find(p => p.url().includes('darwinbox.in'));

  if (!dbTab) {
    console.log('Darwinbox tab not found');
    return;
  }

  await dbTab.bringToFront();

  const info = await dbTab.evaluate(() => {
    const text = document.body.innerText;
    const btns = Array.from(document.querySelectorAll('button, a')).map(b => b.innerText.trim()).filter(Boolean);
    const inputs = Array.from(document.querySelectorAll('input, select, textarea')).map(el => ({
      tag: el.tagName,
      id: el.id,
      name: el.name,
      type: el.type,
      placeholder: el.placeholder
    }));

    return {
      title: document.title,
      buttons: btns.slice(0, 15),
      inputsCount: inputs.length,
      snippet: text.substring(0, 400).replace(/\n+/g, ' ')
    };
  });

  console.log('Darwinbox Details:\n', JSON.stringify(info, null, 2));
}

inspectDarwinbox().catch(console.error);
