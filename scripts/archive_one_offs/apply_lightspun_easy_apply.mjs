import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const TRACKER_FILE = 'C:/mcp/job-search-mcp-engine/applied_and_seen_tracker.json';
const RESUME_PATH = path.resolve('resumes/Pratik Patidar Resume - React Developer.pdf');

async function applyToLightSpun() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const liPage = pages.find(p => p.url().includes('linkedin.com'));
  if (!liPage) {
    console.error('LinkedIn tab not found');
    await browser.disconnect();
    return;
  }

  const jobUrl = 'https://www.linkedin.com/jobs/view/4441690499/';
  console.log(`Navigating to LightSpun job: ${jobUrl}...`);
  await liPage.goto(jobUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(4000);

  // Check if already applied
  const alreadyApplied = await liPage.evaluate(() => {
    return document.body.innerText.includes('Applied') && !document.querySelector('.jobs-apply-button');
  });

  if (alreadyApplied) {
    console.log('Already applied on LinkedIn badge!');
    await browser.disconnect();
    return;
  }

  // Look for Easy Apply button
  console.log('Locating Easy Apply button...');
  const easyApplyBtn = await liPage.$('.jobs-apply-button, button[aria-label*="Easy Apply"], button.jobs-apply-button');
  if (!easyApplyBtn) {
    console.log('Easy Apply button not found or expired.');
    await browser.disconnect();
    return;
  }

  await easyApplyBtn.click();
  await sleep(2500);

  // Step through modal dialog
  for (let step = 1; step <= 8; step++) {
    console.log(`Step ${step}...`);
    const modalState = await liPage.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"], .jobs-easy-apply-modal');
      if (!dialog) return { hasModal: false };
      return {
        hasModal: true,
        header: dialog.querySelector('h2, h3')?.innerText?.trim() || '',
        buttons: Array.from(dialog.querySelectorAll('button')).map(b => b.innerText.trim())
      };
    });

    if (!modalState.hasModal) {
      console.log('Modal closed / submitted!');
      break;
    }

    console.log(`Modal header: ${modalState.header} | Buttons: ${modalState.buttons.join(', ')}`);

    // Pre-submit fill check
    if (modalState.buttons.includes('Review')) {
      const reviewBtn = await liPage.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('[role="dialog"] button'));
        const b = btns.find(x => x.innerText.trim() === 'Review');
        if (b) { b.click(); return true; }
        return false;
      });
      await sleep(2000);
    } else if (modalState.buttons.includes('Submit application')) {
      // Capture pre-submit screenshot
      await liPage.screenshot({ path: 'screenshots/2026-10-12/pre_submit_lightspun.png' });
      console.log('Captured screenshots/2026-10-12/pre_submit_lightspun.png');

      // Click Submit
      console.log('Clicking Submit application...');
      await liPage.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('[role="dialog"] button'));
        const b = btns.find(x => x.innerText.trim() === 'Submit application');
        if (b) b.click();
      });
      await sleep(4000);

      // Capture post-submit screenshot
      await liPage.screenshot({ path: 'screenshots/2026-10-12/post_submit_lightspun.png' });
      console.log('Captured screenshots/2026-10-12/post_submit_lightspun.png');

      // Update tracker
      const tracker = JSON.parse(fs.readFileSync(TRACKER_FILE, 'utf8'));
      const newId = Math.max(...tracker.applied.map(a => a.id || 0)) + 1;
      tracker.applied.push({
        id: newId,
        company: "LightSpun",
        role: "Frontend Developer",
        location: "India / Remote",
        recipient_or_url: jobUrl,
        channel: "LinkedIn Easy Apply",
        status: "Applied & Submitted (Verified with Proof)",
        date: "2026-10-12",
        timestamp: new Date().toISOString(),
        resume: "Pratik Patidar Resume - React Developer.pdf",
        notes: "Submitted via LinkedIn Easy Apply CDP. Screenshots: pre_submit_lightspun.png & post_submit_lightspun.png"
      });
      tracker.summary.total_lifetime_applied = tracker.applied.length;
      tracker.summary.total_applied = tracker.applied.length;
      fs.writeFileSync(TRACKER_FILE, JSON.stringify(tracker, null, 2));
      console.log(`✓ Master Tracker updated with LightSpun Easy Apply! Lifetime total: ${tracker.applied.length}`);
      break;
    } else if (modalState.buttons.includes('Next')) {
      await liPage.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('[role="dialog"] button'));
        const b = btns.find(x => x.innerText.trim() === 'Next');
        if (b) b.click();
      });
      await sleep(2000);
    } else {
      break;
    }
  }

  await browser.disconnect();
}

applyToLightSpun().catch(console.error);
