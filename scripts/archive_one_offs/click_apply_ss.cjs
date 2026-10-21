const puppeteer = require('puppeteer-core');

async function clickApplyAndTrace() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const data = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: data.webSocketDebuggerUrl });
  const pages = await browser.pages();
  const p = pages[pages.length - 1];

  console.log('Clicking visible Apply button for Ssssybertech...');
  
  // Listen for target created (new tab)
  const newTargetPromise = new Promise(resolve => {
    browser.once('targetcreated', async target => {
      const newPage = await target.page();
      resolve(newPage);
    });
  });

  await p.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, a'));
    const applyBtn = btns.find(b => b.innerText.trim() === 'Apply' || b.getAttribute('aria-label')?.includes('Apply'));
    if (applyBtn) applyBtn.click();
  });

  console.log('Waiting for destination external portal to open in Chrome...');
  const newPage = await Promise.race([
    newTargetPromise,
    new Promise(r => setTimeout(r, 6000))
  ]);

  if (newPage) {
    await newPage.bringToFront();
    console.log('Destination Portal Opened in Chrome UI:', newPage.url());
  } else {
    // Check if same tab navigated
    console.log('Same tab URL:', p.url());
  }
}

clickApplyAndTrace().catch(console.error);
