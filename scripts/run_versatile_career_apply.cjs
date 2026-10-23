const playwright = require('C:/mcp/naukri-auto-apply-engine/node_modules/playwright');
const fs = require('fs');
const path = require('path');

async function applyVersatileDirect() {
  console.log('Connecting via CDP to Brave...');
  const browser = await playwright.chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0];
  const page = await context.newPage();

  const url = 'https://versatileit.in/jobs/react-js-developer-fresher-0-1-year-experience/';
  console.log('[Direct Career Apply] Navigating to:', url);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  // 1. Name
  console.log('1. Filling Name: Pratik Patidar');
  await page.locator('#name').fill('Pratik Patidar');

  // 2. Email
  console.log('2. Filling Email: pratikpatidar7990@gmail.com');
  await page.locator('#email').fill('pratikpatidar7990@gmail.com');

  // 3. Dial Code
  console.log('3. Filling Dial Code: +91');
  const dial = page.locator('#phone_dial_code');
  if (await dial.count() > 0) {
    await dial.fill('+91');
  }

  // 4. Phone
  console.log('4. Filling Phone: 8269647990');
  await page.locator('#phone').fill('8269647990');

  // 5. Resume PDF
  const resumePath = 'C:/mcp/job-search-mcp-engine/resumes/Pratik Patidar Resume - React Developer.pdf';
  console.log('5. Uploading Resume PDF:', resumePath);
  await page.locator('#resume').setInputFiles(resumePath);
  await page.waitForTimeout(1500);

  // 6. Cover Letter
  console.log('6. Filling Cover Letter...');
  const cl = page.locator('#cover_letter');
  if (await cl.count() > 0) {
    await cl.fill('I am a React.js and Frontend Developer with 1.5 years of experience building modern web applications with React.js, Next.js, TypeScript, REST APIs, and responsive design systems. I would love to contribute to your engineering team.');
  }

  await page.waitForTimeout(2000);

  // 7. Click Submit button
  console.log('7. Clicking Submit button...');
  const submitBtn = page.locator('input[type="submit"], button:has-text("Submit")');
  await submitBtn.click();
  console.log('Submit button clicked! Waiting 7s for server confirmation response...');
  await page.waitForTimeout(7000);

  const snippet = await page.evaluate(() => document.body ? document.body.innerText.replace(/\s+/g, ' ') : '');
  console.log('[Response Snippet]:\n', snippet.slice(0, 400));

  const isConfirmed = /thank you|application submitted|application received|submitted successfully|applied|received your application/i.test(snippet);
  if (isConfirmed) {
    console.log('🎉🎉🎉 VERSATILE DIRECT CAREER APPLICATION FULLY SUBMITTED!');
    const ssPath = 'C:\\mcp\\job-search-mcp-engine\\screenshots\\2026-10-23\\shift1\\versatileit_direct_confirmed.png';
    fs.mkdirSync(path.dirname(ssPath), { recursive: true });
    await page.screenshot({ path: ssPath, fullPage: true });
    console.log('Proof screenshot saved:', ssPath);

    // Save to File 5
    const f5Path = 'C:\\mcp\\job-search-mcp-engine\\data\\daily\\applied_todays_2026-10-22.json';
    let f5 = { date: '2026-10-23', shift: 1, total: 0, jobs: [] };
    if (fs.existsSync(f5Path)) {
      try { f5 = JSON.parse(fs.readFileSync(f5Path, 'utf8')); } catch(e){}
    }
    f5.jobs.push({
      company: 'VersatileIT',
      role: 'React.js Developer (Fresher / 0–1 Year)',
      url: url,
      channel: 'Direct Company Career Site (Naukri Redirect Follower - Slot 7)',
      proof_screenshot: ssPath,
      status: 'APPLIED_CONFIRMED',
      timestamp: new Date().toISOString()
    });
    f5.total = f5.jobs.length;
    fs.writeFileSync(f5Path, JSON.stringify(f5, null, 2), 'utf8');
    console.log('✅ File 5 Updated! Total Confirmed Applied Today:', f5.total);
    await page.close();
    console.log('Tab closed per Rule 57.');
  } else {
    console.log('⚠️ Notice: Submission response did not return expected confirmation string. Tab kept open for audit.');
  }

  process.exit(0);
}

applyVersatileDirect().catch(e => {
  console.error('Error during Versatile apply:', e);
  process.exit(1);
});
