const puppeteer = require('puppeteer-core');
const fs = require('fs');

const sleep = ms => new Promise(r => setTimeout(r, ms));
const RESUME_PATH = 'C:\\mcp\\job-search-mcp-engine\\resumes\\Pratik Patidar Resume - Frontend Engineer.pdf';
const RECIPIENT = 'hrd@greenfordconstruction.co.uk';
const SUBJECT = 'Application: Software & Frontend Engineer - Pratik Patidar';

(async () => {
  let browser;
  try {
    console.log('[Isolated Tab Dispatch] Connecting to browser...');
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', protocolTimeout: 60000 });
    const p = await browser.newPage();

    const composeUrl = `https://mail.google.com/mail/u/0/?view=cm&fs=1&to=${encodeURIComponent(RECIPIENT)}&su=${encodeURIComponent(SUBJECT)}`;
    console.log('Navigating to isolated compose URL...');
    await p.goto(composeUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(4000);

    // Assert isolated compose fields
    const editor = await p.waitForSelector('div[aria-label="Message Body"]', { timeout: 15000 });
    if (!editor) {
      console.error('Editor not found');
      await p.close();
      return;
    }

    console.log('Entering clean Body...');
    await editor.click();
    await sleep(300);

    const lines = [
      "Hi Greenford Hiring Team,",
      "",
      "Thank you for reaching out regarding the opening at Greenford Construction Limited.",
      "",
      "I am a Software / Frontend Engineer with 1.5 years of experience specializing in React.js, Next.js, TypeScript, JavaScript, REST APIs, and responsive UI development. I have hands-on experience building clean, modular frontend components, responsive interfaces, and API integrations.",
      "",
      "I have attached my updated resume for your review and would be glad to discuss relevant software engineering or web development opportunities with your team.",
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
        await p.keyboard.press('Enter');
      } else {
        await p.keyboard.type(line, { delay: 1 });
        await p.keyboard.press('Enter');
      }
    }
    await sleep(1500);

    // Upload attachment
    console.log('Uploading resume:', RESUME_PATH);
    const fileInput = await p.$('input[name="Filedata"], input[type="file"]');
    if (fileInput) {
      await fileInput.uploadFile(RESUME_PATH);
      console.log('Waiting 6s for upload to finish...');
      await sleep(6000);
    } else {
      console.error('File input not found');
      await p.close();
      return;
    }

    // Verify attachment in DOM
    const attached = await p.evaluate(() => {
      return document.body.innerText.includes('Pratik Patidar Resume - Frontend Engineer.pdf');
    });
    console.log('Attachment upload verified:', attached ? 'YES ✅' : 'NO ❌');
    if (!attached) {
      console.error('Attachment not present in DOM');
      await p.close();
      return;
    }

    // Click Send
    console.log('Clicking Send button in isolated tab...');
    await p.evaluate(() => {
      const sendBtn = document.querySelector('div[role="button"][data-tooltip*="Send"], div[aria-label*="Send"]');
      if (sendBtn) sendBtn.click();
    });

    console.log('Waiting 6s for message to send...');
    await sleep(6000);

    // Close compose tab
    await p.close();

    // Verify in Sent folder (Rule 19)
    console.log('Opening Sent folder in fresh tab for Rule 19 assertion...');
    const sentTab = await browser.newPage();
    await sentTab.goto('https://mail.google.com/mail/u/0/#sent', { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(3500);

    const sentRows = await sentTab.evaluate(() => {
      const trs = Array.from(document.querySelectorAll('tr.zA, tr[role="row"]')).filter(r => r.innerText.trim().length > 5);
      return trs.slice(0, 3).map(r => r.innerText.replace(/\n+/g, ' | '));
    });

    console.log('=== SENT FOLDER RULE 19 VERIFICATION ===');
    console.log(JSON.stringify(sentRows, null, 2));

    await sentTab.close();
    browser.disconnect();

  } catch (err) {
    console.error('Error during isolated dispatch:', err.message);
    if (browser) browser.disconnect();
  }
})();
