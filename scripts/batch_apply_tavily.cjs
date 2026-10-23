const playwright = require('C:/mcp/naukri-auto-apply-engine/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const job = {
  company: 'Tavily',
  role: 'Software Engineer',
  url: 'https://jobs.ashbyhq.com/tavily/58948731-c993-4127-a723-a96b1dcd841c/application'
};

async function applyTavily() {
  console.log(`\n======================================================`);
  console.log(`[APPLYING ASHBY] ${job.company} - ${job.role}`);
  console.log(`======================================================`);

  const browser = await playwright.chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0];
  const page = await context.newPage();

  console.log('Navigating to Tavily application...');
  await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('#_systemfield_name', { timeout: 15000 });

  // 1. Name & Email
  console.log('1. Filling Name: Pratik Patidar');
  await page.locator('#_systemfield_name').fill('Pratik Patidar');

  console.log('2. Filling Email: pratikpatidar7990@gmail.com');
  await page.locator('#_systemfield_email').fill('pratikpatidar7990@gmail.com');

  // 2. LinkedIn URL
  console.log('3. Filling LinkedIn URL...');
  const li = page.locator('#\\77bb646f-341c-4a5c-b8bc-202e1b34840b');
  if (await li.count() > 0) {
    await li.fill('https://www.linkedin.com/in/pratik-patidar');
  }

  // 3. Years of Experience (1.5)
  console.log('4. Filling Years of Experience: 1.5...');
  const yoe = page.locator('#\\02ac07f5-95bc-4ef9-8dac-736b3286a35f');
  if (await yoe.count() > 0) {
    await yoe.fill('1.5');
  }

  // 4. Resume PDF
  const resumePath = 'C:/mcp/job-search-mcp-engine/resumes/Pratik Patidar Resume - MERN Full Stack.pdf';
  console.log('5. Attaching Resume PDF:', resumePath);
  await page.locator('#_systemfield_resume').setInputFiles(resumePath);
  await page.waitForTimeout(2000);

  // 5. Submit Application
  console.log('6. Clicking Submit Application button...');
  const submitBtn = page.locator('button.ashby-application-form-submit-button');
  await submitBtn.click();
  console.log('Submit button clicked! Waiting 7s for server confirmation...');
  await page.waitForTimeout(7000);

  const text = await page.evaluate(() => document.body ? document.body.innerText.replace(/\s+/g, ' ') : '');
  console.log('[Response Snippet]:\n', text.slice(0, 400));

  const isConfirmed = /thank you|application submitted|application received|submitted successfully|applied/i.test(text);
  if (isConfirmed) {
    console.log('🎉🎉🎉 TAVILY ASHBY APPLICATION FULLY SUBMITTED!');
    const ssPath = 'C:\\mcp\\job-search-mcp-engine\\screenshots\\2026-10-23\\shift1\\tavily_ashby_confirmed.png';
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

applyTavily().catch(e => {
  console.error('Error applying to Tavily:', e);
  process.exit(1);
});
