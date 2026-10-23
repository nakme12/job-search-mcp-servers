const playwright = require('C:/mcp/naukri-auto-apply-engine/node_modules/playwright');

async function checkRentomojoDestination() {
  const browser = await playwright.chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0];
  const page = await context.newPage();
  
  console.log('Resolving Adzuna Rentomojo destination...');
  await page.goto('https://www.adzuna.in/details/5934869802?utm_medium=api&utm_source=de296ef6');
  await new Promise(r => setTimeout(r, 4000));
  
  const dest = await page.evaluate(() => {
    const btn = document.querySelector('a.apply-button, a[href*="landing"], a[href*="redirect"], .apply-btn');
    return {
      href: btn ? btn.href : null,
      text: btn ? btn.innerText.trim() : null,
      title: document.title
    };
  });

  console.log('Adzuna Details:', JSON.stringify(dest, null, 2));
  await page.close();
}

checkRentomojoDestination().catch(console.error);
