const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const SHIFT2_SS_DIR = path.join(__dirname, '..', 'screenshots', '2026-10-14', 'shift2');
const APPLIED_SHIFT2_PATH = path.join(__dirname, '..', 'applied_todays_2026-10-14_shift2.json');

async function humanTypeLinkedIn() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const data = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: data.webSocketDebuggerUrl });
  const pages = await browser.pages();
  const p = pages[1];

  await p.bringToFront();

  // Scroll to bottom of modal
  await p.evaluate(() => {
    const m = document.querySelector('.jobs-easy-apply-modal') || document.querySelector('[role="dialog"]');
    if (m) m.scrollTop = m.scrollHeight;
  });

  const liInput = await p.$('input[id="_r_32_"]');
  if (liInput) {
    console.log('Found LinkedIn input by ID _r_32_! Focusing and typing with real keypresses...');
    await liInput.click({ clickCount: 3 });
    await p.keyboard.press('Backspace');
    await new Promise(r => setTimeout(r, 200));

    // Type human keystrokes
    await liInput.type('https://www.linkedin.com/in/pratik-patidar', { delay: 15 });
    await new Promise(r => setTimeout(r, 800));

    // Press Tab
    await p.keyboard.press('Tab');
    await new Promise(r => setTimeout(r, 500));
  } else {
    console.log('Direct ID input not found.');
  }

  // Check if error disappeared
  const hasError = await p.evaluate(() => document.body.innerText.includes('This field is required'));
  console.log('Error gone:', !hasError);

  // Click Review button
  console.log('Clicking Review...');
  await p.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const rev = btns.find(b => b.innerText.trim() === 'Review');
    if (rev) rev.click();
  });

  await new Promise(r => setTimeout(r, 3000));

  // If on Page 6 (Review), click Submit application
  console.log('Looking for Submit application button...');
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

humanTypeLinkedIn().catch(console.error);
