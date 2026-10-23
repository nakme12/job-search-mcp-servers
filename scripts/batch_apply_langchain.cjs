const playwright = require('C:/mcp/naukri-auto-apply-engine/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const job = {
  company: 'Langchain',
  role: 'FullStack Engineer, AI Observability & Evals Platform (LangSmith)',
  url: 'https://jobs.ashbyhq.com/langchain/ddf92275-1cc3-49c0-9f25-e8ded43b07f6/application'
};

async function applyLangchain() {
  console.log(`\n======================================================`);
  console.log(`[APPLYING ASHBY] ${job.company} - ${job.role}`);
  console.log(`======================================================`);

  const browser = await playwright.chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0];
  const page = await context.newPage();

  console.log('Navigating to Langchain application...');
  await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('#_systemfield_name', { timeout: 15000 });

  // 1. Name & Email
  console.log('Filling Name: Pratik Patidar');
  await page.locator('#_systemfield_name').fill('Pratik Patidar');

  console.log('Filling Email: pratikpatidar7990@gmail.com');
  await page.locator('#_systemfield_email').fill('pratikpatidar7990@gmail.com');

  // 2. Resume PDF
  const resumePath = 'C:/mcp/job-search-mcp-engine/resumes/Pratik Patidar Resume - MERN Full Stack.pdf';
  console.log('Uploading Resume:', resumePath);
  await page.locator('#_systemfield_resume').setInputFiles(resumePath);
  await page.waitForTimeout(2000);

  // 3. GitHub & LinkedIn
  console.log('Filling GitHub...');
  const gh = page.locator('#\\6a143e3a-6f6a-45af-86bf-a72f6d878ab2');
  if (await gh.count() > 0) await gh.fill('https://github.com/pratikpatidar');

  console.log('Filling LinkedIn...');
  const li = page.locator('#\\05dc3321-d92f-48a9-99fa-a6d752e607f7');
  if (await li.count() > 0) await li.fill('https://www.linkedin.com/in/pratik-patidar');

  // 4. Fill Location / Text if present
  console.log('Checking location combobox...');
  const loc = page.locator('input[placeholder="Start typing..."]');
  if (await loc.count() > 0) {
    await loc.fill('India');
    await page.waitForTimeout(1000);
    // Trigger onSelect fiber if needed
    await page.evaluate(() => {
      const input = document.querySelector('input[placeholder="Start typing..."]');
      if (input) {
        const k = Object.keys(input).find(x => x.startsWith('__reactFiber'));
        let n = input[k];
        while (n) {
          if (n.memoizedProps && typeof n.memoizedProps.onSelect === 'function') {
            n.memoizedProps.onSelect({
              name: 'India',
              geoLocationPath: [{ providerLocationId: 'ChIJk207M_wfDTkRA64npA2A6N0' }]
            });
            break;
          }
          n = n.return;
        }
      }
    });
  }

  await page.waitForTimeout(2000);

  // 5. Submit Application
  console.log('Clicking Submit Application button...');
  const submitBtn = page.locator('button.ashby-application-form-submit-button');
  await submitBtn.click();
  console.log('Submit button clicked! Waiting 7s for confirmation response...');
  await page.waitForTimeout(7000);

  const text = await page.evaluate(() => document.body ? document.body.innerText.replace(/\s+/g, ' ') : '');
  console.log('[Response Snippet]:\n', text.slice(0, 400));

  const isConfirmed = /thank you|application submitted|application received|submitted successfully|applied/i.test(text);
  if (isConfirmed) {
    console.log('🎉🎉🎉 LANGCHAIN APPLICATION FULLY SUBMITTED!');
    const ssPath = 'C:\\mcp\\job-search-mcp-engine\\screenshots\\2026-10-23\\shift1\\langchain_ashby_confirmed.png';
    fs.mkdirSync(path.dirname(ssPath), { recursive: true });
    await page.screenshot({ path: ssPath, fullPage: true });
    console.log('Proof screenshot saved:', ssPath);

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
      channel: 'Ashby Direct ATS (Candidate 2/8)',
      proof_screenshot: ssPath,
      status: 'APPLIED_CONFIRMED',
      timestamp: new Date().toISOString()
    });
    f5.total = f5.jobs.length;
    fs.writeFileSync(f5Path, JSON.stringify(f5, null, 2), 'utf8');
    console.log('✅ File 5 updated! Total confirmed today:', f5.total);
    await page.close();
    console.log('Tab closed per Rule 57.');
  } else {
    console.log('⚠️ Status under check. Tab kept open.');
  }

  process.exit(0);
}

applyLangchain().catch(e => {
  console.error('Error applying to Langchain:', e);
  process.exit(1);
});
