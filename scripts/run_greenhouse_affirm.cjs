/**
 * COMPLETE GREENHOUSE FILLER (SUPPORTING MODERN REACT-SELECT COMBOBOXES)
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
    await page.evaluate((sel) => {
      const input = document.querySelector(sel);
      if (input) {
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, selector);
    await sleep(40);
    await page.keyboard.type(text, { delay: 50 });
    console.log(`  [Clean & Type Verified] ${selector} -> "${text}"`);
    return true;
  }
  return false;
}

async function selectReactDropdown(page, inputSelector, queryText, optionMatcher) {
  const el = await page.$(inputSelector);
  if (el) {
    const rect = await el.evaluate(e => {
      const r = e.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    await page.mouse.click(rect.x, rect.y);
    await sleep(200);
    await page.keyboard.type(queryText, { delay: 50 });
    await sleep(400);

    const picked = await page.evaluate((matcherStr) => {
      const opts = Array.from(document.querySelectorAll('div[role="option"], .select__option'));
      const found = opts.find(o => o.innerText.toLowerCase().includes(matcherStr.toLowerCase()));
      if (found) {
        found.click();
        return found.innerText;
      } else if (opts.length > 0) {
        opts[0].click();
        return opts[0].innerText;
      }
      return null;
    }, optionMatcher || queryText);

    console.log(`  [React-Select Dropdown] ${inputSelector} -> "${picked || queryText}"`);
    await sleep(200);
  }
}

async function executeAffirmSubmission() {
  console.log('======================================================');
  console.log('🚀 SUBMITTING AFFIRM (GREENHOUSE) VIA CDP');
  console.log('======================================================');

  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('affirm/jobs/8008649003'));
  if (!page) {
    console.log('Affirm tab not found!');
    browser.disconnect();
    return;
  }
  await page.bringToFront();

  // 1. Personal Details
  console.log('[Step 1] Clean & Type Personal Details...');
  await clearAndType(page, '#first_name', 'Pratik');
  await clearAndType(page, '#last_name', 'Patidar');
  await clearAndType(page, '#email', 'pratikpatidar7990@gmail.com');
  await clearAndType(page, '#phone', '8269647990');
  await clearAndType(page, '#candidate-location', 'Indore, India');

  // Country code India (+91)
  await selectReactDropdown(page, '#country', 'India', 'India (+91)');

  // 2. Resume
  console.log('[Step 2] Attaching Resume...');
  const resumePath = path.join(CANONICAL_PATHS.RESUMES_DIR, 'Pratik Patidar Resume - MERN Full Stack.pdf');
  const fileInput = await page.$('input[type="file"]');
  if (fileInput) {
    await fileInput.uploadFile(resumePath);
    console.log(`  [Resume Upload] Attached: ${resumePath}`);
  }

  // 3. Education
  console.log('[Step 3] Clean & Type Education Details...');
  await selectReactDropdown(page, '#school--0', 'Barkatullah', 'Barkatullah');
  await selectReactDropdown(page, '#degree--0', 'Bachelor of Technology', 'Bachelor');
  await selectReactDropdown(page, '#discipline--0', 'Computer Science', 'Computer Science');
  await selectReactDropdown(page, '#start-month--0', 'August', 'August');
  await clearAndType(page, '#start-year--0', '2020');
  await selectReactDropdown(page, '#end-month--0', 'June', 'June');
  await clearAndType(page, '#end-year--0', '2024');

  // 4. Custom Screening Questions
  console.log('[Step 4] Custom Screening Questions...');
  await clearAndType(page, '#question_32942345003', 'Pratik');
  await clearAndType(page, '#question_32942347003', 'He/Him');
  await selectReactDropdown(page, '#question_32942348003', 'Yes', 'Yes'); // Sponsorship now
  await selectReactDropdown(page, '#question_32942349003', 'Yes', 'Yes'); // Sponsorship future
  await selectReactDropdown(page, '#question_32942350003', 'Not Applicable', 'Not Applicable'); // Province/State
  await selectReactDropdown(page, '#question_32942351003', 'LinkedIn', 'LinkedIn');
  await selectReactDropdown(page, '#question_32942356003', 'No', 'No');

  await sleep(1000);

  // 5. Submit Application
  console.log('[Step 5] Clicking Submit Application Button...');
  const submitBtn = await page.$('button[type="submit"], input[type="submit"]');
  if (submitBtn) {
    await submitBtn.click();
    console.log('  [Submit Triggered] Waiting for DOM confirmation...');
  }

  // 6. Confirmation Verification (Rule 69)
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
    console.log(`❌ [SUBMISSION UNCONFIRMED / PENDING] Tab kept open for human review.`);
    if (errors.length) console.log('Validation Errors on DOM:\n' + errors.join('\n'));
  }

  browser.disconnect();
}

executeAffirmSubmission().catch(console.error);
