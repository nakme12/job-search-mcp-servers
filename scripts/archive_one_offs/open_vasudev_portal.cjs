const puppeteer = require('puppeteer-core');

async function openVasudevCareerPortal() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const data = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: data.webSocketDebuggerUrl });
  const pages = await browser.pages();
  const liTab = pages.find(page => page.url().includes('vasudev-technolabs'));

  console.log('Navigating directly to Vasudev Career Portal on live screen...');
  const portalPage = await browser.newPage();
  await portalPage.goto('https://vasudevs.com/career/frontend-developer/', { waitUntil: 'domcontentloaded', timeout: 35000 });
  await new Promise(r => setTimeout(r, 3500));
  await portalPage.bringToFront();

  // Close LinkedIn tab to strictly maintain Rule 61 max-2 ceiling
  if (liTab) {
    await liTab.close();
    console.log('LinkedIn tab closed cleanly.');
  }

  const info = await portalPage.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input, select, textarea')).map(el => ({
      tag: el.tagName,
      id: el.id,
      name: el.name,
      type: el.type,
      placeholder: el.placeholder,
      label: el.parentElement?.innerText?.substring(0, 50) || el.getAttribute('aria-label')
    }));

    return {
      title: document.title,
      inputs,
      snippet: document.body.innerText.substring(0, 400).replace(/\n+/g, ' ')
    };
  });

  console.log('Vasudev Direct Portal Form Details:\n', JSON.stringify(info, null, 2));
}

openVasudevCareerPortal().catch(console.error);
