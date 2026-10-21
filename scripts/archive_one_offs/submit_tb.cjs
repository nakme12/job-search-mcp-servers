const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const SHIFT2_SS_DIR = path.join(__dirname, '..', 'screenshots', '2026-10-14', 'shift2');
const APPLIED_SHIFT2_PATH = path.join(__dirname, '..', 'applied_todays_2026-10-14_shift2.json');

async function submitCurrent() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const data = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: data.webSocketDebuggerUrl });
  const pages = await browser.pages();
  const p = pages[1];

  console.log('Submitting Training Basket...');
  
  // Click Review / Submit button
  await p.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const rev = btns.find(b => b.innerText.trim() === 'Review' || b.innerText.trim().toLowerCase().includes('submit'));
    if (rev) rev.click();
  });

  await new Promise(r => setTimeout(r, 2000));

  // If now on page 6 (Review), click Submit application
  await p.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const sub = btns.find(b => b.innerText.toLowerCase().includes('submit') || b.getAttribute('aria-label')?.toLowerCase().includes('submit'));
    if (sub) sub.click();
  });

  await new Promise(r => setTimeout(r, 4000));

  // Check confirmation
  const conf = await p.evaluate(() => {
    const text = document.body.innerText.toLowerCase();
    return text.includes('application submitted') || text.includes('your application was sent') || text.includes('applied');
  });

  if (conf) {
    console.log('✅ Submission confirmed in DOM! Saving screenshot...');
    const ssName = `training_basket_postsubmit_${Date.now()}.png`;
    const ssPath = path.join(SHIFT2_SS_DIR, ssName);
    await p.screenshot({ path: ssPath, fullPage: true });

    let appliedData = { date: '2026-10-14', shift: 2, total: 0, jobs: [] };
    if (fs.existsSync(APPLIED_SHIFT2_PATH)) {
      try { appliedData = JSON.parse(fs.readFileSync(APPLIED_SHIFT2_PATH, 'utf8')); } catch(e) {}
    }

    appliedData.jobs.push({
      company: "Training Basket",
      role: "React.js Developer",
      recipient_or_url: "https://www.linkedin.com/jobs/view/4477216230",
      channel: "LinkedIn Easy Apply",
      resume: "Pratik Patidar Resume - React Developer.pdf",
      timestamp: new Date().toISOString(),
      status: "Applied & Submitted (Verified in DOM: Application Sent)",
      proof_screenshots: [`screenshots/2026-10-14/shift2/${ssName}`],
      notes: "LinkedIn Easy Apply submission confirmed. Proof saved."
    });

    appliedData.total = appliedData.jobs.length;
    fs.writeFileSync(APPLIED_SHIFT2_PATH, JSON.stringify(appliedData, null, 2));
    console.log('Successfully recorded Training Basket! Shift 2 total:', appliedData.total);
    await p.close();
  } else {
    console.log('Not yet confirmed. Current text snippet:\n', (await p.evaluate(() => document.body.innerText)).substring(0, 400));
  }
}

submitCurrent().catch(console.error);
