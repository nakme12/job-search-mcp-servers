const playwright = require('C:/mcp/naukri-auto-apply-engine/node_modules/playwright');
const path = require('path');
const fs = require('fs');

async function testSupabaseSubmission() {
  console.log('Connecting via CDP...');
  const browser = await playwright.chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0];
  const pages = context.pages();
  const page = pages.find(p => p.url().includes('jobs.ashbyhq.com/supabase') && p.url().includes('/application'));
  
  if (!page) {
    console.log('Error: Supabase tab not found in CDP!');
    process.exit(1);
  }

  console.log('Target tab found:', await page.title());

  // 1. Name
  console.log('Filling Name: Pratik Patidar');
  await page.locator('#_systemfield_name').fill('Pratik Patidar');

  // 2. Email
  console.log('Filling Email: pratikpatidar7990@gmail.com');
  await page.locator('#_systemfield_email').fill('pratikpatidar7990@gmail.com');

  // 3. Resume
  const resumePath = 'C:/mcp/job-search-mcp-engine/resumes/Pratik Patidar Resume - MERN Full Stack.pdf';
  console.log('Uploading Resume:', resumePath);
  await page.locator('#_systemfield_resume').setInputFiles(resumePath);
  await page.waitForTimeout(1500);

  // 4. Passport Country
  console.log('Filling Passport Country: India');
  await page.locator('#\\5c60106e-bfac-4204-8e04-f490aceae780').fill('India');

  // 5. Country of Residence
  console.log('Filling Country of Residence: India');
  await page.locator('#\\15c66e51-3f59-4684-997e-86fd80103c7a').fill('India');

  // 6. Are you over the age of 18?
  console.log('Selecting Are you over 18: Yes');
  const yesBtn = page.locator('button:has-text("Yes")');
  if (await yesBtn.count() > 0) {
    await yesBtn.first().click();
  }

  // 7. Github Profile
  console.log('Filling Github Profile: https://github.com/pratikpatidar');
  await page.locator('#f4337c35-1043-450b-b4f0-1eb10defc88f').fill('https://github.com/pratikpatidar');

  // 8. Linkedin
  console.log('Filling Linkedin: https://www.linkedin.com/in/pratik-patidar');
  await page.locator('#d9415c3c-22be-43c9-9616-c64bd942004f').fill('https://www.linkedin.com/in/pratik-patidar');

  // 9. Async / remote experience textarea
  console.log('Filling Async Experience textarea...');
  await page.locator('#\\33653c13-8823-4187-a806-079124784eeb').fill(
    'I have 1.5 years of experience collaborating effectively in remote and async software teams using Git, GitHub, Slack, Jira, clear documentation, and proactive daily communication.'
  );

  await page.waitForTimeout(1500);

  // Check validation errors before submit
  const errors = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('*'))
      .filter(el => {
        const c = typeof el.className === 'string' ? el.className.toLowerCase() : '';
        return c.includes('error') || el.getAttribute('aria-invalid') === 'true';
      })
      .map(e => e.innerText.trim()).filter(Boolean);
  });
  console.log('Validation Errors before submit:', Array.from(new Set(errors)));

  // 10. Click Submit Application
  console.log('Clicking Submit Application button...');
  const submitBtn = page.locator('button.ashby-application-form-submit-button');
  await submitBtn.click();
  console.log('Submit button clicked! Waiting 6 seconds for network & confirmation...');
  await page.waitForTimeout(6000);

  const snippet = await page.evaluate(() => document.body ? document.body.innerText.slice(0, 500).replace(/\s+/g, ' ') : '');
  console.log('DOM response snippet:\n', snippet);

  const isConfirmed = /thank you|application submitted|application received|submitted successfully/i.test(snippet);
  if (isConfirmed) {
    console.log('🎉🎉🎉 SUPABASE APPLICATION SUCCESSFULLY SUBMITTED ON ASHBY!');
    const ssPath = 'C:/mcp/job-search-mcp-engine/screenshots/2026-10-22/shift2/supabase_turso_confirmed.png';
    fs.mkdirSync(path.dirname(ssPath), { recursive: true });
    await page.screenshot({ path: ssPath, fullPage: true });
    console.log('Proof screenshot saved:', ssPath);

    // Save to File 5
    const f5Path = 'C:/mcp/job-search-mcp-engine/data/daily/applied_todays_2026-10-22.json';
    let f5 = { date: '2026-10-22', shift: 2, total: 0, jobs: [] };
    if (fs.existsSync(f5Path)) {
      try { f5 = JSON.parse(fs.readFileSync(f5Path, 'utf8')); } catch(e){}
    }
    f5.jobs.push({
      company: 'Supabase',
      role: 'Software Engineer - Turso',
      url: 'https://jobs.ashbyhq.com/supabase/7c5eb3fc-1087-4c1c-b3a2-a19fe01dd259/application',
      channel: 'Ashby Direct ATS (Slot 7 Fully Automated)',
      proof_screenshot: ssPath,
      status: 'APPLIED_CONFIRMED',
      timestamp: new Date().toISOString()
    });
    f5.total = f5.jobs.length;
    fs.writeFileSync(f5Path, JSON.stringify(f5, null, 2), 'utf8');
    console.log('File 5 updated successfully! Total confirmed:', f5.total);
  } else {
    console.log('⚠️ Notice: Submit clicked, checking status...');
  }

  process.exit(0);
}

testSupabaseSubmission().catch(err => {
  console.error('Execution Failed:', err);
  process.exit(1);
});
