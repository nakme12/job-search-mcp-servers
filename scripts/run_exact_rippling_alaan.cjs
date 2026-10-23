const playwright = require('C:/mcp/naukri-auto-apply-engine/node_modules/playwright');
const path = require('path');
const fs = require('fs');

async function testRipplingSubmit() {
  console.log('Connecting via CDP to Brave...');
  const browser = await playwright.chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0];
  const pages = context.pages();
  const page = pages.find(p => p.url().includes('rippling.com'));

  if (!page) {
    console.log('Rippling page not found');
    process.exit(1);
  }

  console.log('Found Rippling page:', await page.title());

  // 1. Upload Resume
  const resumePath = 'C:/mcp/job-search-mcp-engine/resumes/Pratik Patidar Resume - MERN Full Stack.pdf';
  console.log('1. Uploading Resume PDF:', resumePath);
  const fileInputs = page.locator('input[type="file"]');
  if (await fileInputs.count() > 0) {
    await fileInputs.first().setInputFiles(resumePath);
    console.log('  -> Resume uploaded!');
  }
  await page.waitForTimeout(2000);

  // 2. Fill First Name
  console.log('2. Filling First Name: Pratik');
  await page.locator('input[placeholder="First name"]').fill('Pratik');

  // 3. Fill Last Name
  console.log('3. Filling Last Name: Patidar');
  await page.locator('input[placeholder="Last name"]').fill('Patidar');

  // 4. Fill Email
  console.log('4. Filling Email: pratikpatidar7990@gmail.com');
  await page.locator('input[placeholder="Email"]').fill('pratikpatidar7990@gmail.com');

  // 5. Fill Phone Number
  console.log('5. Filling Phone Number: 8269647990');
  const phone = page.locator('input[placeholder="Phone number"]');
  if (await phone.count() > 0) {
    await phone.fill('8269647990');
  }

  // 6. Fill Current Company
  console.log('6. Filling Current Company: Techstuff Private Limited');
  const comp = page.locator('input[placeholder="Current company"]');
  if (await comp.count() > 0) {
    await comp.fill('Techstuff Private Limited');
  }

  // 7. Select SMS Opt-in No
  console.log('7. Handling SMS opt-in...');
  const radios = page.locator('input[type="radio"][name="sms_opt_in"]');
  if (await radios.count() > 1) {
    await radios.nth(1).check(); // typically No
  }

  await page.waitForTimeout(2000);

  // 8. Click Apply Button
  console.log('8. Clicking Apply Button...');
  const applyBtn = page.locator('button:has-text("Apply")');
  await applyBtn.click();
  console.log('Clicked Apply! Waiting 6s for response...');
  await page.waitForTimeout(6000);

  const text = await page.evaluate(() => document.body ? document.body.innerText.replace(/\s+/g, ' ') : '');
  console.log('Result Page text snippet:\n', text.slice(0, 400));

  const isConfirmed = /thank you|application submitted|application received|submitted successfully|applied/i.test(text);
  if (isConfirmed) {
    console.log('🎉🎉🎉 RIPPLING APPLICATION SUBMITTED SUCCESSFULLY!');
    const ssPath = 'C:/mcp/job-search-mcp-engine/screenshots/2026-10-22/shift2/alaan_rippling_confirmed.png';
    fs.mkdirSync(path.dirname(ssPath), { recursive: true });
    await page.screenshot({ path: ssPath, fullPage: true });
    console.log('Screenshot proof saved to:', ssPath);

    // Save to File 5
    const f5Path = 'C:/mcp/job-search-mcp-engine/data/daily/applied_todays_2026-10-22.json';
    let f5 = { date: '2026-10-22', shift: 2, total: 0, jobs: [] };
    if (fs.existsSync(f5Path)) {
      try { f5 = JSON.parse(fs.readFileSync(f5Path, 'utf8')); } catch(e){}
    }
    f5.jobs.push({
      company: 'Alaan',
      role: 'Fullstack Intern',
      url: 'https://ats.rippling.com/alaan-careers/jobs/5a84497e-6c95-4e99-8e42-279fef26e85c',
      channel: 'Rippling Direct ATS (Slot 7 Fully Automated)',
      proof_screenshot: ssPath,
      status: 'APPLIED_CONFIRMED',
      timestamp: new Date().toISOString()
    });
    f5.total = f5.jobs.length;
    fs.writeFileSync(f5Path, JSON.stringify(f5, null, 2), 'utf8');
    console.log('File 5 updated! Total confirmed applications:', f5.total);
  } else {
    console.log('⚠️ Notice: Submit clicked, checking DOM confirmation...');
  }

  process.exit(0);
}

testRipplingSubmit().catch(e => {
  console.error('Error during Rippling submit:', e);
  process.exit(1);
});
