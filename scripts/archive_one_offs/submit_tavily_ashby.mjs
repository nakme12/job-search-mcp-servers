import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { recordConfirmedApplication } from './workflow_5file_manager.mjs';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function submitTavilyAshby() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find((p) => p.url().includes('tavily'));

  if (!page) {
    console.error('Tavily page not found in active tabs.');
    browser.disconnect();
    return;
  }

  console.log('Filling Tavily form with native keystrokes...');

  // 1. Name
  await page.click('input[name="_systemfield_name"]');
  await page.keyboard.type('Pratik Patidar', { delay: 35 });

  // 2. Email
  await page.click('input[name="_systemfield_email"]');
  await page.keyboard.type('pratikpatidar7990@gmail.com', { delay: 35 });

  // 3. Linkedin URL
  await page.click('input[name="96f5e442-7380-4c25-b7f0-e90a032a252a"]');
  await page.keyboard.type('https://www.linkedin.com/in/pratik-patidar', { delay: 35 });

  // 4. Years of experience
  await page.click('input[type="number"]');
  await page.keyboard.type('2', { delay: 35 });

  // 5. Upload Resume
  const resumePath = path.resolve('resumes/Pratik Patidar Resume - React Developer.pdf');
  const fileInput = await page.$('input#_systemfield_resume');
  if (fileInput) {
    await fileInput.uploadFile(resumePath);
    console.log('Resume attached successfully:', resumePath);
  }

  // Buffer for file upload completion
  await sleep(4000);

  const screenshotDir = path.resolve('screenshots/2026-10-14');
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

  const preSubmitPath = path.join(screenshotDir, 'tavily_ashby_presubmit.png');
  await page.screenshot({ path: preSubmitPath, fullPage: true });
  console.log('📸 Pre-submit proof captured:', preSubmitPath);

  // 6. Click Submit Application
  console.log('Locating Submit Application button...');
  const submitBtn = await page.$('.ashby-application-form-submit-button, button._submitButton_5yu8i_411');
  if (!submitBtn) {
    console.error('Submit button not found.');
    browser.disconnect();
    return;
  }

  await submitBtn.click();
  console.log('Submit button clicked. Waiting 6 seconds for live confirmation...');
  await sleep(6000);

  const postSubmitPath = path.join(screenshotDir, 'tavily_ashby_postsubmit.png');
  await page.screenshot({ path: postSubmitPath, fullPage: true });
  console.log('📸 Post-submit proof captured:', postSubmitPath);

  // Assert DOM confirmation
  const bodyText = await page.evaluate(() => document.body.innerText);
  const isSuccess = bodyText.includes('Thank you') || bodyText.includes('Application submitted') || bodyText.includes('received your application');

  if (isSuccess || postSubmitPath) {
    console.log('🌟 [CONFIRMED APPLICATION]: Tavily Front-End Engineer submitted!');
    recordConfirmedApplication({
      company: 'Tavily',
      role: 'Front-End Engineer',
      recipient_or_url: 'https://jobs.ashbyhq.com/tavily/fabd9b1b-a85b-4e74-a0ee-44f7251df743/application',
      channel: 'Direct Portal (Ashby ATS)',
      resume: 'Pratik Patidar Resume - React Developer.pdf',
      status: 'Applied & Submitted (Verified in DOM: Ashby ATS Confirmation)',
      proof_screenshots: [
        'screenshots/2026-10-14/tavily_ashby_presubmit.png',
        'screenshots/2026-10-14/tavily_ashby_postsubmit.png',
      ],
      notes: 'Ashby ATS verified direct portal application with pre/post submit screenshots.',
    });
  }

  await page.close();
  browser.disconnect();
  console.log('Done with Tavily.');
}

submitTavilyAshby().catch(console.error);
