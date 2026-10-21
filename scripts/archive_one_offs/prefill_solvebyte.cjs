const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const p = await browser.newPage();
  try {
    console.log('Opening Solvebyte career page in Chrome...');
    await p.goto('https://solvebyte.com/career/full-stack-developer', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await new Promise(r => setTimeout(r, 2500));

    console.log('Clicking Apply button to open modal...');
    await p.evaluate(() => {
      const applyBtn = Array.from(document.querySelectorAll('a, button')).find(el => (el.innerText || '').toLowerCase().trim() === 'apply now' || (el.innerText || '').toLowerCase().trim() === 'apply');
      if (applyBtn) applyBtn.click();
    });
    await new Promise(r => setTimeout(r, 2500));

    console.log('Pre-filling Solvebyte candidate fields...');
    await p.evaluate(() => {
      // 1. Full Name
      const nameInput = document.querySelector('#fullName');
      if (nameInput) {
        nameInput.value = 'Pratik Patidar';
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
        nameInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // 2. Email
      const emailInput = document.querySelector('#email');
      if (emailInput) {
        emailInput.value = 'pratikpatidar7990@gmail.com';
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        emailInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // 3. Phone
      const phoneInput = document.querySelector('#phoneNumber');
      if (phoneInput) {
        phoneInput.value = '8269647990';
        phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
        phoneInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // 4. Experience
      const expInput = document.querySelector('#experience');
      if (expInput) {
        expInput.value = '1.5';
        expInput.dispatchEvent(new Event('input', { bubbles: true }));
        expInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // 5. Current CTC
      const ctcInput = document.querySelector('#currentCtc');
      if (ctcInput) {
        ctcInput.value = '3.5 LPA';
        ctcInput.dispatchEvent(new Event('input', { bubbles: true }));
        ctcInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // 6. Expected CTC
      const expCtcInput = document.querySelector('#expectedCtc');
      if (expCtcInput) {
        expCtcInput.value = '5-6 LPA';
        expCtcInput.dispatchEvent(new Event('input', { bubbles: true }));
        expCtcInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // 7. Current Location
      const locInput = document.querySelector('#currentLocation');
      if (locInput) {
        locInput.value = 'Indore';
        locInput.dispatchEvent(new Event('input', { bubbles: true }));
        locInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // 8. Notice Period
      const npInput = document.querySelector('#noticePeriod');
      if (npInput) {
        npInput.value = 'Immediate';
        npInput.dispatchEvent(new Event('input', { bubbles: true }));
        npInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    // 9. Upload Resume
    const resumePath = path.resolve('C:/mcp/job-search-mcp-engine/resumes/Pratik Patidar Resume - MERN Full Stack.pdf');
    console.log('Attaching resume:', resumePath);
    const fileInput = await p.$('input#resume');
    if (fileInput) {
      await fileInput.uploadFile(resumePath);
      console.log('Uploaded MERN Full Stack resume');
    }

    await new Promise(r => setTimeout(r, 2000));
    const preScreenshot = 'C:/mcp/job-search-mcp-engine/screenshots/2026-10-14/solvebyte_fs_prefilled.png';
    await p.screenshot({ path: preScreenshot });
    console.log('Saved screenshot:', preScreenshot);
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
