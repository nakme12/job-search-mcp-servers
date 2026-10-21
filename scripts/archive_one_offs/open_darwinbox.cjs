const puppeteer = require('puppeteer-core');

async function openDarwinbox() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const data = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: data.webSocketDebuggerUrl });
  const pages = await browser.pages();
  const sonataTab = pages.find(p => p.url().includes('sonata-software'));

  console.log('Clicking Apply on company website (Darwinbox ATS)...');

  const newTargetPromise = new Promise(resolve => {
    browser.once('targetcreated', async target => {
      const page = await target.page();
      resolve(page);
    });
  });

  await sonataTab.evaluate(() => {
    const applyLink = Array.from(document.querySelectorAll('a')).find(a => a.innerText.trim() === 'Apply' || a.getAttribute('aria-label')?.includes('company website'));
    if (applyLink) applyLink.click();
  });

  const portalPage = await Promise.race([
    newTargetPromise,
    new Promise(r => setTimeout(r, 6000))
  ]);

  if (portalPage) {
    await portalPage.bringToFront();
    console.log('Opened Darwinbox Career Portal on screen:', portalPage.url());
    
    // Close the LinkedIn tab to strictly maintain max-2 LinkedIn tabs!
    await sonataTab.close();
    console.log('Closed Sonata LinkedIn tab to maintain Rule 61 ceiling cleanly.');
  } else {
    console.log('No new tab opened, staying on same page.');
  }
}

openDarwinbox().catch(console.error);
