const playwright = require('C:/mcp/naukri-auto-apply-engine/node_modules/playwright');

async function testAlaan() {
  const browser = await playwright.chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0];
  const page = await context.newPage();
  
  await page.goto('https://ats.rippling.com/alaan-careers/jobs/5a84497e-6c95-4e99-8e42-279fef26e85c', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 3000));
  
  const formStatus = await page.evaluate(() => {
    return {
      title: document.title,
      url: window.location.href,
      bodyText: document.body.innerText.substring(0, 400)
    };
  });

  console.log('Alaan Rippling Live Audit:', JSON.stringify(formStatus, null, 2));
  await page.close();
}

testAlaan().catch(console.error);
