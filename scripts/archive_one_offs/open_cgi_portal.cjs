const puppeteer = require('puppeteer-core');

async function checkCGI() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const data = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: data.webSocketDebuggerUrl });

  const p = await browser.newPage();
  console.log('Navigating in visible Chrome to: CGI Java Front End Engineer...');
  await p.goto('https://in.linkedin.com/jobs/view/jave-front-end-engineer-at-cgi-4477874150', { waitUntil: 'domcontentloaded', timeout: 35000 });
  await new Promise(r => setTimeout(r, 3500));
  await p.bringToFront();

  // Listen for target created (new tab)
  const newTargetPromise = new Promise(resolve => {
    browser.once('targetcreated', async target => {
      const page = await target.page();
      resolve(page);
    });
  });

  const clicked = await p.evaluate(() => {
    const applyLink = Array.from(document.querySelectorAll('a, button')).find(el => el.innerText.trim() === 'Apply' || el.getAttribute('aria-label')?.includes('Apply'));
    if (applyLink) {
      applyLink.click();
      return true;
    }
    return false;
  });

  console.log('Clicked Apply on CGI:', clicked);

  const portalPage = await Promise.race([
    newTargetPromise,
    new Promise(r => setTimeout(r, 6000))
  ]);

  if (portalPage) {
    await portalPage.bringToFront();
    console.log('CGI Direct Career Portal Opened on Screen:', portalPage.url());
    await p.close();
    console.log('Closed LinkedIn tab to strictly maintain Rule 61 max-2 ceiling!');
  } else {
    console.log('No new tab, staying on page:', p.url());
  }
}

checkCGI().catch(console.error);
