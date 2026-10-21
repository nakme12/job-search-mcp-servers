/**
 * AUTOMATED MULTI-STEP APPLICATION ENGINE FOR MASTERCARD PHENIX ATS
 * Company: Mastercard
 * Role: Software Engineer I-1 (Pune, India)
 * Target URL: https://careers.mastercard.com/us/en/apply?jobSeqNo=MASRUSR293576EXTERNALENUS&source=LINKEDIN
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
    const applyUrl = 'https://careers.mastercard.com/us/en/apply?jobSeqNo=MASRUSR293576EXTERNALENUS&source=LINKEDIN';
    
    console.log('[MASTERCARD] Navigating to application form...');
    await page.goto(applyUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await sleep(4000);
    
    // Upload Resume
    const resumePath = path.resolve('C:/mcp/job-search-mcp-engine/resumes/Pratik Patidar Resume - Frontend Engineer.pdf');
    console.log('[MASTERCARD] Uploading resume:', resumePath);
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      await fileInput.uploadFile(resumePath);
      console.log('[MASTERCARD] Resume uploaded, waiting 5s...');
      await sleep(5000);
    }
    
    // Country: India
    console.log('[MASTERCARD] Selecting Country: India...');
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
    await sleep(1500);
    
    // First Name
    console.log('[MASTERCARD] Setting First Name: Pratik...');
    await page.$eval('#cntryFields\\.firstName', el => { el.value = 'Pratik'; el.dispatchEvent(new Event('input', {bubbles: true})); });
    
    // Last Name
    console.log('[MASTERCARD] Setting Last Name: Patidar...');
    await page.$eval('#cntryFields\\.lastName', el => { el.value = 'Patidar'; el.dispatchEvent(new Event('input', {bubbles: true})); });
    
    // Address Line 1
    console.log('[MASTERCARD] Setting Address: Indore, Madhya Pradesh...');
    await page.$eval('#cntryFields\\.addressLine1', el => { el.value = 'Indore, Madhya Pradesh'; el.dispatchEvent(new Event('input', {bubbles: true})); });
    
    // City
    console.log('[MASTERCARD] Setting City: Indore...');
    await page.$eval('#cntryFields\\.city', el => { el.value = 'Indore'; el.dispatchEvent(new Event('input', {bubbles: true})); });
    
    // Postal Code
    console.log('[MASTERCARD] Setting Postal Code: 452001...');
    await page.$eval('#cntryFields\\.postalCode', el => { el.value = '452001'; el.dispatchEvent(new Event('input', {bubbles: true})); });
    
    // Email
    console.log('[MASTERCARD] Setting Email: pratikpatidar7990@gmail.com...');
    await page.$eval('#email', el => { el.value = 'pratikpatidar7990@gmail.com'; el.dispatchEvent(new Event('input', {bubbles: true})); });
    
    // Device Type: Mobile
    console.log('[MASTERCARD] Selecting Device Type: Mobile...');
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
    await sleep(1000);
    
    // Country Phone Code: +91
    console.log('[MASTERCARD] Selecting Country Code: +91...');
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
    await sleep(1000);
    
    // Phone Number: 8269647990
    console.log('[MASTERCARD] Setting Phone Number: 8269647990...');
    await page.$eval('#phoneWidget\\.phoneNumber', el => { el.value = '8269647990'; el.dispatchEvent(new Event('input', {bubbles: true})); });
    
    // Source Type
    console.log('[MASTERCARD] Selecting Source...');
    await page.evaluate(() => {
      const s = document.querySelector('select#sourceType');
      if (s && s.options.length > 1) {
        s.selectedIndex = 1;
        s.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await sleep(1000);
    
    // Previous Worker: No
    console.log('[MASTERCARD] Previous Worker: No...');
    const noRadio = await page.$('#previousworker\\.No');
    if (noRadio) await noRadio.click();
    
    await sleep(2000);
    
    // Click Next button on Step 1
    console.log('[MASTERCARD] Clicking Next button...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().trim() === 'next');
      if (btn) btn.click();
    });
    
    await sleep(5000);
    
    const step2Info = await page.evaluate(() => {
      return {
        url: window.location.href,
        inputsCount: document.querySelectorAll('input:not([type="hidden"]), select, textarea').length,
        snippet: document.body.innerText.slice(0, 300).replace(/\n+/g, ' ')
      };
    });
    console.log('[MASTERCARD] Step 2 Info:', step2Info);
    
  } catch(e) {
    console.error('[MASTERCARD] Error:', e.message);
  }
})();
