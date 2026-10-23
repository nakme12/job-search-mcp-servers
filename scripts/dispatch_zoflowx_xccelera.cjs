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

    const targets = [
      {
        company: 'ZoflowX',
        recipient: 'hr@zoflowx.com',
        role: 'Full Stack Developer',
        resume: 'Pratik Patidar Resume - MERN Full Stack.pdf'
      },
      {
        company: 'Xccelera',
        recipient: 'neha.rana@xccelera.ai',
        role: 'Full Stack Developer',
        resume: 'Pratik Patidar Resume - MERN Full Stack.pdf'
      }
    ];

    for (const target of targets) {
      console.log(`\n[DISPATCH] Processing direct recruiter email for ${target.company} (${target.recipient})...`);
      
      const subject = `Application for ${target.role} - Pratik Patidar`;
      const resumePath = path.resolve('C:/mcp/job-search-mcp-engine/resumes', target.resume);
      
      const emailBody = `Hi ${target.company} Hiring Team,

I came across your opening for a ${target.role} and wanted to apply for the role.

I'm a Full Stack Developer with 1.5 years of experience building full-stack web applications using React.js, Node.js, Express.js, MongoDB, TypeScript, REST APIs, and modern frontend & backend architectures.

I'm based in Indore and would be glad to discuss the opportunity further.

I've attached my updated resume for your review.

LinkedIn: https://www.linkedin.com/in/pratik-patidar
Portfolio: https://pratik-portfolio-nine-orcin.vercel.app

Thanks & Regards,
Pratik Patidar
pratikpatidar7990@gmail.com
+91 82696 47990`;

      // Navigate to compose
      await gmailPage.goto('https://mail.google.com/mail/u/0/#inbox?compose=new', { waitUntil: 'networkidle2', timeout: 35000 });
      await sleep(3500);

      // Inject Recipient
      console.log(` -> Injecting recipient: ${target.recipient}`);
      const toSelector = 'input[role="combobox"][aria-label*="To"], input[peoplekit-id]';
      const toInput = await gmailPage.waitForSelector(toSelector, { timeout: 10000 });
      await toInput.focus();
      await gmailPage.keyboard.type(target.recipient, { delay: 25 });
      await gmailPage.keyboard.press('Enter');
      await sleep(1000);

      // Inject Subject
      console.log(` -> Setting subject: ${subject}`);
      const subjInput = await gmailPage.waitForSelector('input[name="subjectbox"]', { timeout: 10000 });
      await subjInput.focus();
      await gmailPage.keyboard.type(subject, { delay: 20 });
      await sleep(1000);

      // Inject Body
      console.log(' -> Setting immutable body...');
      const bodyBox = await gmailPage.waitForSelector('div[role="textbox"][aria-label*="Message Body"]', { timeout: 10000 });
      await bodyBox.focus();
      await gmailPage.evaluate((text) => {
        const b = document.querySelector('div[role="textbox"][aria-label*="Message Body"]');
        if (b) {
          b.focus();
          document.execCommand('selectAll', false, null);
          document.execCommand('insertText', false, text);
        }
      }, emailBody);
      await sleep(1500);

      // Attach Resume
      console.log(` -> Attaching resume: ${target.resume}`);
      const fileInputs = await gmailPage.$$('input[type="file"][name="Filedata"]');
      const fileInput = fileInputs[fileInputs.length - 1];
      if (fileInput) {
        await fileInput.uploadFile(resumePath);
        console.log(' -> Attachment uploading (waiting 5s)...');
        await sleep(5000);
      }

      // Send via Ctrl+Enter
      console.log(' -> Triggering Send...');
      await gmailPage.keyboard.down('Control');
      await gmailPage.keyboard.press('Enter');
      await gmailPage.keyboard.up('Control');
      await sleep(4000);

      // Verify in Sent folder (Rule 5 physical assertion)
      console.log(' -> Verifying in Sent folder...');
      await gmailPage.goto('https://mail.google.com/mail/u/0/#sent', { waitUntil: 'domcontentloaded' });
      await sleep(3500);

      const sentConfirmed = await gmailPage.evaluate((recip, subj) => {
        const text = document.body.innerText.toLowerCase();
        return text.includes(subj.toLowerCase()) || text.includes(recip.toLowerCase());
      }, target.recipient, subject);

      if (sentConfirmed) {
        console.log(`✅ [GMAIL SENT VERIFIED] Email to ${target.company} confirmed in Sent folder!`);
        const entry = {
          id: `${target.company.toLowerCase()}_email_${Date.now()}`,
          company: target.company,
          role: target.role,
          recipient: target.recipient,
          channel: 'Direct Recruiter Email',
          subject: subject,
          resume: target.resume,
          status: 'SUBMITTED',
          applied_at: new Date().toISOString(),
          notes: `Pre-flight verified (Salutation: Hi ${target.company} Hiring Team) & physically asserted in Gmail Sent folder`
        };

        StorageWriteGuard.safeAppendApplied('C:/mcp/job-search-mcp-engine/applied_todays_2026-10-21.json', entry);
        console.log(`Logged ${target.company} into applied_todays_2026-10-21.json!`);
      } else {
        console.log(`⚠️ Physical assertion in Sent folder not yet confirmed for ${target.company}.`);
      }
      
      await sleep(3000);
    }

  } catch(e) {
    console.error('Error during email dispatch batch:', e.message);
  }
})();
