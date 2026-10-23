const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

async function run() {
  console.log('[Drivetrain] Starting Lever ATS application...');
  const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: null });
  const page = await browser.newPage();
  
  try {
    const appUrl = 'https://jobs.lever.co/drivetrain/cd39cc4e-056e-444c-8c17-9f97e34ddbce/apply';
    await page.goto(appUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 2000));
    
    // 1. Resume
    const resumePath = path.resolve('C:/mcp/job-search-mcp-engine/resumes/Pratik Patidar Resume - MERN Full Stack.pdf');
    const fileInput = await page.$('input[name="resume"]');
    if (fileInput) {
      await fileInput.uploadFile(resumePath);
      console.log('[Drivetrain] Resume uploaded.');
    }
    
    await new Promise(r => setTimeout(r, 2500));
    
    // 2. Name
    const nameInput = await page.$('input[name="name"]');
    if (nameInput) {
      await nameInput.click({ clickCount: 3 });
      await nameInput.type('Pratik Patidar', { delay: 20 });
    }
    
    // 3. Email
    const emailInput = await page.$('input[name="email"]');
    if (emailInput) {
      await emailInput.click({ clickCount: 3 });
      await emailInput.type('pratikpatidar7990@gmail.com', { delay: 20 });
    }
    
    // 4. Phone
    const phoneInput = await page.$('input[name="phone"]');
    if (phoneInput) {
      await phoneInput.click({ clickCount: 3 });
      await phoneInput.type('+91 82696 47990', { delay: 20 });
    }
    
    // 5. Current location
    const locInput = await page.$('input[name="location"]');
    if (locInput) {
      await locInput.click({ clickCount: 3 });
      await locInput.type('Indore, Madhya Pradesh', { delay: 20 });
    }
    
    // 6. Current company
    const orgInput = await page.$('input[name="org"]');
    if (orgInput) {
      await orgInput.click({ clickCount: 3 });
      await orgInput.type('Freelance / Full Stack Developer', { delay: 20 });
    }
    
    // 7. LinkedIn
    const liInput = await page.$('input[name="urls[LinkedIn]"]');
    if (liInput) {
      await liInput.click({ clickCount: 3 });
      await liInput.type('https://www.linkedin.com/in/pratik-patidar', { delay: 20 });
    }
    
    console.log('[Drivetrain] Form populated strictly from canonical profile.');
    await new Promise(r => setTimeout(r, 1500));
    
    // Check if CAPTCHA iframe exists
    const hasCaptcha = await page.evaluate(() => {
      return !!document.querySelector('iframe[src*="hcaptcha"], iframe[src*="recaptcha"]');
    });
    console.log('[Drivetrain] Captcha detected on page:', hasCaptcha);
    
    // Click submit button
    const submitBtn = await page.$('#btn-submit');
    if (submitBtn) {
      await submitBtn.click();
      console.log('[Drivetrain] Submit button clicked.');
    } else {
      console.error('[Drivetrain] Submit button #btn-submit not found!');
    }
    
    await new Promise(r => setTimeout(r, 6000));
    
    const pageText = await page.evaluate(() => document.body.innerText);
    const success = pageText.includes('Thank you') || pageText.includes('Application submitted') || pageText.includes('submitted your application') || page.url().includes('thanks');
    console.log('[Drivetrain] Post-submit success detected:', success);
    
    if (success) {
      const ssPath = path.resolve('C:/mcp/job-search-mcp-engine/screenshots/2026-10-14/drivetrain_fe_postsubmit.png');
      await page.screenshot({ path: ssPath, fullPage: true });
      console.log('[Drivetrain] Post-submit screenshot saved:', ssPath);
      
      const appliedPath = 'C:/mcp/job-search-mcp-engine/applied_todays_2026-10-14.json';
      const appliedData = JSON.parse(fs.readFileSync(appliedPath, 'utf8'));
      appliedData.jobs.push({
        company: 'Drivetrain',
        role: 'Frontend Engineer',
        recipient: 'Lever Portal',
        channel: 'Direct ATS Portal (Lever)',
        job_url: appUrl,
        resume: 'Pratik Patidar Resume - MERN Full Stack.pdf',
        timestamp: new Date().toISOString(),
        status: 'Applied & Verified (100% Post-Submit Confirmation Screenshot)',
        proof_screenshots: ['screenshots/2026-10-14/drivetrain_fe_postsubmit.png']
      });
      appliedData.total = appliedData.jobs.length;
      fs.writeFileSync(appliedPath, JSON.stringify(appliedData, null, 2), 'utf8');
      console.log('[Drivetrain] Recorded into applied_todays! Total:', appliedData.total);
      
      await page.close();
      console.log('[Drivetrain] Completed tab closed.');
    } else {
      console.log('[Drivetrain] Current URL:', page.url());
      console.log('[Drivetrain] Snippet:\n', pageText.slice(0, 600));
    }
  } catch (err) {
    console.error('[Drivetrain] Error:', err.message);
  } finally {
    process.exit(0);
  }
}

run();
