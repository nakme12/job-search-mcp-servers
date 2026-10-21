const puppeteer = require('puppeteer-core');

async function openLiveJob() {
  console.log('Connecting to Live Chrome Browser (Port 9222)...');
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const data = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: data.webSocketDebuggerUrl });

  // Open new live visible tab
  const p = await browser.newPage();
  console.log('Navigating in visible Chrome window to: Ssssybertech...');
  await p.goto('https://in.linkedin.com/jobs/view/front-end-react-js-developer-4477972673', { waitUntil: 'domcontentloaded', timeout: 35000 });
  await new Promise(r => setTimeout(r, 3500));
  await p.bringToFront();

  console.log('Tab is in front on your screen right now!');

  // Check Apply button
  const applyInfo = await p.evaluate(() => {
    const applyBtn = document.querySelector('.jobs-apply-button--top-card, button[aria-label*="Apply"]');
    return {
      hasApplyBtn: !!applyBtn,
      btnText: applyBtn ? applyBtn.innerText.trim() : 'NONE',
      title: document.title
    };
  });

  console.log('Apply Button Info:', JSON.stringify(applyInfo, null, 2));
}

openLiveJob().catch(console.error);
