const playwright = require('C:/mcp/naukri-auto-apply-engine/node_modules/playwright');

async function testSupabase() {
  const browser = await playwright.chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0];
  const page = await context.newPage();
  
  await page.goto('https://jobs.ashbyhq.com/supabase/7c5eb3fc-1087-4c1c-b3a2-a19fe01dd259/application', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 3000));
  
  const formStatus = await page.evaluate(() => {
    const nameInput = document.querySelector('input[name="_systemfield_name"], input[placeholder*="Name"], #name');
    const emailInput = document.querySelector('input[name="_systemfield_email"], input[placeholder*="Email"], #email');
    const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Submit'));
    return {
      title: document.title,
      hasName: !!nameInput,
      hasEmail: !!emailInput,
      hasSubmit: !!submitBtn,
      btnText: submitBtn ? submitBtn.innerText.trim() : null
    };
  });

  console.log('Supabase Ashby Live Audit:', JSON.stringify(formStatus, null, 2));
  await page.close();
}

testSupabase().catch(console.error);
