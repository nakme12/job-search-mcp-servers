const playwright = require('C:/mcp/naukri-auto-apply-engine/node_modules/playwright');

async function testPlaywrightDirect() {
  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://jobs.ashbyhq.com/supabase/7c5eb3fc-1087-4c1c-b3a2-a19fe01dd259/application');
  console.log('Direct Headless Ashby Title:', await page.title());
  const captcha = await page.$('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="turnstile"], #cf-turnstile');
  console.log('Direct Headless Captcha detected?:', !!captcha);
  await browser.close();
}

testPlaywrightDirect().catch(console.error);
