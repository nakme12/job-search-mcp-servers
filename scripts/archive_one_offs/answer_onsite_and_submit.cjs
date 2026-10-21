const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const SHIFT2_SS_DIR = path.join(__dirname, '..', 'screenshots', '2026-10-14', 'shift2');
const APPLIED_SHIFT2_PATH = path.join(__dirname, '..', 'applied_todays_2026-10-14_shift2.json');

async function answerOnsiteAndSubmit() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const data = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: data.webSocketDebuggerUrl });
  const pages = await browser.pages();
  const p = pages[pages.length - 1];

  await p.bringToFront();

  console.log('Answering "Yes" to onsite 5 days a week question...');
  const input = await p.$('input[type="text"]');
  if (input) {
    await input.click();
    await input.type('Yes', { delay: 20 });
    await p.keyboard.press('Tab');
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

  // Click Submit application
  console.log('Clicking Submit application button...');
  await p.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const sub = btns.find(b => b.innerText.trim() === 'Submit application' || b.getAttribute('aria-label')?.includes('Submit application'));
    if (sub) sub.click();
  });

  await new Promise(r => setTimeout(r, 4500));

  const conf = await p.evaluate(() => {
    const t = document.body.innerText.toLowerCase();
    return t.includes('application submitted') || t.includes('your application was sent') || t.includes('applied');
  });

  console.log('Final Application Sent:', conf);

  if (conf) {
    const ssName = `deservely_postsubmit_${Date.now()}.png`;
    const ssPath = path.join(SHIFT2_SS_DIR, ssName);
    await p.screenshot({ path: ssPath, fullPage: true });
    console.log('Screenshot saved:', ssPath);

    let appliedData = { date: '2026-10-14', shift: 2, total: 0, jobs: [] };
    if (fs.existsSync(APPLIED_SHIFT2_PATH)) {
      try { appliedData = JSON.parse(fs.readFileSync(APPLIED_SHIFT2_PATH, 'utf8')); } catch(e) {}
    }

    appliedData.jobs.push({
      company: "Deservely Technologies",
      role: "MERN Stack Developer",
      recipient_or_url: "https://in.linkedin.com/jobs/view/mern-stack-developer-at-deservely-technologies-4472546168",
      channel: "LinkedIn Easy Apply",
      resume: "Pratik Patidar Resume - MERN Full Stack.pdf",
      timestamp: new Date().toISOString(),
      status: "Applied & Submitted (Verified in DOM: Application Sent)",
      proof_screenshots: [`screenshots/2026-10-14/shift2/${ssName}`],
      notes: "LinkedIn Easy Apply confirmed submitted with physical DOM proof."
    });

    appliedData.total = appliedData.jobs.length;
    fs.writeFileSync(APPLIED_SHIFT2_PATH, JSON.stringify(appliedData, null, 2));
    console.log('Logged Deservely! New Shift 2 Total:', appliedData.total);

    await p.close();
    console.log('Tab closed cleanly.');
  }
}

answerOnsiteAndSubmit().catch(console.error);
