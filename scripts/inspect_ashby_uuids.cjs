const playwright = require('C:/mcp/naukri-auto-apply-engine/node_modules/playwright');

async function inspectRequiredUUIDs() {
  const browser = await playwright.chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0];
  const page = await context.newPage();
  
  await page.goto('https://jobs.ashbyhq.com/supabase/7c5eb3fc-1087-4c1c-b3a2-a19fe01dd259/application');
  await page.waitForSelector('input', { timeout: 10000 });
  
  const fields = await page.evaluate(() => {
    const uuids = [
      '5c60106e-bfac-4204-8e04-f490aceae780',
      '15c66e51-3f59-4684-997e-86fd80103c7a',
      'f4337c35-1043-450b-b4f0-1eb10defc88f',
      'd9415c3c-22be-43c9-9616-c64bd942004f'
    ];
    return uuids.map(id => {
      const el = document.querySelector(`[name="${id}"], [id="${id}"]`);
      const container = el ? el.closest('[data-field], .ashby-application-form-question, div') : null;
      const label = container ? container.innerText.trim().replace(/\n/g, ' ') : 'Not Found';
      return { id, tagName: el?.tagName, type: el?.type, label: label.substring(0, 100) };
    });
  });

  console.log('ASHBY CUSTOM QUESTIONS MAPPED BY REA:');
  console.log(JSON.stringify(fields, null, 2));
  await page.close();
}

inspectRequiredUUIDs().catch(console.error);
