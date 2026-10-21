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
      console.log('No enterpret page open');
      return;
    }
    
    console.log('Auditing Enterpret submit button and missing required fields...');
    const result = await ep.evaluate(() => {
      const missing = [];
      const requiredInputs = Array.from(document.querySelectorAll('input[required], select[required], textarea[required]'));
      for (const el of requiredInputs) {
        if (!el.value) missing.push(el.name || el.id || el.placeholder);
      }
      const submitBtn = document.querySelector('#submit_app') || document.querySelector('button[type="submit"]');
      return {
        missing,
        hasSubmitBtn: !!submitBtn,
        submitBtnText: submitBtn ? submitBtn.innerText : null
      };
    });
    console.log('Result:', result);
    
    // Click submit button via Puppeteer click
    const submitBtn = await ep.$('#submit_app') || await ep.$('button[type="submit"]');
    if (submitBtn) {
      console.log('Clicking submit button via Puppeteer...');
      await submitBtn.click();
    }
    
    console.log('Waiting 10s for confirmation or alert...');
    for (let i = 0; i < 10; i++) {
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
        console.log('Closed Enterpret tab.');
        return;
      }
    }
    
    console.log('Current URL after submit click:', ep.url());
  } catch(e) {
    console.log('Error:', e.message);
  }
})();
