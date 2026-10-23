const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

async function run() {
  console.log('[Soulside AI] Starting direct Ashby application...');
  const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: null });
  const page = await browser.newPage();
  
  try {
    const appUrl = 'https://jobs.ashbyhq.com/Soulside%20AI/7cdf48ca-e4f7-40f2-9521-0368cf9d0cba/application';
    console.log('[Soulside AI] Opening application page:', appUrl);
    await page.goto(appUrl, { waitUntil: 'networkidle2', timeout: 25000 });
    
    // 1. Fill Name
    console.log('[Soulside AI] Filling Name: Pratik Patidar');
    const nameInput = await page.$('input[name="_systemfield_name"]');
    if (nameInput) {
      await nameInput.click({ clickCount: 3 });
      await nameInput.type('Pratik Patidar', { delay: 30 });
    }
    
    // 2. Fill Email
    console.log('[Soulside AI] Filling Email: pratikpatidar7990@gmail.com');
    const emailInput = await page.$('input[name="_systemfield_email"]');
    if (emailInput) {
      await emailInput.click({ clickCount: 3 });
      await emailInput.type('pratikpatidar7990@gmail.com', { delay: 30 });
    }
    
    // 3. Upload Resume
    const resumePath = path.resolve('C:/mcp/job-search-mcp-engine/resumes/Pratik Patidar Resume - MERN Full Stack.pdf');
    console.log('[Soulside AI] Uploading Resume:', resumePath);
    const fileInputs = await page.$$('input[type="file"]');
    if (fileInputs.length > 0) {
      // Pick the main resume upload input (usually the second one if first is autofill, or check parent)
      const targetFileInput = fileInputs.length > 1 ? fileInputs[1] : fileInputs[0];
      await targetFileInput.uploadFile(resumePath);
      console.log('[Soulside AI] Resume uploaded successfully.');
    }
    
    await new Promise(r => setTimeout(r, 3000));
    
    // 4. Check for any other required fields
    const inputsSummary = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('input, select, textarea'));
      return all.map(i => ({ name: i.name, type: i.type, val: i.value }));
    });
    console.log('[Soulside AI] Populated inputs:', inputsSummary);
    
    // 5. Submit application
    console.log('[Soulside AI] Submitting application...');
    const submitBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.innerText && b.innerText.includes('Submit Application'));
    });
    
    if (submitBtn) {
      await submitBtn.click();
      console.log('[Soulside AI] Submit button clicked.');
    } else {
      console.error('[Soulside AI] Submit button not found!');
      return;
    }
    
    // 6. Wait for confirmation
    console.log('[Soulside AI] Waiting for post-submit confirmation...');
    await new Promise(r => setTimeout(r, 6000));
    
    const pageContent = await page.evaluate(() => document.body.innerText);
    const isSubmitted = pageContent.includes('Thank you') || pageContent.includes('Application Submitted') || pageContent.includes('received your application');
    console.log('[Soulside AI] Confirmation detected:', isSubmitted);
    
    if (isSubmitted) {
      const ssPath = path.resolve('C:/mcp/job-search-mcp-engine/screenshots/2026-10-14/soulside_ai_postsubmit.png');
      await page.screenshot({ path: ssPath, fullPage: true });
      console.log('[Soulside AI] Post-submit screenshot saved:', ssPath);
      
      // Update applied_todays_2026-10-14.json
      const appliedPath = 'C:/mcp/job-search-mcp-engine/applied_todays_2026-10-14.json';
      const appliedData = JSON.parse(fs.readFileSync(appliedPath, 'utf8'));
      appliedData.jobs.push({
        company: 'Soulside AI',
        role: 'Frontend Engineer (India/Remote)',
        recipient: 'Ashby Portal',
        channel: 'Direct ATS Portal (Ashby)',
        job_url: appUrl,
        resume: 'Pratik Patidar Resume - MERN Full Stack.pdf',
        timestamp: new Date().toISOString(),
        status: 'Applied & Verified (100% Post-Submit Confirmation Screenshot)',
        proof_screenshots: ['screenshots/2026-10-14/soulside_ai_postsubmit.png']
      });
      appliedData.total = appliedData.jobs.length;
      fs.writeFileSync(appliedPath, JSON.stringify(appliedData, null, 2), 'utf8');
      console.log('[Soulside AI] Successfully recorded into applied_todays_2026-10-14.json! Total now:', appliedData.total);
      
      await page.close();
      console.log('[Soulside AI] Completed tab closed.');
    } else {
      console.log('[Soulside AI] Body text after submit snippet:\n', pageContent.slice(0, 800));
    }
  } catch (err) {
    console.error('[Soulside AI] Error:', err.message);
  } finally {
    process.exit(0);
  }
}

run();
