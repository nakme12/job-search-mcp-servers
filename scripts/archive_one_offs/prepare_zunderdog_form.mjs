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

    // Phone
    await typeInput('input[name="phone"], #phone', '+918269647990');

    // Gender
    await p.select('select[name="gender"], #gender', 'Male');

    // Education
    await typeInput('input[name="education"], #education', 'B.Tech');

    // Experience
    await typeInput('input[name="experienceYears"], #experienceYears', '1.5');

    // Notice Period
    await typeInput('input[name="noticePeriodDays"], #noticePeriodDays', '0');

    // Country
    await p.select('select[name="currentCountry"], #currentCountry', 'India');
    await new Promise(r => setTimeout(r, 800));

    // State
    await p.select('select[name="currentState"], #currentState', 'Madhya Pradesh');
    await new Promise(r => setTimeout(r, 800));

    // Current Salary (Fixed: 216000)
    await typeInput('input[name="currentSalary"], #currentSalary', '216000');

    // Expected Salary (Fixed: 465000)
    await typeInput('input[name="expectedSalary"], #expectedSalary', '465000');

    // LinkedIn
    await typeInput('input[name="linkedinUrl"], #linkedinUrl', 'https://www.linkedin.com/in/pratik-patidar');

    // Message
    await typeInput('textarea[name="message"], #message', 'Hi Hiring Team, I am a Full Stack / Frontend Developer with 1.5 years experience in React.js, Next.js, and TypeScript. Looking forward to discussing the role.');

    // Consent
    await p.evaluate(() => {
      const chk = document.querySelector('input[name="consent"], #consent');
      if (chk) {
        chk.checked = true;
        chk.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    // Upload Resume
    const resumeAbsPath = path.resolve('resumes/Pratik Patidar Resume - React Developer.pdf');
    const fileInput = await p.$('input[name="resume"], #resume');
    if (fileInput) {
      await fileInput.uploadFile(resumeAbsPath);
    }

    await new Promise(r => setTimeout(r, 1500));

    // Take Pre-submit screenshot
    const prePath = path.resolve(screenshotDir, 'zunderdog_presubmit_verified.png');
    await p.screenshot({ path: prePath, fullPage: true });

    // Read back all filled values directly from DOM
    const filledData = await p.evaluate(() => {
      return {
        company: 'Zunderdog',
        role: 'Junior Web Developer (Fresher)',
        name: document.querySelector('#name')?.value,
        email: document.querySelector('#email')?.value,
        phone: document.querySelector('#phone')?.value,
        gender: document.querySelector('#gender')?.value,
        education: document.querySelector('#education')?.value,
        experienceYears: document.querySelector('#experienceYears')?.value,
        noticePeriodDays: document.querySelector('#noticePeriodDays')?.value,
        currentCountry: document.querySelector('#currentCountry')?.value,
        currentState: document.querySelector('#currentState')?.value,
        currentSalary: document.querySelector('#currentSalary')?.value,
        expectedSalary: document.querySelector('#expectedSalary')?.value,
        linkedinUrl: document.querySelector('#linkedinUrl')?.value,
        consentChecked: document.querySelector('#consent')?.checked,
        resumeUploaded: !!document.querySelector('#resume')?.value
      };
    });

    console.log('FILLED_FORM_DATA_FOR_USER_REVIEW:');
    console.log(JSON.stringify(filledData, null, 2));

  } finally {
    // Keep tab open, do not submit yet
    await browser.disconnect();
  }
})();
