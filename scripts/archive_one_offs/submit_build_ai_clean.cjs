const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

async function run() {
  const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('jobs.ashbyhq.com/build-ai'));
  if (!page) {
    console.log('Tab not found');
    process.exit(0);
  }
  
  // Clear g-recaptcha-response & fill LinkedIn
  await page.evaluate(() => {
    const rc = document.querySelector('textarea[name="g-recaptcha-response"]');
    if (rc) rc.value = '';
    
    const li = document.querySelector('input[name="d8f45615-2a98-4dd4-be24-0a58ae600b0b"]');
    if (li) {
      li.value = 'https://www.linkedin.com/in/pratik-patidar';
      li.dispatchEvent(new Event('input', { bubbles: true }));
      li.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  
  console.log('Fixed fields.');
  await new Promise(r => setTimeout(r, 1000));
  
  // Click submit
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.includes('Submit Application'));
    if (btn) btn.click();
  });
  console.log('Clicked submit.');
  
  await new Promise(r => setTimeout(r, 6000));
  
  const text = await page.evaluate(() => document.body.innerText);
  const success = text.includes('Success') || text.includes('successfully submitted') || text.includes('Thank you');
  console.log('Success detected:', success);
  
  if (success) {
    const ssPath = path.resolve('C:/mcp/job-search-mcp-engine/screenshots/2026-10-14/build_ai_postsubmit.png');
    await page.screenshot({ path: ssPath, fullPage: true });
    console.log('Saved screenshot:', ssPath);
    
    const appliedPath = 'C:/mcp/job-search-mcp-engine/applied_todays_2026-10-14.json';
    const appliedData = JSON.parse(fs.readFileSync(appliedPath, 'utf8'));
    appliedData.jobs.push({
      company: 'Build AI',
      role: 'Software Engineer, India',
      recipient: 'Ashby Portal',
      channel: 'Direct ATS Portal (Ashby)',
      job_url: 'https://jobs.ashbyhq.com/build-ai/6c6e4334-8219-49cc-926e-a5289cf95432/application',
      resume: 'Pratik Patidar Resume - MERN Full Stack.pdf',
      timestamp: new Date().toISOString(),
      status: 'Applied & Verified (100% Post-Submit Confirmation Screenshot)',
      proof_screenshots: ['screenshots/2026-10-14/build_ai_postsubmit.png']
    });
    appliedData.total = appliedData.jobs.length;
    fs.writeFileSync(appliedPath, JSON.stringify(appliedData, null, 2), 'utf8');
    console.log('Recorded Build AI! Total:', appliedData.total);
    
    await page.close();
    console.log('Tab closed.');
  } else {
    console.log('Snippet:\n', text.slice(0, 600));
  }
  process.exit(0);
}

run();
