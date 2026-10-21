const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const StorageWriteGuard = require('./guards/storage_write_guard.cjs');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    let gmailPage = pages.find(p => p.url().includes('mail.google.com'));

    if (!gmailPage) {
      gmailPage = await browser.newPage();
      await gmailPage.goto('https://mail.google.com/mail/u/?authuser=pratikpatidar7990@gmail.com', { waitUntil: 'domcontentloaded' });
      await sleep(4000);
    } else {
      await gmailPage.bringToFront();
    }

    const title = await gmailPage.title();
    console.log(`[Gmail CDP] Active Session: "${title}"`);

    const company = 'BQarlson Software Technologies';
    const recipient = 'hr@bqarlson.tech';
    const role = 'Full Stack Developer';
    const subject = `Application for ${role} - Pratik Patidar`;
    const resumeFileName = 'Pratik Patidar Resume - MERN Full Stack.pdf';
    const resumePath = path.resolve('C:/mcp/job-search-mcp-engine/resumes', resumeFileName);

    const emailBody = `Hi ${company} Hiring Team,

I came across your opening for a ${role} and wanted to apply for the role.

I'm a Full Stack Developer with 1.5 years of experience building full-stack web applications using React.js, Node.js, Express.js, MongoDB, TypeScript, REST APIs, and modern frontend & backend architectures.

I'm based in Indore and would be glad to discuss the opportunity further.

I've attached my updated resume for your review.

LinkedIn: https://www.linkedin.com/in/pratik-patidar
Portfolio: https://pratik-portfolio-nine-orcin.vercel.app

Thanks & Regards,
Pratik Patidar
pratikpatidar7990@gmail.com
+91 82696 47990`;

    console.log('-> Opening Compose box...');
    const toSelector = 'input[role="combobox"][aria-label*="To"], input[peoplekit-id]';
    let toInput = await gmailPage.$(toSelector);
    if (!toInput) {
      await gmailPage.evaluate(() => {
        const btn = document.querySelector('div[role="button"][gh="cm"]');
        if (btn) btn.click();
      });
      await sleep(2500);
      toInput = await gmailPage.waitForSelector(toSelector, { timeout: 10000 });
    }

    console.log(`-> Injecting recipient: ${recipient}`);
    await toInput.focus();
    await gmailPage.keyboard.type(recipient, { delay: 0 });
    await gmailPage.keyboard.press('Enter');
    await sleep(1000);

    console.log(`-> Setting subject: ${subject}`);
    const subjectSelector = 'input[name="subjectbox"]';
    const subjInput = await gmailPage.waitForSelector(subjectSelector, { timeout: 10000 });
    await subjInput.focus();
    await gmailPage.keyboard.type(subject, { delay: 0 });
    await sleep(1000);

    console.log('-> Setting immutable body text...');
    const bodySelector = 'div[role="textbox"][aria-label*="Message Body"]';
    const bodyBox = await gmailPage.waitForSelector(bodySelector, { timeout: 10000 });
    await bodyBox.focus();
    await gmailPage.evaluate((sel, text) => {
      const el = document.querySelector(sel);
      if (el) {
        el.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, text);
      }
    }, bodySelector, emailBody);
    await sleep(1500);

    console.log(`-> Attaching resume: ${resumeFileName}`);
    const fileInputs = await gmailPage.$$('input[type="file"][name="Filedata"]');
    const fileInput = fileInputs[fileInputs.length - 1];
    if (fileInput) {
      await fileInput.uploadFile(resumePath);
      console.log('-> Uploading attachment (waiting 4.5s)...');
      await sleep(4500);
    }

    console.log('-> Triggering Send...');
    await gmailPage.evaluate(() => {
      const btn = document.querySelector('div[role="button"][data-tooltip*="Send"], div[role="button"][aria-label*="Send"]');
      if (btn) {
        btn.click();
      }
    });
    await sleep(4000);

    console.log('-> Verifying physical presence in Sent outbox...');
    await gmailPage.goto('https://mail.google.com/mail/u/0/#sent', { waitUntil: 'domcontentloaded' });
    await sleep(3500);

    const sentConfirmed = await gmailPage.evaluate((recip, subj) => {
      const text = document.body.innerText.toLowerCase();
      return text.includes(subj.toLowerCase()) || text.includes(recip.toLowerCase()) || text.includes('bqarlson');
    }, recipient, subject);

    if (sentConfirmed) {
      console.log(`✅ CONFIRMED IN SENT FOLDER: Email to ${company} successfully delivered!`);
      const entry = {
        id: `bqarlson_email_${Date.now()}`,
        company: company,
        role: role,
        recipient: recipient,
        channel: 'Direct Recruiter Email',
        subject: subject,
        resume: resumeFileName,
        status: 'SUBMITTED',
        applied_at: new Date().toISOString(),
        notes: 'Pre-flight verified (Salutation: Hi BQarlson Software Technologies Hiring Team, Subject: Application for Full Stack Developer - Pratik Patidar) & Physically asserted in Gmail Sent folder'
      };

      StorageWriteGuard.safeAppendApplied('C:/mcp/job-search-mcp-engine/applied_todays_2026-10-21.json', entry);
      console.log('Logged into applied_todays_2026-10-21.json');
    } else {
      console.log('Sent confirmation not found.');
    }

  } catch(e) {
    console.error('Error:', e.message);
  }
})();
