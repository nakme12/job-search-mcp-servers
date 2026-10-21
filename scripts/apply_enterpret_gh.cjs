/**
 * APPLY ENTERPRET (GREENHOUSE ATS)
 * Target: https://job-boards.greenhouse.io/enterpret/jobs/7847134003
 * Company: Enterpret
 * Role: Software Engineering Intern
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const { appendSubmissionToStorage } = require('./guards/storage_write_guard.cjs');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
    const page = await browser.newPage();
    
    console.log('[ENTERPRET] Navigating to Greenhouse ATS form...');
    const url = 'https://job-boards.greenhouse.io/enterpret/jobs/7847134003';
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 35000 });
    await sleep(3000);
    
    // Fill first_name
    console.log('[ENTERPRET] Filling first_name...');
    await page.waitForSelector('#first_name', { timeout: 10000 });
    await page.$eval('#first_name', el => { el.value = ''; el.dispatchEvent(new Event('input', {bubbles: true})); });
    await page.type('#first_name', 'Pratik');
    
    // Fill last_name
    console.log('[ENTERPRET] Filling last_name...');
    await page.$eval('#last_name', el => { el.value = ''; el.dispatchEvent(new Event('input', {bubbles: true})); });
    await page.type('#last_name', 'Patidar');
    
    // Fill email
    console.log('[ENTERPRET] Filling email...');
    await page.$eval('#email', el => { el.value = ''; el.dispatchEvent(new Event('input', {bubbles: true})); });
    await page.type('#email', 'pratikpatidar7990@gmail.com');
    
    // Phone country code & phone number
    console.log('[ENTERPRET] Selecting India (+91)...');
    try {
      await page.select('#phone_country_code', 'IN');
    } catch(e) {
      console.log('[ENTERPRET] phone_country_code select failed or not needed:', e.message);
    }
    
    console.log('[ENTERPRET] Filling phone number...');
    await page.$eval('#phone', el => { el.value = ''; el.dispatchEvent(new Event('input', {bubbles: true})); });
    await page.type('#phone', '8269647990');
    
    // Upload Resume
    const resumePath = path.resolve('resumes/Pratik Patidar Resume - MERN Full Stack.pdf');
    console.log('[ENTERPRET] Uploading resume:', resumePath);
    const fileInput = await page.$('input[type="file"]#resume');
    if (fileInput) {
      await fileInput.uploadFile(resumePath);
      console.log('[ENTERPRET] Resume uploaded successfully.');
      await sleep(2000);
    } else {
      console.log('[ENTERPRET] #resume input not found, searching generic file input...');
      const genInput = await page.$('input[type="file"]');
      if (genInput) await genInput.uploadFile(resumePath);
    }
    
    // Custom questions: LinkedIn and Website
    console.log('[ENTERPRET] Filling LinkedIn Profile...');
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
      for (const i of inputs) {
        const label = (i.closest('label')?.innerText || i.parentElement?.innerText || '').toLowerCase();
        if (label.includes('linkedin')) {
          i.value = 'https://www.linkedin.com/in/pratik-patidar';
          i.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (label.includes('website') || label.includes('portfolio')) {
          i.value = 'https://pratik-portfolio-nine-orcin.vercel.app';
          i.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    });
    
    await sleep(2000);
    
    // Check reCAPTCHA
    const hasCaptcha = await page.evaluate(() => {
      const frames = Array.from(document.querySelectorAll('iframe'));
      return frames.some(f => (f.src || '').includes('recaptcha') || (f.src || '').includes('turnstile'));
    });
    
    console.log('[ENTERPRET] Captcha check result:', hasCaptcha ? 'DETECTED' : 'NOT_FOUND');
    
    if (hasCaptcha) {
      console.log('🚨 USER ALERT: ReCAPTCHA detected on Enterpret application! Please solve captcha if needed.');
    }
    
    // Click submit button
    console.log('[ENTERPRET] Clicking Submit Application button...');
    const submitBtn = await page.$('button[type="submit"], input[type="submit"], button#submit_app');
    if (submitBtn) {
      await submitBtn.click();
    } else {
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('submit'));
        if (btn) btn.click();
      });
    }
    
    console.log('[ENTERPRET] Awaiting submission confirmation (up to 20 seconds)...');
    let isConfirmed = false;
    let screenshotPath = '';
    
    for (let i = 0; i < 20; i++) {
      await sleep(1000);
      const text = await page.evaluate(() => document.body.innerText.toLowerCase());
      if (text.includes('thank you') || text.includes('application submitted') || text.includes('received your application') || text.includes('your application has been submitted')) {
        isConfirmed = true;
        break;
      }
    }
    
    if (isConfirmed) {
      const timestamp = Date.now();
      screenshotPath = path.resolve(`screenshots/2026-10-21/shift1/Enterpret_Greenhouse_Confirmed_${timestamp}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log('✅ [ENTERPRET] Application submitted! Screenshot saved:', screenshotPath);
      
      const entry = {
        id: `enterpret_gh_${timestamp}`,
        company: 'Enterpret',
        role: 'Software Engineering Intern',
        portal_type: 'Direct ATS (Greenhouse)',
        apply_url: url,
        status: 'SUBMITTED',
        applied_at: new Date().toISOString(),
        screenshot_path: screenshotPath,
        notes: 'Submitted directly via Greenhouse ATS with live confirmation assertion'
      };
      
      appendSubmissionToStorage(entry);
      console.log('✅ [ENTERPRET] Recorded in applied_todays_2026-10-21.json');
      await page.close();
    } else {
      console.log('⚠️ [ENTERPRET] Confirmation not automatically detected. Waiting 15s for user intervention or checking form errors...');
      const errors = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.error, [aria-invalid="true"], .invalid-feedback')).map(e => e.innerText);
      });
      console.log('Live errors on page:', errors);
      console.log('Page URL is still:', page.url());
    }
    
  } catch(e) {
    console.error('❌ [ENTERPRET] Error:', e.message);
  }
})();
