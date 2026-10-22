const playwright = require('C:/mcp/naukri-auto-apply-engine/node_modules/playwright');

async function checkConsoleAndNetwork() {
  const browser = await playwright.chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0];
  const page = await context.newPage();
  
  const networkLogs = [];
  page.on('response', async res => {
    if (res.url().includes('ashby') || res.url().includes('apply') || res.url().includes('submission')) {
      let body = '';
      try { body = (await res.text()).substring(0, 200); } catch(e){}
      networkLogs.push({ url: res.url(), status: res.status(), body });
    }
  });

  await page.goto('https://jobs.ashbyhq.com/supabase/7c5eb3fc-1087-4c1c-b3a2-a19fe01dd259/application');
  await page.waitForSelector('input[name="_systemfield_name"]', { timeout: 15000 });

  await page.locator('input[name="_systemfield_name"]').fill('Pratik Patidar');
  await page.locator('input[name="_systemfield_email"]').fill('pratikpatidar7990@gmail.com');
  await page.locator('input#_systemfield_resume').setInputFiles('C:/mcp/job-search-mcp-engine/resumes/Pratik Patidar Resume - React Developer.pdf');

  // Fill textareas and text inputs
  await page.evaluate(() => {
    document.querySelectorAll('input[type="text"], textarea').forEach(el => {
      if (!el.value) {
        el.value = 'India';
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    document.querySelectorAll('button').forEach(b => {
      if (b.innerText.trim() === 'Yes') b.click();
    });
  });

  await new Promise(r => setTimeout(r, 2000));
  const submitBtn = await page.$('button:has-text("Submit Application")');
  if (submitBtn) {
    console.log('Clicking Submit Application...');
    await submitBtn.click();
  }
  await new Promise(r => setTimeout(r, 5000));

  console.log('NETWORK RESPONSES ON SUBMIT:');
  console.log(JSON.stringify(networkLogs.slice(-8), null, 2));

  await page.close();
}

checkConsoleAndNetwork().catch(console.error);
