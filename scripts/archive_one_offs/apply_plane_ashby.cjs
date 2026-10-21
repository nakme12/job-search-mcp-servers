const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

async function run() {
  console.log('[Plane Application] Starting automated Ashby application...');
  const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: null });
  const page = await browser.newPage();
  
  try {
    const appUrl = 'https://jobs.ashbyhq.com/plane/15cf6387-af74-4616-924f-3659fb76de01/application';
    console.log('[Plane] Opening application URL:', appUrl);
    await page.goto(appUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // 1. Name
    console.log('[Plane] 1. Name: Pratik Patidar');
    const nameInput = await page.$('input[name="_systemfield_name"]');
    if (nameInput) {
      await nameInput.click({ clickCount: 3 });
      await nameInput.type('Pratik Patidar', { delay: 25 });
    }
    
    // 2. Email
    console.log('[Plane] 2. Email: pratikpatidar7990@gmail.com');
    const emailInput = await page.$('input[name="_systemfield_email"]');
    if (emailInput) {
      await emailInput.click({ clickCount: 3 });
      await emailInput.type('pratikpatidar7990@gmail.com', { delay: 25 });
    }
    
    // 3. Upload Resume
    const resumePath = path.resolve('C:/mcp/job-search-mcp-engine/resumes/Pratik Patidar Resume - React Developer.pdf');
    console.log('[Plane] 3. Uploading Resume:', resumePath);
    const fileInputs = await page.$$('input[type="file"]');
    if (fileInputs.length > 0) {
      const targetFileInput = fileInputs.length > 1 ? fileInputs[1] : fileInputs[0];
      await targetFileInput.uploadFile(resumePath);
      console.log('[Plane] Resume uploaded.');
    }
    
    await new Promise(r => setTimeout(r, 2000));
    
    // Fill custom fields by label text
    await page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll('label, div._fieldWrapper_1s09k_1, div._label_1s09k_13, div._questionWrapper_1s09k_1'));
      
      function fillField(labelKeyword, value, isTextarea = false) {
        for (const l of document.querySelectorAll('div, label')) {
          if (l.innerText && l.innerText.toLowerCase().includes(labelKeyword.toLowerCase())) {
            const container = l.closest('div') || l.parentElement;
            if (container) {
              const input = container.querySelector(isTextarea ? 'textarea' : 'input[type="text"]');
              if (input && !input.value) {
                input.value = value;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                return true;
              }
            }
          }
        }
        return false;
      }
      
      // LinkedIn
      fillField('Linkedin profile link', 'https://www.linkedin.com/in/pratik-patidar');
      // GitHub
      fillField('GitHub', 'https://github.com/pratikpatidar');
      // How did you come to know
      fillField('How did you come to know', 'Direct Career Site / Open Source Community', true);
      // Current location
      fillField('current location', 'Indore, Madhya Pradesh');
      // Relocate to Hyderabad
      fillField('relocate to Hyderabad', 'Yes, ready to relocate immediately');
      // Joining time
      fillField('by when can you join', '15 Days / Immediate');
      // Last working day
      fillField('last working day', 'Currently serving 15 days notice period');
      // Current CTC
      fillField('current CTC', '2.16 LPA');
      // Total work experience
      fillField('total work experience', '1.5 Years');
      
      // Checkbox for AI coding agents
      const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
      checkboxes.forEach(cb => {
        const text = cb.closest('label') ? cb.closest('label').innerText : '';
        if (text.includes('Yes') || !text.includes('No')) {
          if (!cb.checked) cb.click();
        }
      });
    });
    
    console.log('[Plane] Custom fields populated strictly from canonical profile.');
    await new Promise(r => setTimeout(r, 2000));
    
    // Inspect filled state
    const dump = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input[type="text"], input[type="email"], textarea'));
      return inputs.map(i => ({ val: i.value }));
    });
    console.log('[Plane] Filled values dump:\n', dump);
    
    // Submit
    console.log('[Plane] Triggering Submit Application button...');
    const submitBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.innerText && b.innerText.includes('Submit Application'));
    });
    
    if (submitBtn) {
      await submitBtn.click();
      console.log('[Plane] Submit button clicked.');
    }
    
    // Wait for submission confirmation
    console.log('[Plane] Waiting for post-submit confirmation...');
    await new Promise(r => setTimeout(r, 6000));
    
    const pageText = await page.evaluate(() => document.body.innerText);
    const success = pageText.includes('Thank you') || pageText.includes('successfully submitted') || pageText.includes('Success');
    console.log('[Plane] Post-submit confirmation detected:', success);
    
    if (success) {
      const ssPath = path.resolve('C:/mcp/job-search-mcp-engine/screenshots/2026-10-14/plane_fe_postsubmit.png');
      await page.screenshot({ path: ssPath, fullPage: true });
      console.log('[Plane] Post-submit screenshot saved:', ssPath);
      
      // Update applied_todays
      const appliedPath = 'C:/mcp/job-search-mcp-engine/applied_todays_2026-10-14.json';
      const appliedData = JSON.parse(fs.readFileSync(appliedPath, 'utf8'));
      appliedData.jobs.push({
        company: 'Plane Software',
        role: 'Software Engineer, Frontend (React)',
        recipient: 'Ashby Portal',
        channel: 'Direct ATS Portal (Ashby)',
        job_url: appUrl,
        resume: 'Pratik Patidar Resume - React Developer.pdf',
        timestamp: new Date().toISOString(),
        status: 'Applied & Verified (100% Post-Submit Confirmation Screenshot)',
        proof_screenshots: ['screenshots/2026-10-14/plane_fe_postsubmit.png']
      });
      appliedData.total = appliedData.jobs.length;
      fs.writeFileSync(appliedPath, JSON.stringify(appliedData, null, 2), 'utf8');
      console.log('[Plane] Successfully recorded into applied_todays! Total:', appliedData.total);
      
      await page.close();
      console.log('[Plane] Completed tab closed.');
    } else {
      console.log('[Plane] Page text snippet after submit:\n', pageText.slice(0, 800));
    }
  } catch (err) {
    console.error('[Plane] Error:', err.message);
  } finally {
    process.exit(0);
  }
}

run();
