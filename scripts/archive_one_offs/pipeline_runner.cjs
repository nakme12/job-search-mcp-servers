/**
 * UNIVERSAL ATS GATEKEEPER & WORKER ENGINE
 * 
 * Flow for ANY Job URL:
 * 1. Open Job URL.
 * 2. Pass DOM through auditJobText() from job_gatekeeper.cjs.
 *    -> If FAIL: Print reason, close tab immediately, return { applied: false, reason }
 * 3. Detect form type:
 *    - Greenhouse ATS
 *    - Ashby ATS
 *    - Lever ATS
 *    - Workable / Breezy
 *    - Contact Form 7 / Custom Company Form
 * 4. Fill strictly from candidate_screening_profile.json
 * 5. Check for CAPTCHA (reCAPTCHA, Turnstile, hCaptcha)
 *    -> If found: trigger alert to user, pause.
 * 6. Submit form.
 * 7. Assert physical confirmation text in DOM.
 * 8. Capture strictly ONE post-submit screenshot.
 * 9. Update applied_todays JSONs and immediately close tab.
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const { auditJobText } = require('./job_gatekeeper.cjs');

const PROFILE_PATH = 'C:/mcp/job-search-mcp-engine/candidate_screening_profile.json';
const RESUME_PATH = 'C:/mcp/job-search-mcp-engine/resumes/Pratik Patidar Resume - React Developer.pdf';

async function connectBrowser() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const data = await res.json();
  return await puppeteer.connect({ browserWSEndpoint: data.webSocketDebuggerUrl });
}

async function auditAndProcessJob(url, companyName = 'Company') {
  const browser = await connectBrowser();
  const page = await browser.newPage();
  
  console.log(`\n======================================================`);
  console.log(`[AUDIT] Opening: ${companyName} (${url})`);
  
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2500));

    const pageInfo = await page.evaluate(() => ({
      title: document.title,
      url: window.location.href,
      bodyText: document.body.innerText
    }));

    // GATE 1: AUDIT JD & FRESHNESS & YOE
    const auditResult = auditJobText(pageInfo.bodyText, pageInfo.title);
    if (!auditResult.passed) {
      console.log(`❌ [GATEKEEPER REJECTED] ${companyName}: ${auditResult.reason}`);
      await page.close();
      return { status: 'REJECTED', reason: auditResult.reason };
    }

    console.log(`✅ [GATEKEEPER PASSED] ${companyName} is Clean & Fits 0-2 YOE!`);

    // Check if CAPTCHA exists
    const hasCaptcha = await page.evaluate(() => {
      return !!(
        document.querySelector('iframe[src*="recaptcha"]') ||
        document.querySelector('iframe[src*="turnstile"]') ||
        document.querySelector('iframe[src*="hcaptcha"]') ||
        document.querySelector('.g-recaptcha') ||
        document.querySelector('.cf-turnstile')
      );
    });

    if (hasCaptcha) {
      console.log(`⚠️ [CAPTCHA DETECTED] Human intervention needed on ${companyName}`);
      await page.bringToFront();
      return { status: 'CAPTCHA_WAIT', page };
    }

    return { status: 'READY_TO_FILL', page, title: pageInfo.title };

  } catch (err) {
    console.error(`[ERROR] Processing ${companyName}:`, err.message);
    try { await page.close(); } catch (_) {}
    return { status: 'ERROR', message: err.message };
  }
}

module.exports = { auditAndProcessJob, connectBrowser, PROFILE_PATH, RESUME_PATH };
