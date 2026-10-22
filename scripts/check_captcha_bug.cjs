const playwright = require('C:/mcp/naukri-auto-apply-engine/node_modules/playwright');

async function checkFalsePositive() {
  const browser = await playwright.chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0];
  const page = await context.newPage();
  
  await page.goto('https://jobs.ashbyhq.com/supabase/7c5eb3fc-1087-4c1c-b3a2-a19fe01dd259/application');
  await page.waitForSelector('input', { timeout: 10000 });
  
  const falsePositiveMatch = await page.evaluate(() => {
    const el = document.querySelector('iframe[src*="recaptcha"], iframe[src*="turnstile"], div[class*="captcha"]');
    const allDivs = Array.from(document.querySelectorAll('div')).map(d => d.className).filter(c => typeof c === 'string' && c.toLowerCase().includes('captcha'));
    return {
      matchedEl: el ? { tagName: el.tagName, className: el.className } : null,
      matchingClasses: allDivs
    };
  });

  console.log('FALSE POSITIVE DETECTED ELEMENT:', JSON.stringify(falsePositiveMatch, null, 2));
  await page.close();
}

checkFalsePositive().catch(console.error);
