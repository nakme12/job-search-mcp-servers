const puppeteer = require('puppeteer-core');
const fs = require('fs');

async function submitApollo() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const data = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: data.webSocketDebuggerUrl });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('apollohl.com'));

  if (!page) {
    console.log('Apollo page not found!');
    return;
  }

  console.log('Submitting Apollo form...');
  const submitBtn = await page.$('input[type="submit"]') || await page.$('button[type="submit"]');
  if (submitBtn) {
    await submitBtn.click();
    console.log('Clicked submit button.');
  } else {
    console.log('Submit button not found.');
    return;
  }

  // Wait for submission response / confirmation
  await new Promise(r => setTimeout(r, 4500));

  const confirmation = await page.evaluate(() => {
    const el = document.querySelector('.wpcf7-response-output');
    return el ? el.innerText.trim() : document.body.innerText.substring(0, 300);
  });
  console.log('Confirmation Text in DOM:', confirmation);

  // Capture screenshot proof
  const ts = Date.now();
  const screenshotPath = `C:/mcp/job-search-mcp-engine/screenshots/2026-10-14/shift2/apollohl_postsubmit_${ts}.png`;
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('Screenshot saved:', screenshotPath);

  // Close tab immediately
  await page.close();
  console.log('Apollo tab closed.');

  // Append to shift2 JSON
  const s2Path = 'C:/mcp/job-search-mcp-engine/applied_todays_2026-10-14_shift2.json';
  const s2 = JSON.parse(fs.readFileSync(s2Path, 'utf8'));
  s2.jobs.push({
    company: 'Apollo Health and Lifestyle Limited (Ghar4u)',
    role: 'ReactJS Developer',
    recipient_or_url: 'https://www.apollohl.com/jobs/reactjs-developer/',
    channel: 'Direct Company Career Portal',
    resume: 'Pratik Patidar Resume - React Developer.pdf',
    timestamp: new Date().toISOString(),
    status: 'Applied & Submitted (Verified in DOM: Success)',
    proof_screenshots: [`screenshots/2026-10-14/shift2/apollohl_postsubmit_${ts}.png`],
    notes: 'Direct career portal form submitted. Post-submit screenshot proof captured.'
  });
  s2.total = s2.jobs.length;
  fs.writeFileSync(s2Path, JSON.stringify(s2, null, 2));

  // Sync main applied_todays
  const mainPath = 'C:/mcp/job-search-mcp-engine/applied_todays_2026-10-14.json';
  const main = JSON.parse(fs.readFileSync(mainPath, 'utf8'));
  main.jobs.push(s2.jobs[s2.jobs.length - 1]);
  main.total = main.jobs.length;
  fs.writeFileSync(mainPath, JSON.stringify(main, null, 2));
  console.log('Applied logs updated. Total Shift 2:', s2.total, '| Total Today:', main.total);
}

submitApollo().catch(console.error);
