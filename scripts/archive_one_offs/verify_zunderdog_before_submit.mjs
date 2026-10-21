import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const p = await browser.newPage();
  try {
    await p.goto('https://www.zunderdog.com/careers/junior-web-developer-fresher-pune?utm_source=adzuna&utm_medium=adzuna', { waitUntil: 'networkidle2', timeout: 35000 });

    const screenshotDir = path.resolve('screenshots/2026-10-13');
    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

    // Set value and trigger native React input tracker
    await p.evaluate(() => {
      function setNativeValue(element, value) {
        const valueSetter = Object.getOwnPropertyDescriptor(element.__proto__, 'value') || Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
        if (valueSetter && valueSetter.set) {
          valueSetter.set.call(element, value);
        } else {
          element.value = value;
        }
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.dispatchEvent(new Event('blur', { bubbles: true }));
      }

      const nameEl = document.querySelector('#name, input[name="name"]');
      if (nameEl) setNativeValue(nameEl, 'Pratik Patidar');

      const emailEl = document.querySelector('#email, input[name="email"]');
      if (emailEl) setNativeValue(emailEl, 'pratikpatidar7990@gmail.com');

      const phoneEl = document.querySelector('#phone, input[name="phone"]');
      if (phoneEl) setNativeValue(phoneEl, '+918269647990');

      const eduEl = document.querySelector('#education, input[name="education"]');
      if (eduEl) setNativeValue(eduEl, 'B.Tech');

      const expEl = document.querySelector('#experienceYears, input[name="experienceYears"]');
      if (expEl) setNativeValue(expEl, '1.5');

      const npEl = document.querySelector('#noticePeriodDays, input[name="noticePeriodDays"]');
      if (npEl) setNativeValue(npEl, '0');

      const curSal = document.querySelector('#currentSalary, input[name="currentSalary"]');
      if (curSal) setNativeValue(curSal, '216000');

      const expSal = document.querySelector('#expectedSalary, input[name="expectedSalary"]');
      if (expSal) setNativeValue(expSal, '465000');

      const liEl = document.querySelector('#linkedinUrl, input[name="linkedinUrl"]');
      if (liEl) setNativeValue(liEl, 'https://www.linkedin.com/in/pratik-patidar');

      const msgEl = document.querySelector('#message, textarea[name="message"]');
      if (msgEl) setNativeValue(msgEl, 'Hi Hiring Team, I am a Full Stack Developer with 1.5 years experience in React.js, Next.js, and TypeScript.');

      // Selects
      const gender = document.querySelector('#gender');
      if (gender) { gender.value = 'Male'; gender.dispatchEvent(new Event('change', { bubbles: true })); }

      const country = document.querySelector('#currentCountry');
      if (country) { country.value = 'India'; country.dispatchEvent(new Event('change', { bubbles: true })); }

      const state = document.querySelector('#currentState');
      if (state) { state.value = 'Madhya Pradesh'; state.dispatchEvent(new Event('change', { bubbles: true })); }

      // Consent
      const consent = document.querySelector('#consent, input[name="consent"]');
      if (consent) { consent.checked = true; consent.dispatchEvent(new Event('change', { bubbles: true })); }
    });

    await new Promise(r => setTimeout(r, 1000));

    // Upload Resume
    const resumeAbsPath = path.resolve('resumes/Pratik Patidar Resume - React Developer.pdf');
    const fileInput = await p.$('#resume, input[name="resume"]');
    if (fileInput) {
      await fileInput.uploadFile(resumeAbsPath);
    }

    await new Promise(r => setTimeout(r, 1500));

    // Read back all values directly from DOM
    const verifiedDOM = await p.evaluate(() => {
      return {
        company: 'Zunderdog',
        role: 'Junior Web Developer (Fresher)',
        portal_url: window.location.href,
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

    console.log('DOM_VERIFIED_DATA:');
    console.log(JSON.stringify(verifiedDOM, null, 2));

    // Save screenshot
    await p.screenshot({ path: path.resolve(screenshotDir, 'zunderdog_ready_for_review.png'), fullPage: true });

  } finally {
    await browser.disconnect();
  }
})();
