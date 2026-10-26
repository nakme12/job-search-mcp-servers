const puppeteer = require('puppeteer-core');
const fs = require('fs');

const sleep = ms => new Promise(r => setTimeout(r, ms));
const RESUME_PATH = 'C:\\mcp\\job-search-mcp-engine\\resumes\\Pratik Patidar Resume - Frontend Engineer.pdf';
const RECIPIENT = 'hrd@greenfordconstruction.co.uk';
const SUBJECT = 'Application / Introduction: Software Engineer - Pratik Patidar';

(async () => {
  let browser;
  try {
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', protocolTimeout: 60000 });
    const pages = await browser.pages();
    const page = pages.find(p => p.url().includes('mail.google.com'));
    if (!page) {
      console.log('No page');
      return;
    }
    await page.bringToFront();

    // 1. Focus and type Recipient
    console.log('Focusing To input...');
    await page.evaluate(() => {
      const toInput = document.querySelector('input[aria-label="To recipients"]');
      if (toInput) {
        toInput.focus();
        toInput.value = '';
      }
    });
    await sleep(300);
    await page.keyboard.type(RECIPIENT, { delay: 20 });
    await sleep(400);
    await page.keyboard.press('Enter');
    await sleep(500);

    // 2. Focus and type Subject
    console.log('Focusing Subject input...');
    await page.evaluate(() => {
      const subj = document.querySelector('input[name="subjectbox"]');
      if (subj) {
        subj.focus();
        subj.value = '';
      }
    });
    await sleep(300);
    await page.keyboard.type(SUBJECT, { delay: 20 });
    await sleep(500);

    // 3. Focus and type Body
    console.log('Focusing Body editor...');
    await page.evaluate(() => {
      const editor = document.querySelector('div[aria-label="Message Body"]');
      if (editor) {
        editor.focus();
      }
    });
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
    await sleep(1500);

    // 4. Attach Resume
    console.log('Attaching resume file...');
    const fileInput = await page.$('input[name="Filedata"], input[type="file"]');
    if (fileInput) {
      await fileInput.uploadFile(RESUME_PATH);
      console.log('File uploaded. Waiting 6s for upload finish...');
      await sleep(6000);
    } else {
      console.error('File input not found');
      return;
    }

    // Assert attachment
    const hasAttachment = await page.evaluate(() => {
      return document.body.innerText.includes('Pratik Patidar Resume - Frontend Engineer.pdf');
    });
    console.log('Attachment upload asserted:', hasAttachment);
    if (!hasAttachment) {
      console.error('Attachment failed. Aborting.');
      return;
    }

    // 5. Send Email
    console.log('Clicking Send button...');
    await page.evaluate(() => {
      const sendBtn = document.querySelector('div[role="button"][data-tooltip*="Send"], div[aria-label*="Send"]');
      if (sendBtn) sendBtn.click();
    });
    await sleep(4000);

    // 6. Sent Folder Assertion
    console.log('Verifying in Sent folder...');
    await page.goto('https://mail.google.com/mail/u/0/#sent', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await sleep(3500);

    const firstRowText = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tr')).filter(r => r.innerText && r.innerText.trim().length > 5);
      return rows[0] ? rows[0].innerText.replace(/\n+/g, ' | ') : 'none';
    });

    console.log('=== SENT FOLDER VERIFICATION PROOF ===');
    console.log(firstRowText);

    browser.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    if (browser) browser.disconnect();
  }
})();
