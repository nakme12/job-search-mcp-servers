const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

async function run() {
  console.log('[UptimeAI] Starting Ashby application...');
  const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: null });
  const page = await browser.newPage();
  
  try {
    const appUrl = 'https://jobs.ashbyhq.com/uptimeai/1554854a-7281-4540-af3d-c6ae60464914/application';
    await page.goto(appUrl, { waitUntil: 'networkidle2', timeout: 25000 });
    
    // Name
    const nameInput = await page.$('input[name="_systemfield_name"]');
    if (nameInput) {
      await nameInput.click({ clickCount: 3 });
      await nameInput.type('Pratik Patidar', { delay: 20 });
    }
    
    // Email
    const emailInput = await page.$('input[name="_systemfield_email"]');
    if (emailInput) {
      await emailInput.click({ clickCount: 3 });
      await emailInput.type('pratikpatidar7990@gmail.com', { delay: 20 });
    }
    
    // Resume
    const resumePath = path.resolve('C:/mcp/job-search-mcp-engine/resumes/Pratik Patidar Resume - MERN Full Stack.pdf');
    const fileInputs = await page.$$('input[type="file"]');
    if (fileInputs.length > 0) {
      const targetFileInput = fileInputs.length > 1 ? fileInputs[1] : fileInputs[0];
      await targetFileInput.uploadFile(resumePath);
      console.log('[UptimeAI] Resume uploaded.');
    }
    
    await new Promise(r => setTimeout(r, 2000));
    
    // Submit
    const submitBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.innerText && b.innerText.includes('Submit Application'));
    });
    
    if (submitBtn) {
      await submitBtn.click();
      console.log('[UptimeAI] Submit button clicked.');
    }
    
    await new Promise(r => setTimeout(r, 6000));
    
    const text = await page.evaluate(() => document.body.innerText);
    const success = text.includes('Success') || text.includes('successfully submitted') || text.includes('Thank you');
    console.log('[UptimeAI] Success detected:', success);
    
    if (success) {
      const ssPath = path.resolve('C:/mcp/job-search-mcp-engine/screenshots/2026-10-14/uptimeai_postsubmit.png');
      await page.screenshot({ path: ssPath, fullPage: true });
      console.log('[UptimeAI] Saved screenshot:', ssPath);
      
      const appliedPath = 'C:/mcp/job-search-mcp-engine/applied_todays_2026-10-14.json';
      const appliedData = JSON.parse(fs.readFileSync(appliedPath, 'utf8'));
      appliedData.jobs.push({
        company: 'UptimeAI',
        role: 'Full stack Developer (MEAN/MERN Stack)',
        recipient: 'Ashby Portal',
        channel: 'Direct ATS Portal (Ashby)',
        job_url: appUrl,
        resume: 'Pratik Patidar Resume - MERN Full Stack.pdf',
        timestamp: new Date().toISOString(),
        status: 'Applied & Verified (100% Post-Submit Confirmation Screenshot)',
        proof_screenshots: ['screenshots/2026-10-14/uptimeai_postsubmit.png']
      });
      appliedData.total = appliedData.jobs.length;
      fs.writeFileSync(appliedPath, JSON.stringify(appliedData, null, 2), 'utf8');
      console.log('[UptimeAI] Recorded into applied_todays! Total:', appliedData.total);
      
      await page.close();
      console.log('[UptimeAI] Tab closed.');
    } else {
      console.log('[UptimeAI] Snippet:\n', text.slice(0, 600));
    }
  } catch (err) {
    console.error('[UptimeAI] Error:', err.message);
  } finally {
    process.exit(0);
  }
}

run();
