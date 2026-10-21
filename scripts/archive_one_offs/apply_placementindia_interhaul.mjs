import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('placementindia.com'));
  if (!page) {
    console.log('No placementindia tab found');
    await browser.disconnect();
    return;
  }

  console.log('Submitting application for Interhaul Logistics on PlacementIndia...');

  // Take Pre-submit screenshot
  const screenshotDir = path.resolve('screenshots/2026-10-13');
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
  const preSubmitPath = path.resolve(screenshotDir, 'placementindia_interhaul_presubmit.png');
  await page.screenshot({ path: preSubmitPath });
  console.log('Pre-submit screenshot saved:', preSubmitPath);

  // Fill form fields
  await page.evaluate(() => {
    // Salutation
    const mrRadio = document.querySelector('input[name="salutation"][value="Mr."], input[id*="mr"], input[value="Mr."]');
    if (mrRadio) mrRadio.click();

    // Name
    const nameInput = document.querySelector('#userFullName');
    if (nameInput) {
      nameInput.value = 'Pratik Patidar';
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      nameInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Mobile
    const mobileInput = document.querySelector('#userMobileNo');
    if (mobileInput) {
      mobileInput.value = '8269647990';
      mobileInput.dispatchEvent(new Event('input', { bubbles: true }));
      mobileInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // City
    const cityInput = document.querySelector('#search_city');
    if (cityInput) {
      cityInput.value = 'Indore';
      cityInput.dispatchEvent(new Event('input', { bubbles: true }));
      cityInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Experience: 1 Years
    const expSelect = document.querySelector('#total_work_exp_year');
    if (expSelect) {
      expSelect.value = '1';
      expSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Qualification: B.Tech
    const qualSelect = document.querySelector('#qualification');
    if (qualSelect) {
      qualSelect.value = 'BTECH^UG';
      qualSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

  await new Promise(r => setTimeout(r, 1000));

  // Resume Upload
  const resumeAbsPath = path.resolve('resumes/Pratik Patidar Resume - MERN Full Stack.pdf');
  console.log('Uploading resume:', resumeAbsPath);
  const fileInput = await page.$('input#upload_resume');
  if (fileInput) {
    await fileInput.uploadFile(resumeAbsPath);
  }

  await new Promise(r => setTimeout(r, 2000));

  // Click Submit Application
  console.log('Clicking Submit Application...');
  await page.evaluate(() => {
    const popup = document.querySelector('.popup_box');
    if (popup) {
      const submitBtn = Array.from(popup.querySelectorAll('button[type="submit"], input[type="submit"]')).find(b => (b.innerText || b.value || '').toLowerCase().includes('submit'));
      if (submitBtn) submitBtn.click();
    }
  });

  await new Promise(r => setTimeout(r, 5000));

  // Post Submit check
  const postSubmitPath = path.resolve(screenshotDir, 'placementindia_interhaul_postsubmit.png');
  await page.screenshot({ path: postSubmitPath });
  console.log('Post-submit screenshot saved:', postSubmitPath);

  const finalState = await page.evaluate(() => {
    const popup = document.querySelector('.popup_box');
    return {
      url: window.location.href,
      popupText: popup ? popup.innerText : 'None'
    };
  });

  console.log('Final State after submission:', finalState);
  await browser.disconnect();
})();
