const playwright = require('C:/mcp/naukri-auto-apply-engine/node_modules/playwright');

async function checkNaukriCDPPage() {
  const browser = await playwright.chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0];
  const p = context.pages().find(page => page.url().includes('naukri.com/job-listings'));
  if (p) {
    console.log('Found open Naukri tab:', await p.title());
    const btn = await p.$('button.apply-button, button#apply-button, .apply-button');
    if (btn) {
      console.log('Clicking button with real CDP mouse event...');
      await btn.hover();
      await btn.click({ delay: 100 });
      await new Promise(r => setTimeout(r, 4000));
      const body = await p.evaluate(() => document.body.innerText.substring(0, 400).replace(/\s+/g, ' '));
      console.log('Resulting snippet on open tab:\n', body);
    }
  } else {
    console.log('No open Naukri tab.');
  }
}

checkNaukriCDPPage().catch(console.error);
