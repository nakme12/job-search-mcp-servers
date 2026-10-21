/**
 * APPLY CISCO NEW GRAD APPLICATION
 * URL: https://careers.cisco.com/global/en/hvhapply?jobSeqNo=CISCISGLOBAL2009166EXTERNALENGLOBAL
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const StorageWriteGuard = require('./guards/storage_write_guard.cjs');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const page = await browser.newPage();
    const applyUrl = 'https://careers.cisco.com/global/en/hvhapply?jobSeqNo=CISCISGLOBAL2009166EXTERNALENGLOBAL';
    
    console.log('[CISCO] Navigating to Cisco application page...');
    await page.goto(applyUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await sleep(4000);
    
    // Upload Resume
    const resumePath = path.resolve('C:/mcp/job-search-mcp-engine/resumes/Pratik Patidar Resume - Frontend Engineer.pdf');
    console.log('[CISCO] Uploading resume:', resumePath);
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      await fileInput.uploadFile(resumePath);
      console.log('[CISCO] Resume uploaded, waiting 5s...');
      await sleep(5000);
    }
    
    // Select Country or Region
    console.log('[CISCO] Selecting Country: India...');
    try {
      await page.select('select#country', 'IN');
    } catch(e) {
      await page.evaluate(() => {
        const s = document.querySelector('select#country');
        if (s) {
          const opt = Array.from(s.options).find(o => o.text.toLowerCase().includes('india'));
          if (opt) {
            s.value = opt.value;
            s.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      });
    }
    await sleep(1500);
    
    // Legal Given Name
    console.log('[CISCO] Setting Given Name...');
    await page.$eval('#cntryFields\\.givenName', el => { el.value = 'Pratik'; el.dispatchEvent(new Event('input', {bubbles: true})); });
    
    // Legal Family Name
    console.log('[CISCO] Setting Family Name...');
    await page.$eval('#cntryFields\\.familyName', el => { el.value = 'Patidar'; el.dispatchEvent(new Event('input', {bubbles: true})); });
    
    // City
    console.log('[CISCO] Setting City: Indore...');
    await page.$eval('#cntryFields\\.city', el => { el.value = 'Indore'; el.dispatchEvent(new Event('input', {bubbles: true})); });
    
    // State / Region
    console.log('[CISCO] Setting State: Madhya Pradesh...');
    try {
      await page.evaluate(() => {
        const s = document.querySelector('select#cntryFields\\.region');
        if (s) {
          const opt = Array.from(s.options).find(o => o.text.toLowerCase().includes('madhya'));
          if (opt) {
            s.value = opt.value;
            s.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      });
    } catch(e) {}
    
    // Email Address
    console.log('[CISCO] Setting Email...');
    await page.$eval('#email', el => { el.value = 'pratikpatidar7990@gmail.com'; el.dispatchEvent(new Event('input', {bubbles: true})); });
    
    // Phone Device Type
    console.log('[CISCO] Setting Phone Device Type: Mobile...');
    try {
      await page.evaluate(() => {
        const s = document.querySelector('select#deviceType');
        if (s) {
          const opt = Array.from(s.options).find(o => o.text.toLowerCase().includes('mobile'));
          if (opt) {
            s.value = opt.value;
            s.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      });
    } catch(e) {}
    
    // Country Phone Code
    console.log('[CISCO] Setting Country Phone Code: India (+91)...');
    try {
      await page.evaluate(() => {
        const s = document.querySelector('select#phoneWidget\\.countryPhoneCode');
        if (s) {
          const opt = Array.from(s.options).find(o => o.text.includes('+91') || o.text.toLowerCase().includes('india'));
          if (opt) {
            s.value = opt.value;
            s.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      });
    } catch(e) {}
    
    // Phone Number
    console.log('[CISCO] Setting Phone Number: 8269647990...');
    await page.$eval('#phoneWidget\\.phoneNumber', el => { el.value = '8269647990'; el.dispatchEvent(new Event('input', {bubbles: true})); });
    
    // How Did You Hear About Us
    console.log('[CISCO] Setting Source: Job Board / Careers Site...');
    try {
      await page.evaluate(() => {
        const s = document.querySelector('select#applicantSource');
        if (s && s.options.length > 1) {
          s.selectedIndex = 1;
          s.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    } catch(e) {}
    
    // Previous Worker: No
    console.log('[CISCO] Setting Previous Worker: No...');
    const noRadio = await page.$('#previousWorkerConfirmation\\.No');
    if (noRadio) await noRadio.click();
    
    await sleep(2000);
    
    // Click Next button
    console.log('[CISCO] Clicking Next button on Step 1...');
    const nextBtn = await page.$('button.btn-next, button[type="submit"]') || await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().trim() === 'next');
      if (btn) { btn.click(); return true; }
      return false;
    });
    if (nextBtn && typeof nextBtn.click === 'function') await nextBtn.click();
    
    console.log('[CISCO] Step 1 submitted, awaiting Step 2...');
    await sleep(5000);
    
    const currentStepText = await page.evaluate(() => {
      return {
        url: window.location.href,
        text: document.body.innerText.slice(0, 300).replace(/\n+/g, ' ')
      };
    });
    console.log('[CISCO] Current step after Next click:', currentStepText);
    
  } catch(e) {
    console.error('[CISCO] Error:', e.message);
  }
})();
