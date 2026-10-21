const puppeteer = require('puppeteer-core');

async function checkButtonsSonata() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const data = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: data.webSocketDebuggerUrl });
  const pages = await browser.pages();
  const sonataTab = pages.find(p => p.url().includes('sonata-software'));

  const btns = await sonataTab.evaluate(() => {
    return Array.from(document.querySelectorAll('button, a')).map(el => ({
      tag: el.tagName,
      text: el.innerText.trim(),
      aria: el.getAttribute('aria-label'),
      href: el.href || null
    })).filter(b => (b.text && b.text.length < 30) || (b.aria && b.aria.length < 30));
  });

  console.log('Buttons on Sonata Tab:\n', JSON.stringify(btns.slice(0, 20), null, 2));
}

checkButtonsSonata().catch(console.error);
