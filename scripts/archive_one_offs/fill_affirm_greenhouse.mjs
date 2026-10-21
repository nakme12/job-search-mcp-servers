import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const TRACKER_FILE = path.resolve('applied_and_seen_tracker.json');
const RESUME_FILE = path.resolve('resumes/Pratik Patidar Resume - React Developer.pdf');
const SCREENSHOT_DIR = path.resolve('screenshots/2026-10-12');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fillAffirm() {
  console.log('\n======================================================');
  console.log('🚀 EXECUTING PORTAL SUBMISSION: Affirm (Greenhouse ATS)');
  console.log('Role: Software Engineer I, Frontend (Upfunnel)');
  console.log('======================================================');

  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  page.setDefaultTimeout(30000);

  try {
    await page.goto('https://job-boards.greenhouse.io/affirm/jobs/7985907003', { waitUntil: 'networkidle2' });
    console.log('Page loaded:', await page.title());

    // 1. First Name
    const firstName = await page.$('input[autocomplete="given-name"], input#first_name, input[name="first_name"]');
    if (firstName) {
      await firstName.type('Pratik', { delay: 30 });
    }

    // 2. Last Name
    const lastName = await page.$('input[autocomplete="family-name"], input#last_name, input[name="last_name"]');
    if (lastName) {
      await lastName.type('Patidar', { delay: 30 });
    }

    // 3. Email
    const email = await page.$('input[autocomplete="email"], input#email, input[name="email"]');
    if (email) {
      await email.type('pratikpatidar7990@gmail.com', { delay: 30 });
    }

    // 4. Phone
    const phone = await page.$('input[autocomplete="tel"], input#phone, input[name="phone"]');
    if (phone) {
      await phone.type('+91 82696 47990', { delay: 30 });
    }

    // 5. LinkedIn URL
    const linkedin = await page.$('input[aria-label*="LinkedIn"], input[name*="linkedin"], input#job_application_answers_attributes_0_text_value');
    if (linkedin) {
      await linkedin.type('https://www.linkedin.com/in/pratik-patidar', { delay: 25 });
    }

    // 6. Portfolio / Website
    const website = await page.$('input[aria-label*="Website"], input[aria-label*="Portfolio"], input[name*="website"]');
    if (website) {
      await website.type('https://pratik-portfolio-nine-orcin.vercel.app', { delay: 25 });
    }

    // 7. Resume Upload
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      console.log('Uploading tailored resume:', RESUME_FILE);
      await fileInput.uploadFile(RESUME_FILE);
      await sleep(4000);
    }

    // 8. Capture Pre-Submit Screenshot Proof (Rule 37)
    const preSubmitPath = path.join(SCREENSHOT_DIR, 'pre_submit_affirm.png');
    await page.screenshot({ path: preSubmitPath, fullPage: true });
    console.log(`📸 [PRE-SUBMIT PROOF CAPTURED]: ${preSubmitPath}`);

    // Log pre-submit status for review
    console.log('Affirm Greenhouse form filled cleanly with native events.');
  } catch (err) {
    console.error('Error during Affirm form filling:', err.message);
  } finally {
    // Keep tab open for assertion / review or clean close
    // await page.close();
    browser.disconnect();
  }
}

fillAffirm().catch(console.error);
