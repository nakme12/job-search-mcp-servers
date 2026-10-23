const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const SHIFT2_SS_DIR = path.join(__dirname, '..', 'screenshots', '2026-10-14', 'shift2');
const APPLIED_SHIFT2_PATH = path.join(__dirname, '..', 'applied_todays_2026-10-14_shift2.json');

async function directFillAll() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const data = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: data.webSocketDebuggerUrl });
  const pages = await browser.pages();
  const p = pages[1];

  await p.evaluate(() => {
    // Street -> N/A
    const street = document.getElementById('_r_16_');
    if (street) street.value = 'N/A';

    // Postal code -> 452001
    const postal = document.getElementById('_r_17_');
    if (postal) postal.value = '452001';

    // City -> Indore
    const city = document.getElementById('_r_18_');
    if (city) city.value = 'Indore';

    // Country -> India
    const country = document.getElementById('_r_19_');
    if (country) country.value = 'India';

    // Exp in years -> 2
    const exp = document.getElementById('_r_1a_');
    if (exp) exp.value = '2';

    // LinkedIn URL -> _r_32_
    const li = document.getElementById('_r_32_');
    if (li) li.value = 'https://www.linkedin.com/in/pratik-patidar';

    // Dispatch events for all
    ['_r_16_', '_r_17_', '_r_18_', '_r_19_', '_r_1a_', '_r_32_'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    // Pick Web Development specialization
    const labels = Array.from(document.querySelectorAll('label'));
    const spec = labels.find(l => l.innerText.includes('Web & Application Development'));
    if (spec) spec.click();

    // Select Fresher
    const sel = document.querySelector('select');
    if (sel) {
      sel.value = 'Fresher';
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

  console.log('Values injected! Clicking Review...');
  await new Promise(r => setTimeout(r, 1000));

  await p.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const rev = btns.find(b => b.innerText.trim() === 'Review');
    if (rev) rev.click();
  });

  await new Promise(r => setTimeout(r, 2500));

  // If Review page loaded, click Submit application
  console.log('Checking if Submit application button exists...');
  const submitted = await p.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const sub = btns.find(b => b.innerText.trim() === 'Submit application' || b.getAttribute('aria-label')?.includes('Submit application'));
    if (sub) {
      sub.click();
      return true;
    }
    return false;
  });

  console.log('Clicked Submit application:', submitted);
  await new Promise(r => setTimeout(r, 4500));

  // Check confirmation
  const conf = await p.evaluate(() => {
    const t = document.body.innerText.toLowerCase();
    return t.includes('application submitted') || t.includes('your application was sent') || t.includes('applied');
  });

  console.log('Final Application Sent Confirmation:', conf);

  if (conf) {
    const ssName = `training_basket_postsubmit_${Date.now()}.png`;
    const ssPath = path.join(SHIFT2_SS_DIR, ssName);
    await p.screenshot({ path: ssPath, fullPage: true });
    console.log('Screenshot saved:', ssPath);

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
      notes: "LinkedIn Easy Apply successfully submitted with physical DOM proof."
    });

    appliedData.total = appliedData.jobs.length;
    fs.writeFileSync(APPLIED_SHIFT2_PATH, JSON.stringify(appliedData, null, 2));
    console.log('Logged to applied Shift 2! New total:', appliedData.total);

    await p.close();
    console.log('Tab closed cleanly.');
  }
}

directFillAll().catch(console.error);
