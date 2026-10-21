const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

async function submitAmEx() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const amex = pages.find(p => p.url().includes('oraclecloud.com'));
  if (!amex) {
    console.log('AmEx page not found');
    return;
  }

  console.log('1. Setting Gender and Full Name Signature...');
  await amex.evaluate(() => {
    // Signature
    const sig = document.querySelector('input[name="fullName"]');
    if (sig) {
      sig.value = 'Pratik Patidar';
      sig.dispatchEvent(new Event('input', { bubbles: true }));
      sig.dispatchEvent(new Event('change', { bubbles: true }));
    }
    // Gender
    const gender = document.querySelector('input[name="IN-DFF-axpOrcGenderIntl-ATTRIBUTE9"]');
    if (gender) {
      gender.value = 'Male';
      gender.dispatchEvent(new Event('input', { bubbles: true }));
      gender.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

  await new Promise(r => setTimeout(r, 1000));

  console.log('2. Clicking Submit Button...');
  const submitClicked = await amex.evaluate(() => {
    const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim().toLowerCase() === 'submit' && !b.disabled);
    if (submitBtn) {
      submitBtn.click();
      return true;
    }
    return false;
  });

  console.log('Submit button clicked?', submitClicked);

  // Wait for submission response / confirmation
  console.log('3. Waiting for Confirmation Screen...');
  await new Promise(r => setTimeout(r, 6000));

  const pageText = await amex.evaluate(() => document.body ? document.body.innerText : '');
  const pageTitle = await amex.title();
  const currentUrl = amex.url();

  console.log('Page Title:', pageTitle);
  console.log('Current URL:', currentUrl);
  console.log('Page Text Preview:\n', pageText.slice(0, 500));

  const isConfirmed = /thank you|application submitted|received your application|success|congratulations/i.test(pageText) || /thank you/i.test(pageTitle);

  if (isConfirmed) {
    console.log('✅ CONFIRMATION DETECTED!');
    const vaultDir = path.resolve('screenshots/2026-10-19/shift1');
    if (!fs.existsSync(vaultDir)) fs.mkdirSync(vaultDir, { recursive: true });

    const screenshotPath = path.join(vaultDir, 'amex_software_engineer_1_applied.png');
    await amex.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Confirmation screenshot saved to ${screenshotPath}`);

    // Update applied_todays_2026-10-19.json
    const appliedPath = path.resolve('applied_todays_2026-10-19.json');
    const appliedData = JSON.parse(fs.readFileSync(appliedPath, 'utf8'));

    const newJobRecord = {
      id: 'amex_se1_' + Date.now(),
      company: 'American Express',
      role: 'Software Engineer I',
      location: 'India / Hybrid',
      compensation: '₹17 LPA',
      application_type: 'Direct ATS Portal (Oracle Cloud)',
      url: currentUrl,
      source: 'American Express Careers ATS',
      status: 'CONFIRMED_APPLIED',
      submitted_at: new Date().toISOString(),
      screenshot_proof: screenshotPath
    };

    appliedData.jobs.push(newJobRecord);
    appliedData.total = appliedData.jobs.length;
    fs.writeFileSync(appliedPath, JSON.stringify(appliedData, null, 2));

    console.log(`Successfully logged American Express into applied_todays_2026-10-19.json! Total applied now: ${appliedData.total}`);

    // Prune Tab per Rule 57
    console.log('Pruning submitted tab per Rule 57...');
    await amex.close();
    console.log('Tab closed successfully.');
  } else {
    console.log('⚠️ Confirmation text not yet detected or validation error occurred.');
    const errorEls = await amex.evaluate(() => {
      return Array.from(document.querySelectorAll('.oj-message-detail, .oj-text-field-error, [role="alert"]')).map(e => e.innerText.trim());
    });
    console.log('Errors if any:', errorEls);
  }
}

submitAmEx().catch(console.error);
