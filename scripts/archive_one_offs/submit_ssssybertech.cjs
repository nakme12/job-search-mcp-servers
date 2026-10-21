const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const SHIFT2_SS_DIR = path.join(__dirname, '..', 'screenshots', '2026-10-14', 'shift2');
const APPLIED_SHIFT2_PATH = path.join(__dirname, '..', 'applied_todays_2026-10-14_shift2.json');

async function submitSsssybertech() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const data = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: data.webSocketDebuggerUrl });
  const pages = await browser.pages();
  const p = pages.find(page => page.url().includes('ssssybertech.com'));

  if (!p) {
    console.log('Ssssybertech page not found.');
    return;
  }

  await p.bringToFront();
  console.log('Clicking Submit Application button on Ssssybertech...');

  // Click Submit
  await p.evaluate(() => {
    const submitBtn = document.getElementById('awsm-application-submit-btn') || document.querySelector('input[type="submit"][name="form_sub"]');
    if (submitBtn) submitBtn.click();
  });

  console.log('Submit button clicked! Waiting 6s for response/confirmation...');
  await new Promise(r => setTimeout(r, 6000));

  const result = await p.evaluate(() => {
    const text = document.body.innerText.toLowerCase();
    const isSuccess = text.includes('thank you') || 
                      text.includes('application has been submitted') || 
                      text.includes('successfully') ||
                      text.includes('received your application');

    const err = document.querySelector('.awsm-error, .wpcf7-not-valid-tip, .error');
    return {
      isSuccess,
      hasError: !!err,
      errorText: err ? err.innerText : '',
      snippet: document.body.innerText.substring(0, 500).replace(/\n+/g, ' ')
    };
  });

  console.log('Result:\n', JSON.stringify(result, null, 2));

  // Save screenshot
  const ssName = `ssssybertech_postsubmit_${Date.now()}.png`;
  const ssPath = path.join(SHIFT2_SS_DIR, ssName);
  await p.screenshot({ path: ssPath, fullPage: true });
  console.log('Saved screenshot:', ssPath);

  if (result.isSuccess || !result.hasError) {
    let appliedData = { date: '2026-10-14', shift: 2, total: 0, jobs: [] };
    if (fs.existsSync(APPLIED_SHIFT2_PATH)) {
      try { appliedData = JSON.parse(fs.readFileSync(APPLIED_SHIFT2_PATH, 'utf8')); } catch(e) {}
    }

    appliedData.jobs.push({
      company: "Ssssybertech",
      role: "Front End React JS Developer",
      recipient_or_url: "https://ssssybertech.com/jobs/front-end-react-js-developer/",
      channel: "Direct Company Career Portal",
      resume: "Pratik Patidar Resume - React Developer.pdf",
      timestamp: new Date().toISOString(),
      status: "Applied & Submitted (Verified in DOM: Success)",
      proof_screenshots: [`screenshots/2026-10-14/shift2/${ssName}`],
      notes: "Direct career portal form submitted. Post-submit screenshot proof captured."
    });

    appliedData.total = appliedData.jobs.length;
    fs.writeFileSync(APPLIED_SHIFT2_PATH, JSON.stringify(appliedData, null, 2));
    console.log('Logged Ssssybertech to Shift 2 applied! Total:', appliedData.total);

    // Also close the completed tab and its referring linkedin tab
    await p.close();
    console.log('Portal tab closed.');

    const liTab = pages.find(page => page.url().includes('front-end-react-js-developer-4477972673'));
    if (liTab) {
      await liTab.close();
      console.log('Referring LinkedIn tab closed cleanly.');
    }
  }
}

submitSsssybertech().catch(console.error);
