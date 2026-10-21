const puppeteer = require('puppeteer-core');

async function inspectCGI() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const data = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: data.webSocketDebuggerUrl });
  const pages = await browser.pages();
  const cgiTab = pages.find(p => p.url().includes('njoyn.com'));

  if (!cgiTab) {
    console.log('CGI portal tab not found');
    return;
  }

  await cgiTab.bringToFront();

  const details = await cgiTab.evaluate(() => {
    const text = document.body.innerText;
    const btns = Array.from(document.querySelectorAll('a, button, input[type="submit"]')).map(el => ({
      tag: el.tagName,
      text: el.innerText ? el.innerText.trim() : (el.value || ''),
      href: el.href || null
    })).filter(b => b.text && b.text.length < 30);

    return {
      title: document.title,
      buttons: btns.slice(0, 15),
      snippet: text.substring(0, 400).replace(/\n+/g, ' ')
    };
  });

  console.log('CGI Portal Details:\n', JSON.stringify(details, null, 2));
}

inspectCGI().catch(console.error);
