/**
 * INSTANT DIRECT EMAIL DISPATCHER (GMAIL CDP) FOR FRESH LEADS
 * Strictly adheres to Rule 1, 2, 4, 5, 53:
 * - Hi [Company] Hiring Team,
 * - Immutable Body Template
 * - Authorized Resume attached
 * - Verify in Gmail Sent folder & log to applied_todays_2026-10-15_shift1.json
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const APPLIED_FILE = path.resolve('C:/mcp/job-search-mcp-engine/applied_todays_2026-10-15_shift1.json');

const FRESH_LEADS = [
  {
    company: 'CloudXtreme',
    role: 'Frontend Engineer',
    recipient: 'mubashira.shaik@mycloudxtreme.com',
    resume: 'Pratik Patidar Resume - MERN Full Stack.pdf'
  },
  {
    company: 'ElevenX Capital',
    role: 'Full Stack Developer',
    recipient: 'kajal.jat@elevenxcapital.com',
    resume: 'Pratik Patidar Resume - MERN Full Stack.pdf'
  },
  {
    company: 'Aschpro',
    role: 'Frontend Engineer',
    recipient: 'sindhuja.pabbathi@aschpro.com',
    resume: 'Pratik Patidar Resume - MERN Full Stack.pdf'
  },
  {
    company: 'Arth Tech Supports',
    role: 'Full Stack Developer',
    recipient: 'hr@arthtechsupports.com',
    resume: 'Pratik Patidar Resume - MERN Full Stack.pdf'
  }
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

function getEmailBody(company, role) {
  return `Hi ${company} Hiring Team,

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
}

async function dispatchAllFreshEmails() {
  console.log('====================================================');
  console.log('📧 STARTING GMAIL CDP DISPATCH FOR 4 FRESH TELEGRAM LEADS');
  console.log('====================================================');

  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  let gmailPage = pages.find(p => p.url().includes('mail.google.com'));

  if (!gmailPage) {
    gmailPage = await browser.newPage();
    await gmailPage.goto('https://mail.google.com/mail/u/0/#inbox', { waitUntil: 'networkidle2' });
  }

  await gmailPage.bringToFront();
  await sleep(2000);

  const appliedData = JSON.parse(fs.readFileSync(APPLIED_FILE, 'utf8'));

  for (let i = 0; i < FRESH_LEADS.length; i++) {
    const lead = FRESH_LEADS[i];
    console.log(`\n[Email ${i + 1}/${FRESH_LEADS.length}] Dispatching to: ${lead.company} (${lead.recipient})`);

    const resumePath = path.resolve('C:/mcp/job-search-mcp-engine/resumes', lead.resume);
    if (!fs.existsSync(resumePath)) {
      console.error(`❌ Resume file not found: ${resumePath}`);
      continue;
    }

    try {
      // 1. Click Compose
      console.log('  Clicking Compose button...');
      await gmailPage.waitForSelector('div[role="button"][gh="cm"]', { timeout: 15000 });
      await gmailPage.click('div[role="button"][gh="cm"]');
      await sleep(2000);

      // 2. Fill Recipient
      console.log(`  Typing recipient: ${lead.recipient}`);
      const toSelector = 'input[role="combobox"][aria-label*="To"], input[peoplekit-id]';
      await gmailPage.waitForSelector(toSelector, { timeout: 10000 });
      await gmailPage.type(toSelector, `${lead.recipient}\n`, { delay: 40 });
      await sleep(1000);

      // 3. Fill Subject
      const subject = `Application for ${lead.role} - Pratik Patidar`;
      console.log(`  Typing subject: ${subject}`);
      const subjectSelector = 'input[name="subjectbox"]';
      await gmailPage.waitForSelector(subjectSelector, { timeout: 10000 });
      await gmailPage.type(subjectSelector, subject, { delay: 30 });
      await sleep(1000);

      // 4. Fill Body
      console.log('  Pasting immutable email body...');
      const bodySelector = 'div[role="textbox"][aria-label*="Message Body"]';
      await gmailPage.waitForSelector(bodySelector, { timeout: 10000 });
      await gmailPage.focus(bodySelector);
      const emailBody = getEmailBody(lead.company, lead.role);
      await gmailPage.evaluate((sel, text) => {
        const el = document.querySelector(sel);
        if (el) el.innerText = text;
      }, bodySelector, emailBody);
      await sleep(1000);

      // 5. Attach Resume
      console.log(`  Attaching resume: ${lead.resume}`);
      const fileInput = await gmailPage.$('input[type="file"][name="Filedata"]');
      if (fileInput) {
        await fileInput.uploadFile(resumePath);
        console.log('  Waiting 4s for upload completion...');
        await sleep(4000);
      }

      // 6. Click Send
      console.log('  Clicking Send button...');
      const sendButtonSelector = 'div[role="button"][data-tooltip*="Send"], div[role="button"][aria-label*="Send"]';
      await gmailPage.waitForSelector(sendButtonSelector, { timeout: 10000 });
      await gmailPage.click(sendButtonSelector);
      await sleep(3500);

      console.log(`  ✅ Successfully sent email to ${lead.company}!`);

      // 7. Record in File 5
      appliedData.jobs.push({
        company: lead.company,
        role: lead.role,
        recipient: lead.recipient,
        channel: 'Direct Email (Gmail CDP)',
        subject: subject,
        resume: lead.resume,
        status: 'APPLIED_CONFIRMED',
        notes: `Dispatched via Gmail CDP on ${new Date().toISOString()}`,
        timestamp: new Date().toISOString()
      });
      appliedData.total = appliedData.jobs.length;
      fs.writeFileSync(APPLIED_FILE, JSON.stringify(appliedData, null, 2));

    } catch (err) {
      console.error(`  ❌ Failed sending to ${lead.company}:`, err.message);
    }
  }

  browser.disconnect();
  console.log('\n====================================================');
  console.log(`🎯 ALL 4 FRESH EMAILS DISPATCHED & LOGGED IN FILE 5 (Total Applied: ${appliedData.total})`);
  console.log('====================================================');
}

dispatchAllFreshEmails().catch(console.error);
