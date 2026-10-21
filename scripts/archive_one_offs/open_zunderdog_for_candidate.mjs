import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const p = await browser.newPage();
  try {
    console.log('Opening Zunderdog careers form in live Brave tab for candidate...');
    await p.goto('https://www.zunderdog.com/careers/junior-web-developer-fresher-pune?utm_source=adzuna&utm_medium=adzuna', { waitUntil: 'networkidle2', timeout: 35000 });

    // Set all fields cleanly
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
      }

      const nameEl = document.querySelector('#name, input[name="name"]');
      if (nameEl) setNativeValue(nameEl, 'Pratik Patidar');

      const emailEl = document.querySelector('#email, input[name="email"]');
      if (emailEl) setNativeValue(emailEl, 'pratikpatidar7990@gmail.com');

      const phoneEl = document.querySelector('#phone, input[name="phone"]');
      if (phoneEl) setNativeValue(phoneEl, '8269647990');

      const eduEl = document.querySelector('#education, input[name="education"]');
      if (eduEl) setNativeValue(eduEl, 'B.Tech');

      const expEl = document.querySelector('#experienceYears, input[name="experienceYears"]');
      if (expEl) setNativeValue(expEl, '1');

      const npEl = document.querySelector('#noticePeriodDays, input[name="noticePeriodDays"]');
      if (npEl) setNativeValue(npEl, '15');

      const curSal = document.querySelector('#currentSalary, input[name="currentSalary"]');
      if (curSal) setNativeValue(curSal, '216000');

      const expSal = document.querySelector('#expectedSalary, input[name="expectedSalary"]');
      if (expSal) setNativeValue(expSal, '465000');

      const liEl = document.querySelector('#linkedinUrl, input[name="linkedinUrl"]');
      if (liEl) setNativeValue(liEl, 'https://www.linkedin.com/in/pratik-patidar');

      const msgEl = document.querySelector('#message, textarea[name="message"]');
      if (msgEl) setNativeValue(msgEl, 'Hi Hiring Team, I am a Full Stack Developer with 1.5 years experience in React.js, Next.js, and TypeScript.');

      const gender = document.querySelector('#gender');
      if (gender) { gender.value = 'Male'; gender.dispatchEvent(new Event('change', { bubbles: true })); }

      const country = document.querySelector('#currentCountry');
      if (country) { country.value = 'India'; country.dispatchEvent(new Event('change', { bubbles: true })); }

      const state = document.querySelector('#currentState');
      if (state) { state.value = 'Madhya Pradesh'; state.dispatchEvent(new Event('change', { bubbles: true })); }

      const consent = document.querySelector('#consent, input[name="consent"]');
      if (consent) { consent.checked = true; consent.dispatchEvent(new Event('change', { bubbles: true })); }
    });

    // Upload Resume
    const resumeAbsPath = path.resolve('resumes/Pratik Patidar Resume - React Developer.pdf');
    const fileInput = await p.$('#resume, input[name="resume"]');
    if (fileInput) {
      await fileInput.uploadFile(resumeAbsPath);
    }

    console.log('Zunderdog form pre-filled and kept open in Brave tab!');
  } finally {
    // Keep tab open in Brave!
    await browser.disconnect();
  }
})();
