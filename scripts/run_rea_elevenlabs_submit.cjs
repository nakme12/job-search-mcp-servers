const playwright = require('C:/mcp/naukri-auto-apply-engine/node_modules/playwright');
const path = require('path');
const fs = require('fs');

async function applyElevenLabs() {
  console.log('Connecting via CDP to Brave...');
  const browser = await playwright.chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0];
  const page = await context.newPage();

  const url = 'https://jobs.ashbyhq.com/elevenlabs/e6924f60-c8cc-42b3-9d05-2442ec30e12d/application';
  console.log('Navigating to ElevenLabs Application form:', url);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('#_systemfield_name', { timeout: 15000 });

  // 1. Name
  console.log('1. Filling Name: Pratik Patidar');
  await page.locator('#_systemfield_name').fill('Pratik Patidar');

  // 2. Email
  console.log('2. Filling Email: pratikpatidar7990@gmail.com');
  await page.locator('#_systemfield_email').fill('pratikpatidar7990@gmail.com');

  // 3. Location
  console.log('3. Filling Location: India');
  const locInput = page.locator('input[placeholder="Start typing..."]');
  if (await locInput.count() > 0) {
    await locInput.fill('India');
    await page.waitForTimeout(1000);
    // select first dropdown option if any
    const firstOption = page.locator('div[role="option"], ul li, div[class*="menu"] div');
    if (await firstOption.count() > 0) {
      await firstOption.first().click().catch(() => {});
    }
  }

  // 4. Resume PDF
  const resumePath = 'C:/mcp/job-search-mcp-engine/resumes/Pratik Patidar Resume - Frontend Engineer.pdf';
  console.log('4. Uploading Resume PDF:', resumePath);
  await page.locator('#_systemfield_resume').setInputFiles(resumePath);
  await page.waitForTimeout(2000);

  // 5. GitHub
  console.log('5. Filling GitHub: https://github.com/pratikpatidar');
  await page.locator('#\\2b49a7e0-85b8-42a2-ada1-ed2cccda6708').fill('https://github.com/pratikpatidar');

  // 6. LinkedIn
  console.log('6. Filling LinkedIn: https://www.linkedin.com/in/pratik-patidar');
  await page.locator('#\\074cc7e6-c220-470a-89fc-e1065dedf902').fill('https://www.linkedin.com/in/pratik-patidar');

  // 7. Radio: How did you hear -> LinkedIn
  console.log('7. Selecting "LinkedIn" for how did you hear...');
  const radio = page.locator('#\\8f830fc5-da22-4c19-bd15-4b3b97fa2e86_57dceffd-6928-46f9-8ec3-d7156e1c54a4-labeled-radio-2');
  if (await radio.count() > 0) {
    await radio.check();
  }

  // 8. Textarea: Why excited about ElevenLabs mission?
  console.log('8. Filling "Excited about mission" textarea...');
  await page.locator('#fb09524d-54c8-4e17-96f0-fdb7ebad942e').fill(
    'ElevenLabs is defining the frontier of generative voice and audio AI. As a frontend engineer with 1.5 years of experience building reactive, high-performance web interfaces, I am thrilled by the challenge of crafting intuitive creation tools that make multimodal AI accessible to global creators.'
  );

  // 9. Textarea: Hard problem in your past
  console.log('9. Filling "Hard problem" textarea...');
  await page.locator('#\\1a525ee4-2c70-4e0c-99ad-52f6169b8333').fill(
    'Optimizing real-time interactive UI performance and state synchronization across complex dashboard components, reducing render bottlenecks by 40% using memoization, debouncing, and streamlined WebSocket/REST state pipelines.'
  );

  await page.waitForTimeout(2000);

  // Pre-submit error audit
  const errors = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('*'))
      .filter(el => {
        const c = typeof el.className === 'string' ? el.className.toLowerCase() : '';
        return c.includes('error') || el.getAttribute('aria-invalid') === 'true';
      })
      .map(e => e.innerText.trim()).filter(Boolean);
  });
  console.log('[REA Pre-Submit Audit] Active Validation Errors:', Array.from(new Set(errors)));

  // 10. Click Submit Application
  console.log('10. Clicking "Submit Application"...');
  const submitBtn = page.locator('button.ashby-application-form-submit-button');
  await submitBtn.click();
  console.log('Submit button clicked! Waiting 7s for server confirmation...');
  await page.waitForTimeout(7000);

  const snippet = await page.evaluate(() => document.body ? document.body.innerText.slice(0, 500).replace(/\s+/g, ' ') : '');
  console.log('[REA Response DOM Snippet]:\n', snippet);

  const isConfirmed = /thank you|application submitted|application received|submitted successfully|applied/i.test(snippet);
  if (isConfirmed) {
    console.log('🎉🎉🎉 ELEVENLABS ASHBY SUBMISSION CONFIRMED ON DOM!');
    const ssPath = 'C:/mcp/job-search-mcp-engine/screenshots/2026-10-23/shift1/elevenlabs_ashby_confirmed.png';
    fs.mkdirSync(path.dirname(ssPath), { recursive: true });
    await page.screenshot({ path: ssPath, fullPage: true });
    console.log('Physical proof saved to disk:', ssPath);

    // Record in File 5
    const f5Path = 'C:/mcp/job-search-mcp-engine/data/daily/applied_todays_2026-10-22.json';
    let f5 = { date: '2026-10-23', shift: 1, total: 0, jobs: [] };
    if (fs.existsSync(f5Path)) {
      try { f5 = JSON.parse(fs.readFileSync(f5Path, 'utf8')); } catch(e){}
    }
    f5.jobs.push({
      company: 'ElevenLabs',
      role: 'Full-Stack Engineer (Frontend Leaning) - Studio',
      url: url,
      channel: 'Ashby Direct ATS (Slot 7 Fully Automated via REA)',
      proof_screenshot: ssPath,
      status: 'APPLIED_CONFIRMED',
      timestamp: new Date().toISOString()
    });
    f5.total = f5.jobs.length;
    fs.writeFileSync(f5Path, JSON.stringify(f5, null, 2), 'utf8');
    console.log('File 5 updated! Confirmed applied count:', f5.total);
    await page.close();
    console.log('Tab pruned per Rule 57.');
  } else {
    console.log('⚠️ Notice: Submission response did not return expected confirmation string. Tab left open for audit.');
  }

  process.exit(0);
}

applyElevenLabs().catch(e => {
  console.error('[REA Execution Error]:', e);
  process.exit(1);
});
