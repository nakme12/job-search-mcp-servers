const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const { appendSubmissionToStorage } = require('./guards/storage_write_guard.cjs');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
    const pages = await browser.pages();
    const ep = pages.find(p => p.url().includes('enterpret'));
    if (!ep) {
      console.log('No enterpret tab');
      return;
    }
    
    // Inspect current phone field
    const phoneVal = await ep.$eval('#phone', el => el.value);
    console.log('Current #phone value:', phoneVal);
    
    // Clear and set exact 10 digits
    console.log('Clearing phone field and setting 8269647990...');
    await ep.$eval('#phone', el => {
      el.value = '';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await sleep(500);
    await ep.type('#phone', '8269647990', { delay: 50 });
    await sleep(500);
    
    // Click submit
    console.log('Submitting application...');
    const submitBtn = await ep.$('#submit_app') || await ep.$('button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
    }
    
    console.log('Awaiting confirmation...');
    for (let i = 0; i < 15; i++) {
      await sleep(1000);
      const text = await ep.evaluate(() => document.body.innerText.toLowerCase());
      if (text.includes('thank you') || text.includes('application submitted') || text.includes('received your application')) {
        const timestamp = Date.now();
        const screenshotPath = path.resolve(`screenshots/2026-10-21/shift1/Enterpret_Greenhouse_Confirmed_${timestamp}.png`);
        await ep.screenshot({ path: screenshotPath, fullPage: true });
        console.log('CONFIRMED! Screenshot saved:', screenshotPath);
        
        const entry = {
          id: `enterpret_gh_${timestamp}`,
          company: 'Enterpret',
          role: 'Software Engineering Intern',
          portal_type: 'Direct ATS (Greenhouse)',
          apply_url: ep.url(),
          status: 'SUBMITTED',
          applied_at: new Date().toISOString(),
          screenshot_path: screenshotPath,
          notes: 'Submitted directly via Greenhouse ATS with live confirmation assertion'
        };
        appendSubmissionToStorage(entry);
        await ep.close();
        console.log('Recorded in File 5 and tab closed.');
        return;
      }
    }
    
    const errors = await ep.evaluate(() => {
      return Array.from(document.querySelectorAll('.helper-text--error, .select__label--error, .grecaptcha-error')).map(x => x.innerText);
    });
    console.log('Remaining errors:', errors);
  } catch(e) {
    console.error('Error:', e.message);
  }
})();
