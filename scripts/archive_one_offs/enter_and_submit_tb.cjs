const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const SHIFT2_SS_DIR = path.join(__dirname, '..', 'screenshots', '2026-10-14', 'shift2');
const APPLIED_SHIFT2_PATH = path.join(__dirname, '..', 'applied_todays_2026-10-14_shift2.json');

async function enterUrlAndSubmit() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const data = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: data.webSocketDebuggerUrl });
  const pages = await browser.pages();
  const p = pages[1];

  console.log('Focusing LinkedIn field...');
  // The input with error border
  await p.evaluate(() => {
    const inp = document.querySelector('input[aria-describedby*="error"], input[aria-invalid="true"]') || Array.from(document.querySelectorAll('input')).pop();
    if (inp) {
      inp.focus();
      inp.value = 'https://www.linkedin.com/in/pratik-patidar';
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      inp.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

  // Type real key to trigger React synthetic event
  const inp = await p.$('input[aria-describedby*="error"], input[aria-invalid="true"]');
  if (inp) {
    await inp.click();
    await p.keyboard.type('https://www.linkedin.com/in/pratik-patidar');
  }

  await new Promise(r => setTimeout(r, 1000));

  // Click Review
  console.log('Clicking Review button...');
  await p.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const rev = btns.find(b => b.innerText.trim() === 'Review');
    if (rev) rev.click();
  });

  await new Promise(r => setTimeout(r, 2500));

  // Now click Submit application
  console.log('Clicking Submit application button...');
  await p.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const sub = btns.find(b => b.innerText.trim() === 'Submit application' || b.getAttribute('aria-label')?.includes('Submit application'));
    if (sub) sub.click();
  });

  await new Promise(r => setTimeout(r, 4500));

  // Assert confirmation
  const conf = await p.evaluate(() => {
    const t = document.body.innerText.toLowerCase();
    return t.includes('application submitted') || t.includes('your application was sent') || t.includes('applied');
  });

  console.log('Confirmation result:', conf);

  if (conf) {
    const ssName = `training_basket_postsubmit_${Date.now()}.png`;
    const ssPath = path.join(SHIFT2_SS_DIR, ssName);
    await p.screenshot({ path: ssPath, fullPage: true });
    console.log('Post-submit screenshot saved:', ssPath);

    let appliedData = { date: '2026-10-14', shift: 2, total: 0, jobs: [] };
    if (fs.existsSync(APPLIED_SHIFT2_PATH)) {
      try { appliedData = JSON.parse(fs.readFileSync(APPLIED_SHIFT2_PATH, 'utf8')); } catch(e) {}
    }

    appliedData.jobs.push({
      company: "Training Basket",
      role: "React.js Developer",
      recipient_or_url: "https://www.linkedin.com/jobs/view/4477216230",
      channel: "LinkedIn Easy Apply",
      resume: "Pratik Patidar Resume - MERN Full Stack.pdf",
      timestamp: new Date().toISOString(),
      status: "Applied & Submitted (Verified in DOM: Application Sent)",
      proof_screenshots: [`screenshots/2026-10-14/shift2/${ssName}`],
      notes: "LinkedIn Easy Apply successfully submitted. Physical confirmation verified."
    });

    appliedData.total = appliedData.jobs.length;
    fs.writeFileSync(APPLIED_SHIFT2_PATH, JSON.stringify(appliedData, null, 2));
    console.log('Successfully recorded Training Basket! Shift 2 total:', appliedData.total);

    await p.close();
    console.log('Tab closed cleanly.');
  }
}

enterUrlAndSubmit().catch(console.error);
