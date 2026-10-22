const playwright = require('C:/mcp/naukri-auto-apply-engine/node_modules/playwright');

async function getRealQuestions() {
  const browser = await playwright.chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0];
  const page = await context.newPage();
  
  await page.goto('https://jobs.ashbyhq.com/supabase/7c5eb3fc-1087-4c1c-b3a2-a19fe01dd259/application');
  await page.waitForSelector('input', { timeout: 10000 });
  
  const allLabels = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('label, div[class*="label"], [class*="Container"]'))
      .map(el => el.innerText.trim().replace(/\n/g, ' '))
      .filter(t => t.length > 3 && t.length < 150)
      .slice(0, 20);
  });

  console.log('ALL LABELS ON SUPABASE ASHBY FORM:');
  console.log(JSON.stringify(allLabels, null, 2));
  await page.close();
}

getRealQuestions().catch(console.error);
