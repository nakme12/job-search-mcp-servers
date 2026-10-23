const playwright = require('C:/mcp/naukri-auto-apply-engine/node_modules/playwright');

async function testWhatMatchedCaptcha() {
  const browser = await playwright.chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0];
  const page = await context.newPage();
  
  await page.goto('https://jobs.ashbyhq.com/supabase/7c5eb3fc-1087-4c1c-b3a2-a19fe01dd259/application');
  await page.waitForSelector('input', { timeout: 10000 });
  
  const matches = await page.evaluate(() => {
    const sel = 'iframe[src*="recaptcha"], iframe[src*="turnstile"], div[class*="captcha"]';
    const found = Array.from(document.querySelectorAll(sel)).map(el => ({
      tagName: el.tagName,
      className: el.className,
      outerHTML: el.outerHTML.substring(0, 150)
    }));
    return found;
  });

  console.log('Matches for captcha selector on Ashby:', JSON.stringify(matches, null, 2));
  await page.close();
}

testWhatMatchedCaptcha().catch(console.error);
