const puppeteer = require('puppeteer-core');

async function openDeservely() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const data = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: data.webSocketDebuggerUrl });

  const p = await browser.newPage();
  console.log('Navigating to Deservely Technologies...');
  await p.goto('https://in.linkedin.com/jobs/view/mern-stack-developer-at-deservely-technologies-4472546168', { waitUntil: 'domcontentloaded', timeout: 35000 });
  await new Promise(r => setTimeout(r, 3500));

  const clicked = await p.evaluate(() => {
    const btn = document.querySelector('.jobs-apply-button--top-card, button[aria-label*="Easy Apply"]');
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });

  console.log('Clicked Easy Apply on Deservely:', clicked);
  await new Promise(r => setTimeout(r, 2500));
  await p.bringToFront();
}

openDeservely().catch(console.error);
