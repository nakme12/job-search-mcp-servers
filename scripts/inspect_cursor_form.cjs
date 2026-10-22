const playwright = require('C:/mcp/naukri-auto-apply-engine/node_modules/playwright');

async function checkCursorPage() {
  const browser = await playwright.chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0];
  const page = await context.newPage();
  
  await page.goto('https://jobs.ashbyhq.com/cursor/fa7a821b-ca2b-43fe-8942-07f215a060c7/application', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 3000));
  
  const formAnalysis = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input, textarea, select')).map(el => ({
      name: el.name || el.id || el.placeholder,
      type: el.type,
      required: el.required || el.getAttribute('aria-required') === 'true'
    }));
    const captcha = document.querySelector('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="turnstile"], #cf-turnstile');
    const errors = Array.from(document.querySelectorAll('.ashby-application-form-error, [class*="error"]')).map(e => e.innerText.trim()).filter(Boolean);
    return { title: document.title, inputsCount: inputs.length, inputs: inputs.slice(0, 10), hasCaptcha: !!captcha, errors };
  });

  console.log('Cursor Ashby Analysis:', JSON.stringify(formAnalysis, null, 2));
  await page.close();
}

checkCursorPage().catch(console.error);
