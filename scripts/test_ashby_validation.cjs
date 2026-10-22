const playwright = require('C:/mcp/naukri-auto-apply-engine/node_modules/playwright');

async function testAshbyClickSubmission() {
  const browser = await playwright.chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0];
  const page = await context.newPage();
  
  await page.goto('https://jobs.ashbyhq.com/supabase/7c5eb3fc-1087-4c1c-b3a2-a19fe01dd259/application');
  await page.waitForSelector('input', { timeout: 10000 });
  
  // Fill Name & Email
  await page.evaluate(() => {
    const nameEl = document.querySelector('input[name="_systemfield_name"]');
    if (nameEl) {
      nameEl.value = 'Pratik Patidar';
      nameEl.dispatchEvent(new Event('input', { bubbles: true }));
      nameEl.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const emailEl = document.querySelector('input[name="_systemfield_email"]');
    if (emailEl) {
      emailEl.value = 'pratikpatidar7990@gmail.com';
      emailEl.dispatchEvent(new Event('input', { bubbles: true }));
      emailEl.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

  // Try clicking Submit Application
  const submitClicked = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Submit Application'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });

  console.log('Submit button clicked?:', submitClicked);
  await new Promise(r => setTimeout(r, 2000));

  const validationErrors = await page.evaluate(() => {
    const errorElements = Array.from(document.querySelectorAll('[class*="error"], [aria-invalid="true"], [role="alert"]'))
      .map(e => e.innerText.trim())
      .filter(Boolean);
    const requiredEmpty = Array.from(document.querySelectorAll('input[required], select[required]'))
      .filter(i => !i.value)
      .map(i => i.name || i.id || i.placeholder);
    return { errorElements, requiredEmpty };
  });

  console.log('LIVE ASHBY VALIDATION ANALYSIS:', JSON.stringify(validationErrors, null, 2));
  await page.close();
}

testAshbyClickSubmission().catch(console.error);
