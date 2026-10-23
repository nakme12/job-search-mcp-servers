const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

async function testHumanClick() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('jobs.ashbyhq.com/plane')) || pages[0];
  
  await page.bringToFront();
  
  // Clean up the textarea value
  await page.evaluate(() => {
    const area = document.querySelector('textarea[name="4f7971df-d94f-418a-8ae3-b15e84836e5b"]');
    if (area) {
      area.value = 'Through Plane GitHub repository and developer community';
      area.dispatchEvent(new Event('input', { bubbles: true }));
      area.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

  // Natural human cursor movement
  for (let i = 0; i < 20; i++) {
    const x = Math.floor(200 + Math.random() * 400);
    const y = Math.floor(200 + Math.random() * 300);
    await page.mouse.move(x, y, { steps: 3 });
    await new Promise(r => setTimeout(r, 40));
  }

  // Scroll to submit button
  await page.evaluate(() => {
    const btn = document.querySelector('.ashby-application-form-submit-button');
    if (btn) btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  await new Promise(r => setTimeout(r, 1000));

  console.log('Clicking Submit Application...');
  await page.evaluate(() => {
    const btn = document.querySelector('.ashby-application-form-submit-button');
    if (btn) btn.click();
  });

  await new Promise(r => setTimeout(r, 6000));
  const snippet = await page.evaluate(() => document.body ? document.body.innerText.substring(0, 300).replace(/\n+/g, ' ') : '');
  console.log('Result:\n', snippet);

  const isConfirmed = snippet.includes('Thank you') || snippet.includes('Application submitted') || snippet.includes('received your application');
  console.log('isConfirmed:', isConfirmed);

  const screenshotPath = 'C:/mcp/job-search-mcp-engine/screenshots/2026-10-23/shift1/plane_software_ashby_confirmed.png';
  fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
  await page.screenshot({ path: screenshotPath });
  console.log('Saved screenshot:', screenshotPath);

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

    console.log('PLANE APPLIED SUCCESSFULLY! Total today:', file5.total);
    await page.close();
  }

  await browser.disconnect();
}

testHumanClick().catch(console.error);
