const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(x => x.url().includes('smartrecruiters.com'));

  if (!page) {
    console.error('SmartRecruiters tab not found');
    await browser.disconnect();
    return;
  }

  await page.bringToFront();

  // Scroll to bottom and click Submit span/button
  console.log('Clicking the Submit element...');
  const clicked = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('*'));
    const target = all.find(el => (el.innerText || '').trim().toLowerCase() === 'submit');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.click();
      return target.tagName;
    }
    return null;
  });
  console.log('Clicked element tag:', clicked);
  await sleep(6000);

  // Check confirmation
  const res = await page.evaluate(() => {
    const text = document.body.innerText.toLowerCase();
    const isConfirmed = text.includes('thank you') || text.includes('application submitted') || text.includes('received') || text.includes('application sent');
    return { isConfirmed, title: document.title, currentUrl: window.location.href };
  });

  console.log('Post-Click Status:', JSON.stringify(res, null, 2));

  // Save full screenshot
  const ssPath = 'C:/mcp/job-search-mcp-engine/screenshots/2026-10-21/shift2/Endeavor_IT_Solution_Confirmed.png';
  await page.screenshot({ path: ssPath, fullPage: true });
  console.log('Screenshot updated at:', ssPath);

  if (res.isConfirmed) {
    const f5Path = 'C:/mcp/job-search-mcp-engine/applied_todays_2026-10-21.json';
    const f5 = JSON.parse(fs.readFileSync(f5Path, 'utf8'));
    f5.jobs.push({
      id: 'endeavor_it_' + Date.now(),
      company: 'Endeavor IT Solution',
      role: 'Front end Developer (Fresher)',
      location: 'Indore, MP',
      url: 'https://jobs.smartrecruiters.com/EndeavorITSolution/99740233-openings-for-front-end-developer-fresher-',
      channel: 'Direct ATS / SmartRecruiters',
      status: 'CONFIRMED_SUBMITTED',
      applied_at: new Date().toISOString(),
      confirmation_screenshot: ssPath,
      resume_used: 'Pratik Patidar Resume - Frontend Engineer.pdf'
    });
    f5.total = f5.jobs.length;
    f5.updated_at = new Date().toISOString();
    fs.writeFileSync(f5Path, JSON.stringify(f5, null, 2), 'utf8');
    console.log('✅ RECORDED IN FILE 5!');
  }

  await browser.disconnect();
})();
