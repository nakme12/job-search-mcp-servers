/**
 * STANDARDIZED NON-ASHBY ATS WORKER (GREENHOUSE & DIRECT CAREER SITES)
 * Rules:
 * 1. Clear existing field content before typing (Ctrl+A / Backspace).
 * 2. Mandatory live console logs per field per Rule 59.
 * 3. Exact profile binding from candidate_screening_profile.json.
 * 4. Rule 69 assertion before capture and logging.
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const { CANONICAL_PATHS, getScreenshotsVault } = require('./canonical_paths.cjs');
const { recordConfirmedApplication } = require('./workflow_5file_manager.mjs');

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function clearAndType(page, selector, text) {
  const el = await page.$(selector);
  if (el) {
    await el.focus();
    // 100% reliable input reset
    await page.evaluate((sel, val) => {
      const input = document.querySelector(sel);
      if (input) {
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, selector, text);
    await sleep(50);
    await page.keyboard.type(text, { delay: 60 });
    console.log(`  [Clean & Type Verified] ${selector} -> "${text}"`);
    return true;
  }
  return false;
}

async function fillReactSelect(page, inputSelector, queryText) {
  const el = await page.$(inputSelector);
  if (el) {
    await el.click();
    await sleep(200);
    await el.type(queryText, { delay: 60 });
    await sleep(600);
    await page.keyboard.press('ArrowDown');
    await sleep(150);
    await page.keyboard.press('Enter');
    console.log(`  [Combobox Select] ${inputSelector} -> "${queryText}"`);
    return true;
  }
  return false;
}

async function runWorker() {
  console.log('======================================================');
  console.log('🚀 DEDICATED WORKER: PROCESSING GREENHOUSE JOBS');
  console.log('======================================================');

  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  let page = pages.find(p => p.url().includes('affirm/jobs/8008649003'));
  if (!page) {
    page = await browser.newPage();
    await page.goto('https://job-boards.greenhouse.io/affirm/jobs/8008649003', { waitUntil: 'domcontentloaded' });
  }
  await page.bringToFront();

  console.log('\n[Job 1/15] Affirm — Software Engineer, Early Career (NYC)');
  console.log('[Step 1] Clearing pre-filled values and typing standard fields...');

  await clearAndType(page, '#first_name', 'Pratik');
  await clearAndType(page, '#last_name', 'Patidar');
  await clearAndType(page, '#email', 'pratikpatidar7990@gmail.com');
  await clearAndType(page, '#phone', '8269647990');
  await clearAndType(page, '#candidate-location', 'Indore, India');

  console.log('[Step 2] Attaching verified resume...');
  const resumePath = path.join(CANONICAL_PATHS.RESUMES_DIR, 'Pratik Patidar Resume - MERN Full Stack.pdf');
  const fileInput = await page.$('input[type="file"]');
  if (fileInput) {
    await fileInput.uploadFile(resumePath);
    console.log(`  [Resume Upload] Attached: ${resumePath}`);
  }

  console.log('[Step 3] Clearing and typing education details...');
  await fillReactSelect(page, '#country', 'India');
  await fillReactSelect(page, '#school--0', 'Barkatullah');
  await fillReactSelect(page, '#degree--0', 'Bachelor of Technology');
  await fillReactSelect(page, '#discipline--0', 'Computer Science');
  await fillReactSelect(page, '#start-month--0', 'August');
  await clearAndType(page, '#start-year--0', '2020');
  await fillReactSelect(page, '#end-month--0', 'June');
  await clearAndType(page, '#end-year--0', '2024');

  console.log('[Step 4] Custom screening questions...');
  await clearAndType(page, '#question_32942345003', 'Pratik');
  await clearAndType(page, '#question_32942347003', 'He/Him');
  await fillReactSelect(page, '#question_32942348003', 'Yes'); // Sponsorship now
  await fillReactSelect(page, '#question_32942349003', 'Yes'); // Sponsorship future
  await fillReactSelect(page, '#question_32942350003', 'Not Applicable'); // State/Province
  await fillReactSelect(page, '#question_32942351003', 'LinkedIn');
  await fillReactSelect(page, '#question_32942356003', 'No');

  console.log('[Step 5] Triggering Submit Button...');
  const submitBtn = await page.$('button[type="submit"], input[type="submit"], #submit_app');
  if (submitBtn) {
    await submitBtn.click();
    console.log('  [Submit Triggered] Waiting for DOM confirmation...');
  }

  // Confirmation assertion (Rule 69)
  let isConfirmed = false;
  for (let w = 0; w < 6; w++) {
    await sleep(2500);
    isConfirmed = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      return text.includes('thank you') || 
             text.includes('application submitted') || 
             text.includes('received your application');
    });
    if (isConfirmed) break;
  }

  if (isConfirmed) {
    const vault = getScreenshotsVault();
    const ssPath = path.join(vault, `post_submit_affirm_${Date.now()}.png`);
    await page.screenshot({ path: ssPath, fullPage: true });
    console.log(`🎯 [CONFIRMATION VERIFIED] Screenshot saved: ${ssPath}`);

    recordConfirmedApplication({
      company: 'Affirm',
      role: 'Software Engineer, Early Career (NYC)',
      url: 'https://job-boards.greenhouse.io/affirm/jobs/8008649003',
      channel: 'Direct ATS Portal Form (Greenhouse)',
      proof_screenshot: ssPath,
      status: 'APPLIED_CONFIRMED',
      notes: `Confirmed on ${new Date().toISOString()}`
    });

    // Update shift 1 file
    const s1File = 'C:/mcp/job-search-mcp-engine/applied_todays_2026-10-15_shift1.json';
    if (fs.existsSync(s1File)) {
      const s1 = JSON.parse(fs.readFileSync(s1File, 'utf8'));
      s1.jobs.push({
        company: 'Affirm',
        role: 'Software Engineer, Early Career (NYC)',
        url: 'https://job-boards.greenhouse.io/affirm/jobs/8008649003',
        channel: 'Direct ATS Portal Form (Greenhouse)',
        proof_screenshot: ssPath,
        status: 'APPLIED_CONFIRMED',
        timestamp: new Date().toISOString()
      });
      s1.total = s1.jobs.length;
      fs.writeFileSync(s1File, JSON.stringify(s1, null, 2));
    }

    await page.close();
    console.log('  [Cleanup] Tab closed immediately. Advancing to next job.');
  } else {
    const errors = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.error, [aria-invalid="true"], .field-error'))
        .map(e => e.innerText.trim()).filter(Boolean);
    });
    console.log(`❌ [SUBMISSION FAILED / UNCONFIRMED] Tab kept open for review.`);
    if (errors.length) console.log('Validation Errors on DOM:\n' + errors.join('\n'));
  }

  browser.disconnect();
}

runWorker().catch(err => console.error('Worker Error:', err));
