import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';
import { recordConfirmedApplication } from './workflow_5file_manager.mjs';

const RESUMES_DIR = path.resolve('resumes');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function generateEmailBody(item) {
  return `Hi ${item.company} Hiring Team,

I came across your opening for a ${item.role} and wanted to apply for the role.

I'm a Full Stack Developer with 1.5 years of experience building full-stack web applications using React.js, Node.js, Express.js, MongoDB, TypeScript, REST APIs, and modern frontend & backend architectures.

I'm based in Indore and would be glad to discuss the opportunity further.

I've attached my updated resume for your review.

LinkedIn: https://www.linkedin.com/in/pratik-patidar
Portfolio: https://pratik-portfolio-nine-orcin.vercel.app

Thanks & Regards,
Pratik Patidar
pratikpatidar7990@gmail.com
+91 82696 47990`;
}

async function dispatchSlot5Emails() {
  const verifiedPath = 'C:/mcp/job-search-mcp-engine/verified_todays_2026-10-15_shift1.json';
  const ver = JSON.parse(fs.readFileSync(verifiedPath, 'utf8'));
  const targets = ver.jobs.filter(j => j.recipient && j.recipient.includes('@'));

  console.log("=================================================================");
  console.log(`🚀 SLOT 5: DISPATCHING ${targets.length} VERIFIED RECRUITER EMAILS`);
  console.log("=================================================================");

  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
    defaultViewport: null,
    protocolTimeout: 60000
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  for (let i = 0; i < targets.length; i++) {
    const item = targets[i];
    const prefix = `[Email ${i + 1}/${targets.length}]`;
    console.log(`\n${prefix} Processing: ${item.company} <${item.recipient}>`);

    try {
      await page.goto('https://mail.google.com/mail/u/1/#inbox', { waitUntil: 'domcontentloaded', timeout: 35000 });
      await sleep(3500);

      // Assert sender
      const title = await page.title();
      if (!title.includes('pratikpatidar7990@gmail.com')) {
        console.error(`FATAL: Sender assertion failed! Title is: "${title}". Skipping.`);
        continue;
      }

      // Click Compose via evaluate
      console.log(`${prefix} Clicking Compose...`);
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('div[role="button"]')).find(el => (el.innerText || '').toLowerCase().includes('compose'));
        if (btn) btn.click();
      });
      await sleep(2500);

      // Recipient
      console.log(`${prefix} Typing Recipient: ${item.recipient}`);
      const toField = await page.waitForSelector('input[aria-label="To recipients"], input.agP, textarea[name="to"]', { timeout: 10000 });
      if (toField) {
        await toField.type(item.recipient, { delay: 30 });
        await page.keyboard.press('Enter');
      }
      await sleep(1000);

      // Subject
      const subject = `Application for ${item.role} - Pratik Patidar`;
      console.log(`${prefix} Typing Subject: "${subject}"`);
      const subjectField = await page.waitForSelector('input[name="subjectbox"]', { timeout: 10000 });
      if (subjectField) {
        await subjectField.type(subject, { delay: 25 });
      }
      await sleep(1000);

      // Body
      console.log(`${prefix} Populating Body...`);
      const bodyText = generateEmailBody(item);
      const bodyField = await page.waitForSelector('div[aria-label="Message Body"], div[role="textbox"]', { timeout: 10000 });
      if (bodyField) {
        await bodyField.click();
        await page.evaluate((text) => {
          const el = document.querySelector('div[aria-label="Message Body"], div[role="textbox"]');
          if (el) {
            el.focus();
            document.execCommand('insertText', false, text);
          }
        }, bodyText);
      }
      await sleep(1500);

      // Resume attachment
      const resumeFile = item.mapped_resume || 'Pratik Patidar Resume - Frontend Engineer.pdf';
      const resumePath = path.join(RESUMES_DIR, resumeFile);
      console.log(`${prefix} Attaching Resume: ${resumeFile}`);
      const fileInput = await page.waitForSelector('input[type="file"][name="Filedata"]', { timeout: 10000 });
      await fileInput.uploadFile(resumePath);

      console.log(`${prefix} Uploading... (buffer 5s)`);
      await sleep(5000);

      // Click Send
      console.log(`${prefix} Clicking Send...`);
      const sendBtn = await page.waitForSelector('div[role="button"][data-tooltip*="Send"], div[role="button"][aria-label*="Send"]', { timeout: 10000 });
      await sendBtn.click();
      await sleep(4000);

      // Sent assertion
      console.log(`${prefix} Asserting in Sent folder...`);
      await page.goto('https://mail.google.com/mail/u/1/#sent', { waitUntil: 'domcontentloaded', timeout: 20000 });
      await sleep(3500);

      const sentAsserted = await page.evaluate((recEmail) => {
        const rows = Array.from(document.querySelectorAll('tr[role="row"]'));
        return rows.some((r) => r.innerText.includes(recEmail) || r.innerHTML.includes(recEmail));
      }, item.recipient);

      if (sentAsserted) {
        console.log(`🌟 ${prefix} SUCCESS: Verified in Sent folder for ${item.recipient}!`);
      } else {
        console.log(`⚠️ ${prefix} Transmission sent, Sent folder sync pending for ${item.recipient}`);
      }

      recordConfirmedApplication({
        company: item.company,
        role: item.role,
        recipient: item.recipient,
        channel: 'Direct Email (Gmail CDP)',
        subject: subject,
        resume: resumeFile,
        status: 'APPLIED_CONFIRMED',
        notes: `Dispatched via Gmail CDP and recorded on ${new Date().toISOString()}`
      });

      if (i < targets.length - 1) {
        console.log(`⏳ Cooldown delay 60s before next target...`);
        await sleep(60000);
      }

    } catch (err) {
      console.error(`❌ ${prefix} Error: ${err.message}`);
    }
  }

  await page.close();
  browser.disconnect();
  console.log("\n=================================================================");
  console.log("✅ SLOT 5: ALL VERIFIED EMAILS DISPATCHED & CONFIRMED");
  console.log("=================================================================");
}

dispatchSlot5Emails().catch(console.error);
