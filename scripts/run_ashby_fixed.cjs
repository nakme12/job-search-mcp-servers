const playwright = require('C:/mcp/naukri-auto-apply-engine/node_modules/playwright');
const path = require('path');
const fs = require('fs');

async function testAshbyExactFlow() {
  console.log('Connecting to Brave CDP at http://127.0.0.1:9222...');
  const browser = await playwright.chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0];
  const page = await context.newPage();
  
  console.log('Navigating to Supabase application...');
  await page.goto('https://jobs.ashbyhq.com/supabase/7c5eb3fc-1087-4c1c-b3a2-a19fe01dd259/application');
  await page.waitForSelector('input[name="_systemfield_name"]', { timeout: 15000 });

  // 1. Fill Name
  await page.locator('input[name="_systemfield_name"]').fill('Pratik Patidar');
  
  // 2. Fill Email
  await page.locator('input[name="_systemfield_email"]').fill('pratikpatidar7990@gmail.com');

  // 3. Upload Resume
  const resumePath = 'C:/mcp/job-search-mcp-engine/resumes/Pratik Patidar Resume - React Developer.pdf';
  console.log('Uploading Resume:', resumePath);
  await page.locator('input#_systemfield_resume').setInputFiles(resumePath);
  await new Promise(r => setTimeout(r, 2000));

  // 4. Fill required custom questions
  const customInputs = await page.$$('input[placeholder="Type here..."]');
  console.log(`Custom text inputs found: ${customInputs.length}`);
  for (const ci of customInputs) {
    const name = await ci.getAttribute('name');
    if (name === '_systemfield_name' || name === '_systemfield_email') continue;
    await ci.fill('India');
  }

  // 5. Select 18+ Yes
  const yesBtns = await page.$$('button:has-text("Yes")');
  for (const b of yesBtns) {
    await b.click().catch(() => {});
  }

  // 6. Submit Application
  console.log('Clicking Submit Application...');
  const submitBtn = await page.$('button:has-text("Submit Application")');
  if (submitBtn) {
    await submitBtn.click();
    console.log('Clicked Submit Application! Waiting for response...');
    await new Promise(r => setTimeout(r, 5000));
    console.log('Result Page URL:', page.url());
    console.log('Result Title:', await page.title());
    const snippet = await page.evaluate(() => document.body.innerText.substring(0, 500).replace(/\s+/g, ' '));
    console.log('Result Page text snippet:\n', snippet);

    const isConfirmed = /thank you|application submitted|application received|submitted successfully/i.test(snippet);
    if (isConfirmed) {
      console.log('🎉 SUBMISSION CONFIRMED ON DOM!');
      const ssPath = 'C:/mcp/job-search-mcp-engine/screenshots/2026-10-22/shift2/supabase_confirmed.png';
      fs.mkdirSync(path.dirname(ssPath), { recursive: true });
      await page.screenshot({ path: ssPath, fullPage: true });
      console.log('Proof screenshot saved:', ssPath);

      // Record in File 5
      const f5Path = 'C:/mcp/job-search-mcp-engine/data/daily/applied_todays_2026-10-22.json';
      let f5 = { date: '2026-10-22', shift: 2, total: 0, jobs: [] };
      if (fs.existsSync(f5Path)) {
        try { f5 = JSON.parse(fs.readFileSync(f5Path, 'utf8')); } catch(e){}
      }
      f5.jobs.push({
        company: 'Supabase',
        role: 'Software Engineer - Turso',
        url: 'https://jobs.ashbyhq.com/supabase/7c5eb3fc-1087-4c1c-b3a2-a19fe01dd259/application',
        channel: 'Direct ATS Portal Form (Ashby)',
        proof_screenshot: ssPath,
        status: 'APPLIED_CONFIRMED',
        timestamp: new Date().toISOString()
      });
      f5.total = f5.jobs.length;
      fs.writeFileSync(f5Path, JSON.stringify(f5, null, 2));
      console.log('✅ File 5 updated and locked. Total today:', f5.total);
    } else {
      console.log('⚠️ Submission not confirmed yet.');
    }
  }

  await page.close();
}

testAshbyExactFlow().catch(console.error);
