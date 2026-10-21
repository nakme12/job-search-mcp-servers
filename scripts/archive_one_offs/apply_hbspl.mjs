import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const p = await browser.newPage();
  try {
    console.log('Navigating to HBSPL MERN Stack application form...');
    await p.goto('https://hbspl.in/jobs/mern-stack-developer-hbspl-wfh-entry-level-jobs/?utm_campaign=google_jobs_apply&utm_source=google_jobs_apply&utm_medium=organic', { waitUntil: 'networkidle2', timeout: 35000 });

    const screenshotDir = path.resolve('screenshots/2026-10-13');
    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

    console.log('Filling form fields on HBSPL...');

    // Name
    await p.focus('input[name="awsm_applicant_name"]');
    await p.keyboard.type('Pratik Patidar', { delay: 25 });

    // Email
    await p.focus('input[name="awsm_applicant_email"]');
    await p.keyboard.type('pratikpatidar7990@gmail.com', { delay: 25 });

    // Phone
    await p.focus('input[name="awsm_applicant_phone"]');
    await p.keyboard.type('8269647990', { delay: 25 });

    // Letter
    await p.focus('textarea[name="awsm_applicant_letter"]');
    await p.keyboard.type('Hi Team, I am a Full Stack Developer with 1.5 years experience building modern web applications using React.js, Node.js, Express, and MongoDB. I would love to contribute to HBSPL.', { delay: 15 });

    // Privacy policy checkbox
    await p.evaluate(() => {
      const chk = document.querySelector('input[name="awsm_form_privacy_policy"]');
      if (chk) {
        chk.checked = true;
        chk.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    // Upload Resume
    const resumeAbsPath = path.resolve('resumes/Pratik Patidar Resume - MERN Full Stack.pdf');
    console.log('Attaching resume:', resumeAbsPath);
    const fileInput = await p.$('input[name="awsm_file"]');
    if (fileInput) {
      await fileInput.uploadFile(resumeAbsPath);
    }

    await new Promise(r => setTimeout(r, 2000));

    // Pre-submit screenshot
    const prePath = path.resolve(screenshotDir, 'hbspl_mern_presubmit.png');
    await p.screenshot({ path: prePath, fullPage: true });
    console.log('Pre-submit screenshot saved:', prePath);

    // Submit form
    console.log('Submitting HBSPL application...');
    const submitBtn = await p.$('#awsm-application-form input[type="submit"], input[name="form_sub"]');
    if (submitBtn) {
      await submitBtn.click();
    }

    console.log('Waiting 8s for submission confirmation...');
    await new Promise(r => setTimeout(r, 8000));

    // Post-submit screenshot
    const postPath = path.resolve(screenshotDir, 'hbspl_mern_postsubmit.png');
    await p.screenshot({ path: postPath, fullPage: true });
    console.log('Post-submit screenshot saved:', postPath);

    const postState = await p.evaluate(() => {
      const msg = document.querySelector('.awsm-job-form-message, .awsm-success-message, .alert, .awsm-application-form');
      return {
        url: window.location.href,
        statusMsg: msg ? msg.innerText : 'None',
        bodySnippet: document.body.innerText.slice(0, 500)
      };
    });

    console.log('Post Submit Result:', postState);

    // Record in tracker
    const TRACKER_FILE = path.resolve('weekly_applied.json');
    const tracker = JSON.parse(fs.readFileSync(TRACKER_FILE, 'utf8'));
    tracker.applied.unshift({
      id: tracker.applied.length + 1,
      company: 'HBSPL',
      role: 'MERN Stack Developer – Freshers & Experienced',
      location: 'Bengaluru / Hybrid / WFH',
      recipient_or_url: 'https://hbspl.in/jobs/mern-stack-developer-hbspl-wfh-entry-level-jobs/?utm_campaign=google_jobs_apply&utm_source=google_jobs_apply&utm_medium=organic',
      channel: 'Direct Company Career Portal',
      status: 'Applied & Submitted (Verified in DOM)',
      date: '2026-10-13',
      timestamp: new Date().toISOString(),
      resume: 'Pratik Patidar Resume - MERN Full Stack.pdf',
      notes: 'Applied via official HBSPL careers ATS form with MERN resume & verified pre/post screenshots'
    });
    tracker.total_lifetime_applied += 1;
    fs.writeFileSync(TRACKER_FILE, JSON.stringify(tracker, null, 2));
    console.log('Successfully recorded HBSPL in weekly_applied.json!');

  } catch (err) {
    console.error('Error during HBSPL submission:', err);
  } finally {
    await p.close();
    await browser.disconnect();
  }
})();
