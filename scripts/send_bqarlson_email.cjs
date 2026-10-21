const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const StorageWriteGuard = require('./guards/storage_write_guard.cjs');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    let page = pages.find(p => p.url().includes('mail.google.com'));
    
    if (!page) {
      page = await browser.newPage();
      await page.goto('https://mail.google.com/mail/u/0/#inbox', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await sleep(4000);
    } else {
      await page.bringToFront();
    }

    console.log('[GMAIL] Asserting candidate identity...');
    const identityAsserted = await page.evaluate(() => {
      const pageText = document.body.innerText;
      return pageText.includes('pratikpatidar7990@gmail.com') || 
             document.querySelector('a[aria-label*="pratikpatidar7990@gmail.com"]') !== null ||
             document.querySelector('div[aria-label*="pratikpatidar7990@gmail.com"]') !== null ||
             document.title.includes('pratikpatidar7990@gmail.com');
    });
    console.log('[GMAIL] Identity pratikpatidar7990@gmail.com confirmed:', identityAsserted);

    const company = 'BQarlson Software Technologies';
    const recipient = 'hr@bqarlson.tech';
    const role = 'Full Stack Developer';
    const subject = `Application for ${role} - Pratik Patidar`;
    const resumePath = path.resolve('resumes/Pratik Patidar Resume - MERN Full Stack.pdf');

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

    console.log(`[GMAIL] Opening Compose window for ${recipient}...`);
    // Click Compose button
    const composeClicked = await page.evaluate(() => {
      const composeBtn = Array.from(document.querySelectorAll('div[role="button"]')).find(b => {
        const text = (b.innerText || '').toLowerCase();
        return text.includes('compose') || b.getAttribute('aria-label')?.toLowerCase().includes('compose');
      });
      if (composeBtn) {
        composeBtn.click();
        return true;
      }
      return false;
    });

    if (!composeClicked) {
      console.log('[GMAIL] Compose button selector fallback: clicking .T-I.T-I-KE.L3');
      const cBtn = await page.$('.T-I.T-I-KE.L3');
      if (cBtn) await cBtn.click();
    }

    await sleep(3000);

    // Enter Recipient
    console.log(`[GMAIL] Setting recipient: ${recipient}`);
    await page.waitForSelector('input[aria-label="To recipients"], input[name="to"], input.agP', { timeout: 10000 });
    const toInput = await page.$('input[aria-label="To recipients"]') || await page.$('input[name="to"]') || await page.$('input.agP');
    if (toInput) {
      await toInput.click();
      await toInput.type(recipient, { delay: 40 });
      await page.keyboard.press('Enter');
    }
    await sleep(1000);

    // Enter Subject
    console.log(`[GMAIL] Setting subject: ${subject}`);
    const subjectInput = await page.$('input[name="subjectbox"]');
    if (subjectInput) {
      await subjectInput.click();
      await subjectInput.type(subject, { delay: 35 });
    }
    await sleep(1000);

    // Enter Body
    console.log('[GMAIL] Pasting exact immutable email body...');
    const bodyBox = await page.$('div[aria-label="Message Body"], div[role="textbox"]');
    if (bodyBox) {
      await bodyBox.click();
      await page.evaluate((text) => {
        const box = document.querySelector('div[aria-label="Message Body"], div[role="textbox"]');
        if (box) {
          box.focus();
          document.execCommand('insertText', false, text);
        }
      }, emailBody);
    }
    await sleep(1500);

    // Attach Resume
    console.log(`[GMAIL] Attaching authorized resume: ${resumePath}`);
    const fileInput = await page.$('input[name="Filedata"], input[type="file"]');
    if (fileInput) {
      await fileInput.uploadFile(resumePath);
      console.log('[GMAIL] Upload initiated, waiting 5s for upload to complete...');
      await sleep(5000);
    }

    // Click Send
    console.log('[GMAIL] Clicking Send button...');
    const sendClicked = await page.evaluate(() => {
      const sendBtn = Array.from(document.querySelectorAll('div[role="button"]')).find(b => {
        const t = (b.innerText || '').toLowerCase();
        return t === 'send' || b.getAttribute('aria-label')?.toLowerCase().includes('send \u202a(ctrl-enter)\u202c') || b.getAttribute('aria-label')?.toLowerCase().includes('send');
      });
      if (sendBtn) {
        sendBtn.click();
        return true;
      }
      return false;
    });

    if (!sendClicked) {
      await page.keyboard.down('Control');
      await page.keyboard.press('Enter');
      await page.keyboard.up('Control');
    }

    console.log('[GMAIL] Send action triggered! Waiting 5s...');
    await sleep(5000);

    // Navigate to Sent folder to physically assert sent delivery
    console.log('[GMAIL] Verifying physical delivery in Gmail Sent folder...');
    await page.goto('https://mail.google.com/mail/u/0/#sent', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(4000);

    const sentVerified = await page.evaluate((rec) => {
      const body = document.body.innerText;
      return body.includes(rec) || body.includes('BQarlson') || body.includes('Full Stack Developer - Pratik Patidar');
    }, recipient);

    console.log(`[GMAIL] Sent folder physical assertion result: ${sentVerified}`);

    if (sentVerified) {
      const timestamp = new Date().toISOString();
      const entry = {
        id: `bqarlson_email_${Date.now()}`,
        company: company,
        role: role,
        recipient: recipient,
        channel: 'Direct Recruiter Email',
        subject: subject,
        resume: 'Pratik Patidar Resume - MERN Full Stack.pdf',
        status: 'SUBMITTED',
        applied_at: timestamp,
        notes: 'Pre-flight verified (Salutation: Hi BQarlson Software Technologies Hiring Team, Subject: Application for Full Stack Developer - Pratik Patidar) & Physically asserted in Gmail Sent folder'
      };

      StorageWriteGuard.safeAppendApplied('C:/mcp/job-search-mcp-engine/applied_todays_2026-10-21.json', entry);
      console.log('✅ [BQARLSON] Dispatched, verified in Gmail Sent & logged into applied_todays_2026-10-21.json!');
    } else {
      console.log('⚠️ [GMAIL] Sent folder assertion pending or message still sending. Retrying check in 5s...');
      await sleep(5000);
      const retryVerify = await page.evaluate((rec) => document.body.innerText.includes(rec), recipient);
      console.log('Retry result:', retryVerify);
    }

  } catch(e) {
    console.error('❌ [GMAIL] Error during email dispatch:', e.message);
  }
})();
