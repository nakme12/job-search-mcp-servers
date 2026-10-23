const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

async function run() {
  console.log('[Plane Submit] Connecting to existing tab...');
  const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('jobs.ashbyhq.com/plane'));
  if (!page) {
    console.error('Plane tab not found!');
    process.exit(1);
  }
  
  const answers = {
    "c0f773f9-1edf-46c7-b4a1-ff82237ba75d": "https://www.linkedin.com/in/pratik-patidar",
    "7365ccc8-6643-45a1-9369-4a21bf3a15c2": "https://github.com/pratikpatidar",
    "4f7971df-d94f-418a-8ae3-b15e84836e5b": "Direct Career Site / Open Source Community",
    "31de3c24-9062-4ded-b409-aed6e05f94d1": "Indore, Madhya Pradesh",
    "69e6b652-c867-4fd6-b8e3-0dcd393b451e": "Yes, ready to relocate immediately",
    "63edbd32-3b07-4bd0-bc53-7884144ed51c": "15 Days",
    "dce1118e-11e5-4bf5-a4c8-e92ee8d36fe7": "Currently serving notice period (available in 15 days)",
    "81c588bf-3471-4f09-9872-41c08f5d1ff0": "2.16 LPA",
    "726caa52-a0ca-4842-a72a-eee829dad928": "1.5 Years"
  };
  
  for (const [name, val] of Object.entries(answers)) {
    const el = await page.$(`[name="${name}"]`);
    if (el) {
      await el.click({ clickCount: 3 });
      await el.type(val, { delay: 15 });
      console.log(`[Plane] Filled ${name} -> ${val}`);
    }
  }
  
  // Check AI tools checkbox (Yes)
  const cb = await page.$('input[name="90a99a97-776e-4822-a8ed-e45059f212d1"]');
  if (cb) {
    const checked = await page.evaluate(el => el.checked, cb);
    if (!checked) {
      await cb.click();
      console.log('[Plane] Checked AI experience checkbox.');
    }
  }
  
  await new Promise(r => setTimeout(r, 1500));
  
  // Submit Application
  console.log('[Plane] Submitting form...');
  const submitBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    return btns.find(b => b.innerText && b.innerText.includes('Submit Application'));
  });
  
  if (submitBtn) {
    await submitBtn.click();
    console.log('[Plane] Clicked Submit button.');
  }
  
  console.log('[Plane] Waiting 6 seconds for confirmation...');
  await new Promise(r => setTimeout(r, 6000));
  
  const text = await page.evaluate(() => document.body.innerText);
  const success = text.includes('Success') || text.includes('successfully submitted') || text.includes('Thank you');
  console.log('[Plane] Success detected:', success);
  
  if (success) {
    const ssPath = path.resolve('C:/mcp/job-search-mcp-engine/screenshots/2026-10-14/plane_fe_postsubmit.png');
    await page.screenshot({ path: ssPath, fullPage: true });
    console.log('[Plane] Saved post-submit screenshot:', ssPath);
    
    const appliedPath = 'C:/mcp/job-search-mcp-engine/applied_todays_2026-10-14.json';
    const appliedData = JSON.parse(fs.readFileSync(appliedPath, 'utf8'));
    appliedData.jobs.push({
      company: 'Plane Software',
      role: 'Software Engineer, Frontend (React)',
      recipient: 'Ashby Portal',
      channel: 'Direct ATS Portal (Ashby)',
      job_url: 'https://jobs.ashbyhq.com/plane/15cf6387-af74-4616-924f-3659fb76de01/application',
      resume: 'Pratik Patidar Resume - MERN Full Stack.pdf',
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
    console.log('[Plane] Snippet:\n', text.slice(0, 800));
  }
  process.exit(0);
}

run();
