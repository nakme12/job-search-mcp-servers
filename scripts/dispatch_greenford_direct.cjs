const puppeteer = require('puppeteer-core');
const fs = require('fs');

const sleep = ms => new Promise(r => setTimeout(r, ms));
const RESUME_PATH = 'C:\\mcp\\job-search-mcp-engine\\resumes\\Pratik Patidar Resume - Frontend Engineer.pdf';
const RECIPIENT = 'hrd@greenfordconstruction.co.uk';
const SUBJECT = 'Application / Introduction: Software Engineer - Pratik Patidar';

(async () => {
  let browser;
  try {
    console.log('[Direct Dispatch] Connecting to browser...');
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', protocolTimeout: 60000 });
    const pages = await browser.pages();
    let page = pages.find(p => p.url().includes('mail.google.com'));
    if (!page) {
      console.error('No Gmail tab found!');
      return;
    }
    await page.bringToFront();

    // Click "Compose" button
    console.log('Clicking Compose button...');
    await page.evaluate(() => {
      const composeBtn = document.querySelector('div[role="button"][gh="cm"], div.T-I.T-I-KE[role="button"]');
      if (composeBtn) composeBtn.click();
    });
    await sleep(2500);

    // Verify compose box is open
    const recipientInput = await page.$('input[aria-label="To recipients"], input[peoplekit-id]');
    if (!recipientInput) {
      console.error('Compose recipient input not found!');
      return;
    }

    console.log('Typing recipient:', RECIPIENT);
    await recipientInput.click();
    await sleep(300);
    await recipientInput.type(RECIPIENT, { delay: 30 });
    await sleep(500);
    await page.keyboard.press('Enter');
    await sleep(500);

    // Type Subject
    console.log('Typing subject:', SUBJECT);
    const subjectInput = await page.$('input[name="subjectbox"]');
    if (subjectInput) {
      await subjectInput.click();
      await sleep(300);
      await subjectInput.type(SUBJECT, { delay: 20 });
      await sleep(500);
    }

    // Type Body
    console.log('Typing body...');
    const bodyEditor = await page.$('div[aria-label="Message Body"]');
    if (bodyEditor) {
      await bodyEditor.click();
      await sleep(300);

      const lines = [
        "Hi Greenford Hiring Team,",
        "",
        "Thank you for reaching out regarding the opportunity at Greenford Construction Limited.",
        "",
        "I am a Software / Frontend Engineer with 1.5 years of experience specializing in React.js, Next.js, TypeScript, JavaScript, REST APIs, and responsive UI development. I have hands-on experience building clean, modular web components, responsive interfaces, and API integrations.",
        "",
        "I have attached my updated resume for your review and would be glad to discuss relevant software or web development opportunities with your team.",
        "",
        "Portfolio: https://pratik-portfolio-nine-orcin.vercel.app",
        "LinkedIn: https://www.linkedin.com/in/pratik-patidar",
        "",
        "Thanks & Regards,",
        "Pratik Patidar",
        "pratikpatidar7990@gmail.com",
        "+91 82696 47990"
      ];

      for (const line of lines) {
        if (line === '') {
          await page.keyboard.press('Enter');
        } else {
          await page.keyboard.type(line, { delay: 1 });
          await page.keyboard.press('Enter');
        }
      }
    }

    await sleep(1500);

    // Upload Resume
    console.log('Uploading resume:', RESUME_PATH);
    const fileInputs = await page.$$('input[type="file"]');
    let uploaded = false;
    for (const fi of fileInputs) {
      try {
        await fi.uploadFile(RESUME_PATH);
        uploaded = true;
        break;
      } catch (e) {}
    }

    if (!uploaded) {
      console.error('File input upload failed!');
      return;
    }

    console.log('Waiting 6s for upload...');
    await sleep(6000);

    // Assert attachment in DOM
    const hasAttachment = await page.evaluate(() => {
      return document.body.innerText.includes('Pratik Patidar Resume - Frontend Engineer.pdf');
    });
    console.log('Attachment upload confirmed:', hasAttachment ? 'YES ✅' : 'NO ❌');

    if (!hasAttachment) {
      console.error('Attachment not present in DOM! Aborting send.');
      return;
    }

    // Send email using Ctrl+Enter
    console.log('Sending email...');
    await page.focus('div[aria-label="Message Body"]');
    await sleep(400);
    await page.keyboard.down('Control');
    await page.keyboard.press('Enter');
    await page.keyboard.up('Control');
    await sleep(4000);

    // Fallback: If still open, click send button
    const stillOpen = await page.$('div[aria-label="Message Body"]');
    if (stillOpen) {
      console.log('Clicking Send button manually...');
      await page.evaluate(() => {
        const sendBtn = document.querySelector('div[role="button"][data-tooltip*="Send"], div[aria-label*="Send"]');
        if (sendBtn) sendBtn.click();
      });
      await sleep(4000);
    }

    // Go to Sent folder and verify top row
    console.log('Navigating to Sent folder for assertion...');
    await page.goto('https://mail.google.com/mail/u/0/#sent', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await sleep(4000);

    const sentRow = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tr')).filter(r => r.innerText && r.innerText.trim().length > 5);
      return rows[0] ? rows[0].innerText.replace(/\n+/g, ' | ') : 'none';
    });

    console.log('Sent Verification Result:\n', sentRow);

  } catch (err) {
    console.error('Error during dispatch:', err.message);
  } finally {
    if (browser) await browser.disconnect();
  }
})();
