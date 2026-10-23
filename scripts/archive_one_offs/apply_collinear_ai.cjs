const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

async function run() {
  console.log('[Collinear AI] Starting Ashby application...');
  const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: null });
  const page = await browser.newPage();
  
  try {
    const appUrl = 'https://jobs.ashbyhq.com/collinear-ai/80442b09-b40b-47f5-a6ec-64a6ab042ff5/application';
    await page.goto(appUrl, { waitUntil: 'networkidle2', timeout: 25000 });
    
    // Name
    const nameInput = await page.$('input[name="_systemfield_name"]');
    if (nameInput) {
      await nameInput.click({ clickCount: 3 });
      await nameInput.type('Pratik Patidar', { delay: 25 });
    }
    
    // Email
    const emailInput = await page.$('input[name="_systemfield_email"]');
    if (emailInput) {
      await emailInput.click({ clickCount: 3 });
      await emailInput.type('pratikpatidar7990@gmail.com', { delay: 25 });
    }
    
    // Resume
    const resumePath = path.resolve('C:/mcp/job-search-mcp-engine/resumes/Pratik Patidar Resume - MERN Full Stack.pdf');
    const fileInputs = await page.$$('input[type="file"]');
    if (fileInputs.length > 0) {
      const targetFileInput = fileInputs.length > 1 ? fileInputs[1] : fileInputs[0];
      await targetFileInput.uploadFile(resumePath);
      console.log('[Collinear AI] Resume uploaded.');
    }
    
    await new Promise(r => setTimeout(r, 2000));
    
    // Fill custom fields
    const availInput = await page.$('input[name="05d7b468-9496-46bc-8661-04d8f30c7ba0"]');
    if (availInput) {
      await availInput.click({ clickCount: 3 });
      await availInput.type('15 Days / Immediate Joiner', { delay: 20 });
    }
    
    const exciteInput = await page.$('input[name="dfe39d24-e268-4f0d-8cc1-de8847db4024"]');
    if (exciteInput) {
      await exciteInput.click({ clickCount: 3 });
      await exciteInput.type('Passionate about modern full-stack web engineering, React/Next.js architectures, and scalable intelligent systems.', { delay: 15 });
    }
    
    console.log('[Collinear AI] Fields populated.');
    await new Promise(r => setTimeout(r, 1500));
    
    // Submit
    const submitBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.innerText && b.innerText.includes('Submit Application'));
    });
    
    if (submitBtn) {
      await submitBtn.click();
      console.log('[Collinear AI] Submit button clicked.');
    }
    
    await new Promise(r => setTimeout(r, 6000));
    
    const text = await page.evaluate(() => document.body.innerText);
    const success = text.includes('Success') || text.includes('successfully submitted') || text.includes('Thank you');
    console.log('[Collinear AI] Success detected:', success);
    
    if (success) {
      const ssPath = path.resolve('C:/mcp/job-search-mcp-engine/screenshots/2026-10-14/collinear_ai_postsubmit.png');
      await page.screenshot({ path: ssPath, fullPage: true });
      console.log('[Collinear AI] Saved screenshot:', ssPath);
      
      const appliedPath = 'C:/mcp/job-search-mcp-engine/applied_todays_2026-10-14.json';
      const appliedData = JSON.parse(fs.readFileSync(appliedPath, 'utf8'));
      appliedData.jobs.push({
        company: 'Collinear AI',
        role: 'MTS - Engineering (India)',
        recipient: 'Ashby Portal',
        channel: 'Direct ATS Portal (Ashby)',
        job_url: appUrl,
        resume: 'Pratik Patidar Resume - MERN Full Stack.pdf',
        timestamp: new Date().toISOString(),
        status: 'Applied & Verified (100% Post-Submit Confirmation Screenshot)',
        proof_screenshots: ['screenshots/2026-10-14/collinear_ai_postsubmit.png']
      });
      appliedData.total = appliedData.jobs.length;
      fs.writeFileSync(appliedPath, JSON.stringify(appliedData, null, 2), 'utf8');
      console.log('[Collinear AI] Recorded Collinear AI! Total:', appliedData.total);
      
      await page.close();
      console.log('[Collinear AI] Tab closed.');
    } else {
      console.log('[Collinear AI] Snippet:\n', text.slice(0, 600));
    }
  } catch (err) {
    console.error('[Collinear AI] Error:', err.message);
  } finally {
    process.exit(0);
  }
}

run();
