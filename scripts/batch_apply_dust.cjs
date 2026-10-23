const playwright = require('C:/mcp/naukri-auto-apply-engine/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const job = {
  company: 'Dust',
  role: 'Software Engineer',
  url: 'https://jobs.ashbyhq.com/dust/ec0ae613-e480-4d93-b89f-1d6a89db9766/application'
};

async function applyDust() {
  console.log(`\n======================================================`);
  console.log(`[APPLYING ASHBY CANDIDATE] ${job.company} - ${job.role}`);
  console.log(`======================================================`);

  const browser = await playwright.chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0];
  const page = await context.newPage();

  console.log('Navigating to Dust application form...');
  await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('#_systemfield_name', { timeout: 15000 });

  // 1. Full Name
  console.log('1. Filling Full Name: Pratik Patidar');
  await page.locator('#_systemfield_name').fill('Pratik Patidar');

  // 2. Email
  console.log('2. Filling Email: pratikpatidar7990@gmail.com');
  await page.locator('#_systemfield_email').fill('pratikpatidar7990@gmail.com');

  // 3. Resume PDF
  const resumePath = 'C:/mcp/job-search-mcp-engine/resumes/Pratik Patidar Resume - MERN Full Stack.pdf';
  console.log('3. Attaching Resume PDF:', resumePath);
  await page.locator('#_systemfield_resume').setInputFiles(resumePath);
  await page.waitForTimeout(2000);

  // 4. Phone
  console.log('4. Filling Phone: +918269647990');
  const phone = page.locator('#\\8a9d7784-0637-46b2-af0a-1b9fa02af9ff');
  if (await phone.count() > 0) await phone.fill('+918269647990');

  // 5. LinkedIn
  console.log('5. Filling LinkedIn...');
  const li = page.locator('#\\f29c8858-bdb2-413f-9fa5-8887480ec4ac');
  if (await li.count() > 0) await li.fill('https://www.linkedin.com/in/pratik-patidar');

  // 6. Showcase links (GitHub / Portfolio)
  console.log('6. Filling Showcase links...');
  const showcase = page.locator('#\\0d1ab9f3-b58a-4391-ad32-725745de4962');
  if (await showcase.count() > 0) await showcase.fill('https://github.com/pratikpatidar , https://pratik-portfolio-nine-orcin.vercel.app');

  // 7. Compensation Expectations (465000 / 4.65 LPA)
  console.log('7. Filling Compensation: 465000');
  const comp = page.locator('#\\dbae9486-b1c9-4dae-a763-6c82012469e8');
  if (await comp.count() > 0) await comp.fill('465000');

  // 8. Why do you want to join Dust?
  console.log('8. Filling Why Dust textarea...');
  const whyDust = page.locator('#\\01483165-3986-482b-9a5a-631d8530151c');
  if (await whyDust.count() > 0) {
    await whyDust.fill('I am deeply excited by Dust mission to build intelligent connected AI assistants that amplify team productivity. With 1.5 years of experience building scalable full-stack applications with React, Next.js, TypeScript, and modern API architectures, I am eager to contribute to robust, user-centric AI workflows.');
  }

  // 9. Data consent checkbox
  console.log('9. Checking Data Consent checkbox...');
  const consent = page.locator('#\\b421de1e-5f3c-4ba7-bf50-1b68aabc1d4e__systemfield_data_consent_ack-labeled-checkbox-0');
  if (await consent.count() > 0) {
    await consent.check();
  }

  await page.waitForTimeout(2000);

  // 10. Submit Application
  console.log('10. Clicking Submit Application button...');
  const submitBtn = page.locator('button.ashby-application-form-submit-button');
  await submitBtn.click();
  console.log('Submit button clicked! Waiting 7s for confirmation response...');
  await page.waitForTimeout(7000);

  const text = await page.evaluate(() => document.body ? document.body.innerText.replace(/\s+/g, ' ') : '');
  console.log('[Response Snippet]:\n', text.slice(0, 400));

  const isConfirmed = /thank you|application submitted|application received|submitted successfully|applied/i.test(text);
  if (isConfirmed) {
    console.log('🎉🎉🎉 DUST APPLICATION FULLY CONFIRMED & SUBMITTED!');
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
      company: job.company,
      role: job.role,
      url: job.url,
      channel: 'Ashby Direct ATS',
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

applyDust().catch(e => {
  console.error('Error applying to Dust:', e);
  process.exit(1);
});
