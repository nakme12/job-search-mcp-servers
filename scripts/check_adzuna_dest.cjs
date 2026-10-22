const playwright = require('C:/mcp/naukri-auto-apply-engine/node_modules/playwright');

async function checkAdzunaLearnrush() {
  const browser = await playwright.chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0];
  const page = await context.newPage();
  
  console.log('Navigating to Learnrush via Adzuna...');
  await page.goto('https://www.adzuna.in/details/5934315804?utm_medium=api&utm_source=de296ef6', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 4000));
  
  console.log('Title:', await page.title());
  console.log('URL:', page.url());
  const destination = await page.evaluate(() => {
    const applyBtn = document.querySelector('a.apply-button, a[href*="redirect"], .apply-btn');
    return {
      applyHref: applyBtn ? applyBtn.href : null,
      applyText: applyBtn ? applyBtn.innerText.trim() : null
    };
  });
  console.log('Destination link:', destination);
  await page.close();
}

checkAdzunaLearnrush().catch(console.error);
