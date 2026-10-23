const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

async function clickSubmitDirect() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('jobs.ashbyhq.com/plane')) || pages[0];
  
  console.log('Clicking .ashby-application-form-submit-button directly...');
  const btn = await page.$('.ashby-application-form-submit-button');
  if (btn) {
    await btn.click();
    console.log('Clicked! Waiting 6s for network / confirmation...');
    await new Promise(r => setTimeout(r, 6000));
    const text = await page.evaluate(() => document.body ? document.body.innerText : '');
    const isConfirmed = text.includes('Thank you') || text.includes('Application submitted') || text.includes('received your application');
    console.log('isConfirmed:', isConfirmed);

    const screenshotPath = 'C:/mcp/job-search-mcp-engine/screenshots/2026-10-23/shift1/plane_software_ashby_confirmed.png';
    fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
    await page.screenshot({ path: screenshotPath });
    console.log('Screenshot saved to:', screenshotPath);

    if (isConfirmed) {
      const file5Path = 'C:/mcp/job-search-mcp-engine/data/daily/applied_todays_2026-10-23.json';
      const file5 = JSON.parse(fs.readFileSync(file5Path, 'utf8'));
      file5.jobs.push({
        company: 'Plane Software, Inc.',
        role: 'Software Engineer, Frontend (React)',
        url: 'https://jobs.ashbyhq.com/plane/15cf6387-af74-4616-924f-3659fb76de01/application',
        channel: 'Ashby Direct ATS (Candidate #9 Confirmed)',
        proof_screenshot: screenshotPath,
        status: 'APPLIED_CONFIRMED',
        timestamp: new Date().toISOString()
      });
      file5.total = file5.jobs.length;
      fs.writeFileSync(file5Path, JSON.stringify(file5, null, 2), 'utf8');

      // Remove from skipped list
      const skippedPath = 'C:/mcp/job-search-mcp-engine/data/daily/already_applied_or_skipped_todays_2026-10-23.json';
      let skipped = JSON.parse(fs.readFileSync(skippedPath, 'utf8'));
      skipped = skipped.filter(j => j.company !== 'Plane Software, Inc.');
      fs.writeFileSync(skippedPath, JSON.stringify(skipped, null, 2), 'utf8');

      console.log('Successfully recorded Plane Software! Total applied today:', file5.total);
      await page.close();
    } else {
      console.log('DOM Snippet:\n', text.substring(0, 400).replace(/\n+/g, ' '));
    }
  } else {
    console.log('Submit button not found!');
  }
  await browser.disconnect();
}

clickSubmitDirect().catch(console.error);
