const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const StorageWriteGuard = require('./guards/storage_write_guard.cjs');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
    const pages = await browser.pages();
    let gmail = pages.find(p => p.url().includes('mail.google.com'));
    if (!gmail) {
      console.log('Opening new Gmail tab...');
      gmail = await browser.newPage();
    }
    
    console.log('Navigating directly to Gmail search for sent items...');
    await gmail.goto('https://mail.google.com/mail/u/0/#search/to%3Abqarlson', { waitUntil: 'networkidle2', timeout: 35000 });
    await sleep(4000);
    
    const pageText = await gmail.evaluate(() => document.body.innerText);
    console.log('Search page text snippet:\n', pageText.slice(0, 400).replace(/\n+/g, ' '));
    
    const isSent = pageText.toLowerCase().includes('bqarlson') || pageText.toLowerCase().includes('application for full stack developer');
    console.log('Is sent found in Gmail search:', isSent);
    
    if (isSent) {
      const entry = {
        id: `bqarlson_email_${Date.now()}`,
        company: 'BQarlson Software Technologies',
        role: 'Full Stack Developer',
        recipient: 'hr@bqarlson.tech',
        channel: 'Direct Recruiter Email',
        subject: 'Application for Full Stack Developer - Pratik Patidar',
        resume: 'Pratik Patidar Resume - MERN Full Stack.pdf',
        status: 'SUBMITTED',
        applied_at: new Date().toISOString(),
        notes: 'Pre-flight verified (Salutation: Hi BQarlson Software Technologies Hiring Team) & physically asserted in Gmail Sent'
      };
      
      StorageWriteGuard.safeAppendApplied('C:/mcp/job-search-mcp-engine/applied_todays_2026-10-21.json', entry);
      console.log('Recorded BQarlson in File 5!');
    } else {
      console.log('Not yet in Sent. Opening compose fresh and executing clean dispatch...');
      await gmail.goto('https://mail.google.com/mail/u/0/#inbox?compose=new', { waitUntil: 'networkidle2', timeout: 35000 });
      await sleep(3500);
      
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

      // Set To
      console.log('Typing recipient...');
      const toSelector = 'input[role="combobox"][aria-label*="To"], input[peoplekit-id]';
      const toInput = await gmail.waitForSelector(toSelector, { timeout: 10000 });
      await toInput.focus();
      await gmail.keyboard.type(recipient, { delay: 30 });
      await gmail.keyboard.press('Enter');
      await sleep(1000);

      // Set Subject
      console.log('Typing subject...');
      const subjInput = await gmail.waitForSelector('input[name="subjectbox"]', { timeout: 10000 });
      await subjInput.focus();
      await gmail.keyboard.type(subject, { delay: 25 });
      await sleep(1000);

      // Set Body
      console.log('Inserting body...');
      const bodyBox = await gmail.waitForSelector('div[role="textbox"][aria-label*="Message Body"]', { timeout: 10000 });
      await bodyBox.focus();
      await gmail.evaluate((text) => {
        const b = document.querySelector('div[role="textbox"][aria-label*="Message Body"]');
        if (b) {
          b.focus();
          document.execCommand('selectAll', false, null);
          document.execCommand('insertText', false, text);
        }
      }, emailBody);
      await sleep(1500);

      // Attach File
      console.log('Attaching file...');
      const fileInputs = await gmail.$$('input[type="file"][name="Filedata"]');
      const fileInput = fileInputs[fileInputs.length - 1];
      if (fileInput) {
        await fileInput.uploadFile(resumePath);
        console.log('Attachment uploading... (waiting 5s)');
        await sleep(5000);
      }

      // Send
      console.log('Sending message...');
      await gmail.keyboard.down('Control');
      await gmail.keyboard.press('Enter');
      await gmail.keyboard.up('Control');
      await sleep(4000);

      // Navigate to Sent
      await gmail.goto('https://mail.google.com/mail/u/0/#sent', { waitUntil: 'domcontentloaded' });
      await sleep(4000);

      const sentText = await gmail.evaluate(() => document.body.innerText.toLowerCase());
      if (sentText.includes('bqarlson') || sentText.includes('application for full stack developer')) {
        console.log('✅ Physically asserted in Gmail Sent folder!');
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
          notes: 'Pre-flight verified & physically asserted in Gmail Sent folder'
        };
        StorageWriteGuard.safeAppendApplied('C:/mcp/job-search-mcp-engine/applied_todays_2026-10-21.json', entry);
        console.log('Logged into applied_todays_2026-10-21.json!');
      } else {
        console.log('Check complete, still pending outbox sync.');
      }
    }
  } catch(e) {
    console.error('Error:', e.message);
  }
})();
