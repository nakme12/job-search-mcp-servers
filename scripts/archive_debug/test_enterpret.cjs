const playwright = require('C:/mcp/naukri-auto-apply-engine/node_modules/playwright');

async function testEnterpret() {
  const browser = await playwright.chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0];
  const page = await context.newPage();
  
  await page.goto('https://job-boards.greenhouse.io/enterpret/jobs/7847134003', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 3000));
  
  const formStatus = await page.evaluate(() => {
    const fn = document.querySelector('#first_name');
    const ln = document.querySelector('#last_name');
    const email = document.querySelector('#email');
    const phone = document.querySelector('#phone');
    const submitBtn = Array.from(document.querySelectorAll('button, input[type="submit"]')).find(b => (b.innerText || b.value || '').toLowerCase().includes('submit'));
    return {
      title: document.title,
      hasFirstName: !!fn,
      hasLastName: !!ln,
      hasEmail: !!email,
      hasPhone: !!phone,
      hasSubmit: !!submitBtn
    };
  });

  console.log('Enterpret Greenhouse Live Audit:', JSON.stringify(formStatus, null, 2));
  await page.close();
}

testEnterpret().catch(console.error);
