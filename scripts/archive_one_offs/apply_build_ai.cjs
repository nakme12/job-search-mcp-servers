const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

async function run() {
  console.log('[Build AI] Starting Ashby application...');
  const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: null });
  const page = await browser.newPage();
  
  try {
    const appUrl = 'https://jobs.ashbyhq.com/build-ai/6c6e4334-8219-49cc-926e-a5289cf95432/application';
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
      console.log('[Build AI] Resume uploaded.');
    }
    
    await new Promise(r => setTimeout(r, 2000));
    
    // Fill LinkedIn and comments
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
      inputs.forEach(i => {
        const text = i.closest('div') ? i.closest('div').innerText : '';
        if (text.includes('LinkedIn') || text.includes('Homepage')) {
          i.value = 'https://www.linkedin.com/in/pratik-patidar';
          i.dispatchEvent(new Event('input', { bubbles: true }));
          i.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      
      const textareas = Array.from(document.querySelectorAll('textarea'));
      textareas.forEach(t => {
        if (!t.value) {
          t.value = 'Full Stack Developer with 1.5 years experience in building web applications using React.js, Node.js, Express, and REST APIs. Ready to join in 15 days.';
          t.dispatchEvent(new Event('input', { bubbles: true }));
          t.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    });
    
    console.log('[Build AI] Form populated.');
    await new Promise(r => setTimeout(r, 1500));
    
    // Submit
    const submitBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.innerText && b.innerText.includes('Submit Application'));
    });
    
    if (submitBtn) {
      await submitBtn.click();
      console.log('[Build AI] Submit button clicked.');
    }
    
    await new Promise(r => setTimeout(r, 6000));
    
    const text = await page.evaluate(() => document.body.innerText);
    const success = text.includes('Success') || text.includes('successfully submitted') || text.includes('Thank you');
    console.log('[Build AI] Success detected:', success);
    
    if (success) {
      const ssPath = path.resolve('C:/mcp/job-search-mcp-engine/screenshots/2026-10-14/build_ai_postsubmit.png');
      await page.screenshot({ path: ssPath, fullPage: true });
      console.log('[Build AI] Saved screenshot:', ssPath);
      
      const appliedPath = 'C:/mcp/job-search-mcp-engine/applied_todays_2026-10-14.json';
      const appliedData = JSON.parse(fs.readFileSync(appliedPath, 'utf8'));
      appliedData.jobs.push({
        company: 'Build AI',
        role: 'Software Engineer, India',
        recipient: 'Ashby Portal',
        channel: 'Direct ATS Portal (Ashby)',
        job_url: appUrl,
        resume: 'Pratik Patidar Resume - MERN Full Stack.pdf',
        timestamp: new Date().toISOString(),
        status: 'Applied & Verified (100% Post-Submit Confirmation Screenshot)',
        proof_screenshots: ['screenshots/2026-10-14/build_ai_postsubmit.png']
      });
      appliedData.total = appliedData.jobs.length;
      fs.writeFileSync(appliedPath, JSON.stringify(appliedData, null, 2), 'utf8');
      console.log('[Build AI] Recorded into applied_todays! Total:', appliedData.total);
      
      await page.close();
      console.log('[Build AI] Tab closed.');
    } else {
      console.log('[Build AI] Snippet:\n', text.slice(0, 800));
    }
  } catch (err) {
    console.error('[Build AI] Error:', err.message);
  } finally {
    process.exit(0);
  }
}

run();
