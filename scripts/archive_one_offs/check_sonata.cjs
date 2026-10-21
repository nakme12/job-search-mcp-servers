const puppeteer = require('puppeteer-core');

async function checkSonata() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const data = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: data.webSocketDebuggerUrl });
  const pages = await browser.pages();
  const sonataTab = pages.find(p => p.url().includes('sonata-software'));

  if (!sonataTab) {
    console.log('No sonata tab');
    return;
  }

  await sonataTab.bringToFront();

  const details = await sonataTab.evaluate(() => {
    const btn = document.querySelector('.jobs-apply-button--top-card, button[aria-label*="Apply"], a.jobs-apply-button');
    return {
      title: document.title,
      hasBtn: !!btn,
      btnText: btn ? btn.innerText.trim() : 'NONE',
      textSnippet: document.body.innerText.substring(0, 300).replace(/\n+/g, ' ')
    };
  });

  console.log('Sonata details:\n', JSON.stringify(details, null, 2));
}

checkSonata().catch(console.error);
