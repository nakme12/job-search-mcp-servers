const puppeteer = require('puppeteer-core');

async function checkVasudev() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const data = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: data.webSocketDebuggerUrl });

  const p = await browser.newPage();
  console.log('Navigating in visible Chrome GUI to: Vasudev Technolabs...');
  await p.goto('https://in.linkedin.com/jobs/view/frontend-developer-at-vasudev-technolabs-4476858710', { waitUntil: 'domcontentloaded', timeout: 35000 });
  await new Promise(r => setTimeout(r, 3500));
  await p.bringToFront();

  const jdText = await p.evaluate(() => document.body.innerText);
  const m = jdText.match(/(\d+\s*(?:-|to|\+)\s*\d*\s*years?[\s\S]{0,300})/i);
  console.log('--- VASUDEV TECHNOLABS LIVE JD REQUIREMENT ---');
  console.log(m ? m[0] : 'Snippet:\n' + jdText.substring(0, 800).replace(/\n+/g, ' '));

  const applyInfo = await p.evaluate(() => {
    const btn = document.querySelector('.jobs-apply-button--top-card, button[aria-label*="Apply"], a.jobs-apply-button');
    return {
      hasApply: !!btn,
      text: btn ? btn.innerText.trim() : 'NONE',
      aria: btn ? btn.getAttribute('aria-label') : ''
    };
  });

  console.log('Apply Info:', JSON.stringify(applyInfo, null, 2));

  // If experience > 2, kill tab immediately
  if (m) {
    const num = parseInt(m[1], 10);
    if (num > 2) {
      console.log(`Requires ${num}+ YOE > 2 YOE ceiling. Killing tab (Rule 60)...`);
      await p.close();
      return;
    }
  }

  // If fits, click apply
  console.log('Clicking Apply button on Vasudev...');
  const newTargetPromise = new Promise(resolve => {
    browser.once('targetcreated', async target => {
      const page = await target.page();
      resolve(page);
    });
  });

  await p.evaluate(() => {
    const btn = document.querySelector('.jobs-apply-button--top-card, button[aria-label*="Apply"], a.jobs-apply-button');
    if (btn) btn.click();
  });

  const portalPage = await Promise.race([
    newTargetPromise,
    new Promise(r => setTimeout(r, 6000))
  ]);

  if (portalPage) {
    await portalPage.bringToFront();
    console.log('Vasudev Destination Portal Opened in Chrome UI:', portalPage.url());
    await p.close();
  }
}

checkVasudev().catch(console.error);
