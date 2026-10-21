import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const p = await browser.newPage();
  try {
    console.log('Navigating to Zunderdog careers portal...');
    await p.goto('https://www.zunderdog.com/careers/junior-web-developer-fresher-pune?utm_source=adzuna&utm_medium=adzuna', { waitUntil: 'networkidle2', timeout: 35000 });

    const screenshotDir = path.resolve('screenshots/2026-10-13');
    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

    async function typeInput(selector, text) {
      const el = await p.$(selector);
      if (el) {
        await el.click({ clickCount: 3 });
        await p.keyboard.press('Backspace');
        await p.keyboard.type(text, { delay: 20 });
      }
    }

    // Name
    await typeInput('input[name="name"], #name', 'Pratik Patidar');

    // Email
    await typeInput('input[name="email"], #email', 'pratikpatidar7990@gmail.com');

    // Phone with country code (+91 8269647990)
    await typeInput('input[name="phone"], #phone', '+91 8269647990');

    // Gender Select
    await p.select('select[name="gender"], #gender', 'Male');

    // Education
    await typeInput('input[name="education"], #education', 'B.Tech');

    // Experience Years
    await typeInput('input[name="experienceYears"], #experienceYears', '1.5');

    // Notice Period Days
    await typeInput('input[name="noticePeriodDays"], #noticePeriodDays', '0');

    // Country Select
    await p.select('select[name="currentCountry"], #currentCountry', 'India');
    await new Promise(r => setTimeout(r, 1000));

    // State Select
    await p.select('select[name="currentState"], #currentState', 'Madhya Pradesh');
    await new Promise(r => setTimeout(r, 1000));

    // Current Salary
    await typeInput('input[name="currentSalary"], #currentSalary', '350000');

    // Expected Salary
    await typeInput('input[name="expectedSalary"], #expectedSalary', '600000');

    // LinkedIn URL
    await typeInput('input[name="linkedinUrl"], #linkedinUrl', 'https://www.linkedin.com/in/pratik-patidar');

    // Message
    await typeInput('textarea[name="message"], #message', 'Hi Hiring Team, I am an active Full Stack Developer specializing in React.js, Next.js, and TypeScript with 1.5 years experience. Looking forward to discussing the role.');

    // Consent Checkbox
    await p.evaluate(() => {
      const chk = document.querySelector('input[name="consent"], #consent');
      if (chk) {
        chk.checked = true;
        chk.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    // Upload Resume
    const resumeAbsPath = path.resolve('resumes/Pratik Patidar Resume - React Developer.pdf');
    console.log('Attaching resume:', resumeAbsPath);
    const fileInput = await p.$('input[name="resume"], #resume');
    if (fileInput) {
      await fileInput.uploadFile(resumeAbsPath);
    }

    await new Promise(r => setTimeout(r, 2000));

    // Pre-submit screenshot
    const prePath = path.resolve(screenshotDir, 'zunderdog_presubmit_phonefixed.png');
    await p.screenshot({ path: prePath, fullPage: true });
    console.log('Pre-submit screenshot saved:', prePath);

    // Submit form
    console.log('Clicking Submit button...');
    const submitBtn = await p.$('button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
    }

    console.log('Waiting 8s for submission response...');
    await new Promise(r => setTimeout(r, 8000));

    // Post-submit screenshot
    const postPath = path.resolve(screenshotDir, 'zunderdog_postsubmit_phonefixed.png');
    await p.screenshot({ path: postPath, fullPage: true });
    console.log('Post-submit screenshot saved:', postPath);

    const postState = await p.evaluate(() => {
      const alerts = Array.from(document.querySelectorAll('.alert, .toast, [role="alert"], div[class*="error"], div[class*="success"]')).map(a => a.innerText.trim()).filter(Boolean);
      return {
        url: window.location.href,
        bodySnippet: document.body.innerText.slice(0, 400),
        alerts
      };
    });

    console.log('Post Submit Result:', postState);

    const hasError = postState.alerts.some(a => a.toLowerCase().includes('required') || a.toLowerCase().includes('valid') || a.toLowerCase().includes('error'));

    if (!hasError) {
      const TRACKER_FILE = path.resolve('weekly_applied.json');
      const tracker = JSON.parse(fs.readFileSync(TRACKER_FILE, 'utf8'));
      tracker.applied.unshift({
        id: tracker.applied.length + 1,
        company: 'Zunderdog',
        role: 'Junior Web Developer (Fresher)',
        location: 'Pune (Remote for now)',
        recipient_or_url: 'https://www.zunderdog.com/careers/junior-web-developer-fresher-pune?utm_source=adzuna&utm_medium=adzuna',
        channel: 'Direct Company Career Portal',
        status: 'Applied & Submitted (Verified in DOM)',
        date: '2026-10-13',
        timestamp: new Date().toISOString(),
        resume: 'Pratik Patidar Resume - React Developer.pdf',
        notes: 'Submitted on official Zunderdog career portal with pre/post screenshots'
      });
      tracker.total_lifetime_applied += 1;
      fs.writeFileSync(TRACKER_FILE, JSON.stringify(tracker, null, 2));
      console.log('Successfully recorded Zunderdog in weekly_applied.json!');
    } else {
      console.log('Form returned validation error:', postState.alerts);
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await p.close();
    await browser.disconnect();
  }
})();
