const puppeteer = require('puppeteer-core');

async function inspectCompanyCareerPortal() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const data = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: data.webSocketDebuggerUrl });
  const pages = await browser.pages();
  const portalPage = pages.find(p => p.url().includes('ssssybertech.com'));

  if (!portalPage) {
    console.log('Portal page not found in open tabs.');
    return;
  }

  await portalPage.bringToFront();
  console.log('Portal tab brought to front on screen!');

  const info = await portalPage.evaluate(() => {
    const text = document.body.innerText;
    const inputs = Array.from(document.querySelectorAll('input, select, textarea')).map(el => ({
      tag: el.tagName,
      id: el.id,
      name: el.name,
      type: el.type,
      placeholder: el.placeholder,
      label: el.parentElement?.innerText?.substring(0, 50)
    }));

    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);

    return {
      title: document.title,
      inputs,
      emailsFound: emailMatch,
      snippet: text.substring(0, 600).replace(/\n+/g, ' ')
    };
  });

  console.log('Portal Form Details:\n', JSON.stringify(info, null, 2));
}

inspectCompanyCareerPortal().catch(console.error);
