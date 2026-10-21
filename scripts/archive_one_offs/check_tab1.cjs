const puppeteer = require('puppeteer-core');

async function checkTab() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const data = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: data.webSocketDebuggerUrl });
  const pages = await browser.pages();
  const p = pages[1];

  const info = await p.evaluate(() => {
    const dialog = document.querySelector('div[role="dialog"]');
    const modal = document.querySelector('.jobs-easy-apply-modal');
    const target = dialog || modal;
    return {
      hasTarget: !!target,
      text: target ? target.innerText : 'NO_DIALOG',
      url: window.location.href
    };
  });

  console.log('Tab Info:', JSON.stringify(info, null, 2));
}

checkTab().catch(console.error);
