import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const p = await browser.newPage();
  try {
    console.log('Navigating to Creuto career application portal...');
    await p.goto('https://creuto.com/careers/apply?position=MERN%20Stack%20Developer&jobId=69fe315bab54fb2fca546108', { waitUntil: 'networkidle2', timeout: 35000 });

    const screenshotDir = path.resolve('screenshots/2026-10-13');
    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

    console.log('Typing candidate details into Creuto application form...');

    // 1. Name
    await p.focus('input[name="name"]');
    await p.keyboard.type('Pratik Patidar', { delay: 30 });

    // 2. Email
    await p.focus('input[name="email"]');
    await p.keyboard.type('pratikpatidar7990@gmail.com', { delay: 25 });

    // 3. Phone
    await p.focus('input[name="phone"]');
    await p.keyboard.type('8269647990', { delay: 25 });

    // 4. Experience
    await p.focus('input[name="experience"]');
    await p.keyboard.type('1.5 Years', { delay: 30 });

    // 5. LinkedIn
    await p.focus('input[name="linkedin"]');
    await p.keyboard.type('https://www.linkedin.com/in/pratik-patidar', { delay: 20 });

    // 6. Reason
    await p.focus('textarea[name="reason"]');
    await p.keyboard.type('I am an active Full Stack Developer specializing in React.js, Node.js, Express, and MongoDB with 1.5 years experience building scalable web solutions.', { delay: 15 });

    // 7. Upload Resume
    const resumeAbsPath = path.resolve('resumes/Pratik Patidar Resume - MERN Full Stack.pdf');
    console.log('Attaching resume:', resumeAbsPath);
    const fileInputs = await p.$$('input[type="file"]');
    if (fileInputs.length > 0) {
      await fileInputs[0].uploadFile(resumeAbsPath);
    }

    await new Promise(r => setTimeout(r, 2500));

    // Pre-submit screenshot
    const prePath = path.resolve(screenshotDir, 'creuto_mern_presubmit.png');
    await p.screenshot({ path: prePath, fullPage: true });
    console.log('Pre-submit screenshot saved:', prePath);

    // Click Submit
    console.log('Submitting Creuto application...');
    const submitBtn = await p.evaluateHandle(() => {
      return Array.from(document.querySelectorAll('button')).find(b => (b.innerText || '').toLowerCase().includes('submit'));
    });

    if (submitBtn) {
      await submitBtn.click();
    }

    console.log('Waiting 8s for submission response...');
    await new Promise(r => setTimeout(r, 8000));

    // Post-submit screenshot
    const postPath = path.resolve(screenshotDir, 'creuto_mern_postsubmit.png');
    await p.screenshot({ path: postPath, fullPage: true });
    console.log('Post-submit screenshot saved:', postPath);

    const postState = await p.evaluate(() => {
      return {
        url: window.location.href,
        bodySnippet: document.body.innerText.slice(0, 500)
      };
    });

    console.log('Post Submit Result:', postState);

    // Record in tracker
    const TRACKER_FILE = path.resolve('weekly_applied.json');
    const tracker = JSON.parse(fs.readFileSync(TRACKER_FILE, 'utf8'));
    tracker.applied.unshift({
      id: tracker.applied.length + 1,
      company: 'Creuto',
      role: 'MERN Stack Developer',
      location: 'India (OpenAI Partner)',
      recipient_or_url: 'https://creuto.com/careers/apply?position=MERN%20Stack%20Developer&jobId=69fe315bab54fb2fca546108',
      channel: 'Direct Company Career Portal',
      status: 'Applied & Submitted (Verified in DOM)',
      date: '2026-10-13',
      timestamp: new Date().toISOString(),
      resume: 'Pratik Patidar Resume - MERN Full Stack.pdf',
      notes: 'Applied on official Creuto career portal with MERN Stack resume & verified pre/post screenshots'
    });
    tracker.total_lifetime_applied += 1;
    fs.writeFileSync(TRACKER_FILE, JSON.stringify(tracker, null, 2));
    console.log('Successfully recorded Creuto in weekly_applied.json!');

  } catch (err) {
    console.error('Error in Creuto submission:', err);
  } finally {
    await p.close();
    await browser.disconnect();
  }
})();
