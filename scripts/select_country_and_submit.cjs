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
      console.log('No enterpret tab open');
      return;
    }
    
    console.log('Interacting with React-Select Country dropdown...');
    const countryControl = await ep.$('.select__control');
    if (countryControl) {
      await countryControl.click();
      await sleep(800);
      await ep.keyboard.type('India');
      await sleep(800);
      await ep.keyboard.press('Enter');
      console.log('Entered India into select box.');
      await sleep(1000);
    }
    
    // Now trigger form submit
    console.log('Clicking Submit application button...');
    const submitBtn = await ep.$('#submit_app') || await ep.$('button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
      console.log('Submit button clicked.');
    }
    
    console.log('Polling for confirmation message...');
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
        console.log('Successfully recorded in File 5 and tab pruned.');
        return;
      }
    }
    
    const errorsAfter = await ep.evaluate(() => {
      const p = document.querySelectorAll('.helper-text--error, .select__label--error, .grecaptcha-error');
      return Array.from(p).map(x => x.innerText);
    });
    console.log('Errors remaining after submission attempt:', errorsAfter);
    
  } catch(e) {
    console.error('Error:', e.message);
  }
})();
