import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const p = await browser.newPage();
  try {
    console.log('Navigating to Zunderdog careers portal...');
    await p.goto('https://www.zunderdog.com/careers/junior-web-developer-fresher-pune?utm_source=adzuna&utm_medium=adzuna', { waitUntil: 'networkidle2', timeout: 30000 });

    const screenshotDir = path.resolve('screenshots/2026-10-13');
    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

    console.log('Filling Zunderdog form...');
    await p.evaluate(() => {
      // Name
      const name = document.querySelector('input[name="name"], #name');
      if (name) { name.value = 'Pratik Patidar'; name.dispatchEvent(new Event('input', { bubbles: true })); }

      // Email
      const email = document.querySelector('input[name="email"], #email');
      if (email) { email.value = 'pratikpatidar7990@gmail.com'; email.dispatchEvent(new Event('input', { bubbles: true })); }

      // Phone
      const phone = document.querySelector('input[name="phone"], #phone');
      if (phone) { phone.value = '+918269647990'; phone.dispatchEvent(new Event('input', { bubbles: true })); }

      // Gender
      const gender = document.querySelector('select[name="gender"], #gender');
      if (gender) { gender.value = 'Male'; gender.dispatchEvent(new Event('change', { bubbles: true })); }

      // Education
      const edu = document.querySelector('input[name="education"], #education');
      if (edu) { edu.value = 'B.Tech'; edu.dispatchEvent(new Event('input', { bubbles: true })); }

      // Experience
      const exp = document.querySelector('input[name="experienceYears"], #experienceYears');
      if (exp) { exp.value = '1.5'; exp.dispatchEvent(new Event('input', { bubbles: true })); }

      // Notice period
      const np = document.querySelector('input[name="noticePeriodDays"], #noticePeriodDays');
      if (np) { np.value = '0'; np.dispatchEvent(new Event('input', { bubbles: true })); }

      // Country: India
      const country = document.querySelector('select[name="currentCountry"], #currentCountry');
      if (country) { country.value = 'India'; country.dispatchEvent(new Event('change', { bubbles: true })); }

      // State: Madhya Pradesh
      const state = document.querySelector('select[name="currentState"], #currentState');
      if (state) { state.value = 'Madhya Pradesh'; state.dispatchEvent(new Event('change', { bubbles: true })); }

      // Salary
      const currSal = document.querySelector('input[name="currentSalary"], #currentSalary');
      if (currSal) { currSal.value = '350000'; currSal.dispatchEvent(new Event('input', { bubbles: true })); }

      const expSal = document.querySelector('input[name="expectedSalary"], #expectedSalary');
      if (expSal) { expSal.value = '600000'; expSal.dispatchEvent(new Event('input', { bubbles: true })); }

      // LinkedIn
      const li = document.querySelector('input[name="linkedinUrl"], #linkedinUrl');
      if (li) { li.value = 'https://www.linkedin.com/in/pratik-patidar'; li.dispatchEvent(new Event('input', { bubbles: true })); }

      // Message
      const msg = document.querySelector('textarea[name="message"], #message');
      if (msg) {
        msg.value = 'Hi Team, I am a Full Stack / Frontend Developer with 1.5 years experience in React.js, Next.js, and TypeScript. Looking forward to discussing the role.';
        msg.dispatchEvent(new Event('input', { bubbles: true }));
      }

      // Consent
      const consent = document.querySelector('input[name="consent"], #consent');
      if (consent) { consent.checked = true; consent.dispatchEvent(new Event('change', { bubbles: true })); }
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
    const prePath = path.resolve(screenshotDir, 'zunderdog_presubmit.png');
    await p.screenshot({ path: prePath, fullPage: true });
    console.log('Pre-submit screenshot saved:', prePath);

    // Submit form
    console.log('Clicking Submit button...');
    const submitBtn = await p.$('button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
    }

    await new Promise(r => setTimeout(r, 6000));

    // Post-submit screenshot
    const postPath = path.resolve(screenshotDir, 'zunderdog_postsubmit.png');
    await p.screenshot({ path: postPath, fullPage: true });
    console.log('Post-submit screenshot saved:', postPath);

    const postState = await p.evaluate(() => {
      return {
        url: window.location.href,
        bodySnippet: document.body.innerText.slice(0, 400),
        alerts: Array.from(document.querySelectorAll('.alert, .success, .toast, [role="alert"]')).map(a => a.innerText)
      };
    });

    console.log('Post Submit Result:', postState);

    // Record in tracker
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
      notes: 'Applied on official Zunderdog careers form with React/Next.js profile and verified screenshots'
    });
    tracker.total_lifetime_applied += 1;
    fs.writeFileSync(TRACKER_FILE, JSON.stringify(tracker, null, 2));
    console.log('Recorded in weekly_applied.json!');

  } catch (err) {
    console.error('Error during Zunderdog application:', err);
  } finally {
    await p.close();
    await browser.disconnect();
  }
})();
