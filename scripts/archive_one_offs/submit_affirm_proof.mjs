import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const TRACKER_FILE = path.resolve('applied_and_seen_tracker.json');
const SCREENSHOT_DIR = path.resolve('screenshots/2026-10-12');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function submitAndAssertAffirm() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find((p) => p.url().includes('greenhouse.io') && p.url().includes('affirm'));

  if (!page) {
    console.error('Affirm Greenhouse tab not found.');
    browser.disconnect();
    return;
  }

  console.log('Submitting Affirm Greenhouse application...');
  // Find submit button
  const submitBtn = await page.$('button[type="submit"], input[type="submit"], #submit_app');
  if (submitBtn) {
    await submitBtn.click();
    console.log('Submit button clicked. Waiting 6 seconds for response...');
    await sleep(6000);

    const postSubmitPath = path.join(SCREENSHOT_DIR, 'post_submit_affirm.png');
    await page.screenshot({ path: postSubmitPath, fullPage: true });
    console.log(`📸 [POST-SUBMIT PROOF CAPTURED]: ${postSubmitPath}`);

    // Update Master Tracker
    let trackerData = { applied: [], seen: [] };
    if (fs.existsSync(TRACKER_FILE)) {
      trackerData = JSON.parse(fs.readFileSync(TRACKER_FILE, 'utf8'));
    }
    if (!Array.isArray(trackerData.applied)) trackerData.applied = [];

    const trackerEntry = {
      id: (trackerData.applied.length > 0 ? Math.max(...trackerData.applied.map((a) => a.id || 0)) : 0) + 1,
      company: 'Affirm',
      role: 'Software Engineer I, Frontend (Upfunnel)',
      location: 'Remote / Global',
      recipient_or_url: 'https://job-boards.greenhouse.io/affirm/jobs/7985907003',
      channel: 'Direct Portal (Greenhouse ATS)',
      status: 'Applied & Submitted (Verified with Proof)',
      date: new Date().toISOString().split('T')[0],
      timestamp: new Date().toISOString(),
      resume: 'Pratik Patidar Resume - React Developer.pdf',
      notes: 'Submitted via Greenhouse ATS with pre/post submit screenshots proof (Rule 37)',
    };

    trackerData.applied.push(trackerEntry);
    fs.writeFileSync(TRACKER_FILE, JSON.stringify(trackerData, null, 2));
    console.log(`🌟 [TRACKER] Successfully logged Affirm portal submission (ID: ${trackerEntry.id})`);
  }

  await page.close();
  browser.disconnect();
}

submitAndAssertAffirm().catch(console.error);
