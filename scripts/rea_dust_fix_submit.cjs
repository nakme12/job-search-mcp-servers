const playwright = require('C:/mcp/naukri-auto-apply-engine/node_modules/playwright');
const fs = require('fs');
const path = require('path');

async function fixDustSubmit() {
  const browser = await playwright.chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0];
  const pages = context.pages();
  const page = pages.find(p => p.url().includes('dust'));
  if (!page) {
    console.log('Dust page not found');
    process.exit(1);
  }

  console.log('[Dust Fix] Re-injecting Resume via setInputFiles...');
  const resumePath = 'C:\\mcp\\job-search-mcp-engine\\resumes\\Pratik Patidar Resume - MERN Full Stack.pdf';
  await page.locator('#_systemfield_resume').setInputFiles(resumePath);
  await page.waitForTimeout(2000);

  console.log('[Dust Fix] Re-filling Compensation: 465000...');
  const comp = page.locator('#\\dbae9486-b1c9-4dae-a763-6c82012469e8');
  await comp.click();
  await comp.fill('465000');

  console.log('[Dust Fix] Re-filling Why Dust textarea...');
  const why = page.locator('#\\01483165-3986-482b-9a5a-631d8530151c');
  await why.click();
  await why.fill('I am excited by Dust mission to build connected AI assistants that amplify team productivity. With 1.5 years of experience in React, Next.js, and TypeScript, I want to build robust AI interfaces.');

  await page.waitForTimeout(1500);

  // Check invalid fields again
  const invalids = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input, select, textarea'))
      .filter(i => i.checkValidity && !i.checkValidity())
      .map(i => ({ id: i.id, msg: i.validationMessage }));
  });
  console.log('[Dust Fix] Invalids before submit:', invalids);

  console.log('[Dust Fix] Clicking Submit Application button...');
  const submitBtn = page.locator('button.ashby-application-form-submit-button');
  await submitBtn.click();
  console.log('[Dust Fix] Submit clicked! Waiting 8s for confirmation response...');
  await page.waitForTimeout(8000);

  const text = await page.evaluate(() => document.body ? document.body.innerText.replace(/\s+/g, ' ') : '');
  console.log('[Dust Fix Result Snippet]:\n', text.slice(0, 450));

  const isConfirmed = /thank you|application submitted|application received|submitted successfully|applied/i.test(text);
  if (isConfirmed) {
    console.log('🎉🎉🎉 DUST ASHBY APPLICATION FULLY CONFIRMED & SUBMITTED!');
    const ssPath = 'C:\\mcp\\job-search-mcp-engine\\screenshots\\2026-10-23\\shift1\\dust_ashby_confirmed.png';
    fs.mkdirSync(path.dirname(ssPath), { recursive: true });
    await page.screenshot({ path: ssPath, fullPage: true });
    console.log('Proof screenshot saved to disk:', ssPath);

    // Save to File 5
    const f5Path = 'C:\\mcp\\job-search-mcp-engine\\data\\daily\\applied_todays_2026-10-23.json';
    let f5 = { date: '2026-10-23', cycle: 'Cycle 1 (11:00 AM - 03:00 PM)', total: 0, jobs: [] };
    if (fs.existsSync(f5Path)) {
      try { f5 = JSON.parse(fs.readFileSync(f5Path, 'utf8')); } catch(e){}
    }
    f5.jobs.push({
      company: 'Dust',
      role: 'Software Engineer',
      url: 'https://jobs.ashbyhq.com/dust/ec0ae613-e480-4d93-b89f-1d6a89db9766/application',
      channel: 'Ashby Direct ATS (Candidate 3/8)',
      proof_screenshot: ssPath,
      status: 'APPLIED_CONFIRMED',
      timestamp: new Date().toISOString()
    });
    f5.total = f5.jobs.length;
    fs.writeFileSync(f5Path, JSON.stringify(f5, null, 2), 'utf8');
    console.log('✅ File 5 updated! Total confirmed applied today:', f5.total);
    await page.close();
    console.log('Tab closed per Rule 57.');
  } else {
    console.log('⚠️ Status under check. Tab kept open.');
  }

  process.exit(0);
}

fixDustSubmit().catch(e => {
  console.error('Error during Dust fix submit:', e);
  process.exit(1);
});
