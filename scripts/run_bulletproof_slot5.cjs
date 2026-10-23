/**
 * BULLETPROOF SLOT 5 RECRUITER DISPATCHER (PERFECT GMAIL DIALOG ISOLATION)
 * - Opens Compose cleanly on #inbox
 * - Waits for dialog element
 * - Injects recipient into focused to input
 * - Injects subject into subjectbox
 * - Injects body via execCommand into message body
 * - Uploads resume
 * - Triggers send via Ctrl+Enter AND explicit Send button click
 * - Waits 5s for delivery
 * - Asserts in live #sent folder
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const log = (...args) => {
  const str = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' ') + '\n';
  try { fs.writeSync(1, str); } catch (e) { process.stdout.write(str); }
};
console.log = log;
console.error = log;

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

async function runBulletproofSlot5() {
  console.log('====================================================');
  console.log('📧 BULLETPROOF SLOT 5 DISPATCH ENGINE');
  console.log('====================================================');

  const f4Path = path.resolve('C:/mcp/job-search-mcp-engine/verified_todays_2026-10-16_shift1.json');
  const f5Path = path.resolve('C:/mcp/job-search-mcp-engine/applied_todays_2026-10-16_shift1.json');

  const f4 = JSON.parse(fs.readFileSync(f4Path, 'utf8'));
  const f5 = JSON.parse(fs.readFileSync(f5Path, 'utf8'));

  const alreadySent = new Set((f5.jobs || []).map(j => (j.recipient || '').toLowerCase()).filter(Boolean));

  // Extract pending direct recruiter emails (Skip Outlook generic)
  const pending = (f4.jobs || []).filter(j => {
    if (!j.recipient || !j.recipient.includes('@')) return false;
    const c = (j.company || '').toLowerCase();
    if (c.includes('outlook') || c.includes('gmail') || c.includes('yahoo') || c.includes('null')) return false;
    return !alreadySent.has(j.recipient.toLowerCase());
  });

  console.log(`Pending Unsent Verified Direct Recruiter Emails: ${pending.length}`);

  if (pending.length === 0) {
    console.log('✅ All emails sent and accounted for in File 5.');
    return;
  }

  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const gmailPage = pages.find(p => p.url().includes('mail.google.com/mail/u/1/'));

  if (!gmailPage) {
    console.error('❌ Pratik Gmail tab (/u/1/) not found open!');
    await browser.disconnect();
    return;
  }

  for (let i = 0; i < pending.length; i++) {
    const lead = pending[i];
    console.log(`\n----------------------------------------------------`);
    console.log(`[Email ${i + 1}/${pending.length}] Dispatching: ${lead.company} (${lead.recipient})`);

    const resumeFileName = lead.resume_mapped || lead.resume || 'Pratik Patidar Resume - MERN Full Stack.pdf';
    const resumePath = path.resolve('C:/mcp/job-search-mcp-engine/resumes', resumeFileName);

    if (!fs.existsSync(resumePath)) {
      console.error(`❌ Resume file missing: ${resumePath}`);
      continue;
    }

    try {
      // Step 1: Clean navigation to #inbox & discard any leftover drafts
      console.log('  -> Navigating to #inbox...');
      await gmailPage.goto('https://mail.google.com/mail/u/1/#inbox', { waitUntil: 'domcontentloaded' });
      await sleep(2500);
      await gmailPage.evaluate(() => {
        const disc = document.querySelectorAll('div[role="button"][data-tooltip*="Discard"], div[role="button"][aria-label*="Discard"]');
        disc.forEach(d => d.click());
      });
      await sleep(1000);

      // Step 2: Click Compose
      console.log('  -> Clicking Compose...');
      await gmailPage.evaluate(() => {
        const btn = document.querySelector('div[role="button"][gh="cm"]');
        if (btn) btn.click();
      });
      await sleep(2500);

      // Step 3: Fill Recipient inside the active dialog
      console.log(`  -> Injecting To: ${lead.recipient}`);
      const toSelector = 'input[role="combobox"][aria-label*="To"], input[peoplekit-id]';
      const toInput = await gmailPage.waitForSelector(toSelector, { timeout: 10000 });
      await toInput.focus();
      await gmailPage.keyboard.type(lead.recipient, { delay: 10 });
      await gmailPage.keyboard.press('Enter');
      await sleep(1000);

      // Step 4: Fill Subject
      const subject = `Application for ${lead.role} - Pratik Patidar`;
      console.log(`  -> Setting Subject: ${subject}`);
      const subjSelector = 'input[name="subjectbox"]';
      const subjInput = await gmailPage.waitForSelector(subjSelector, { timeout: 10000 });
      await subjInput.focus();
      await gmailPage.keyboard.type(subject, { delay: 10 });
      await sleep(1000);

      // Step 5: Fill Body
      console.log('  -> Injecting Body...');
      const bodySelector = 'div[role="textbox"][aria-label*="Message Body"]';
      await gmailPage.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (el) {
          el.focus();
          el.click();
        }
      }, bodySelector);
      await sleep(500);
      const bodyText = getEmailBody(lead.company, lead.role);
      await gmailPage.evaluate((sel, text) => {
        const el = document.querySelector(sel);
        if (el) {
          el.focus();
          document.execCommand('selectAll', false, null);
          document.execCommand('insertText', false, text);
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, bodySelector, bodyText);
      await sleep(1500);

      // Step 6: Attach Resume
      console.log(`  -> Attaching Resume: ${resumeFileName}`);
      const fileInput = await gmailPage.$('input[type="file"][name="Filedata"]');
      if (fileInput) {
        await fileInput.uploadFile(resumePath);
        console.log('  -> Waiting 5s for upload...');
        await sleep(5000);
      }

      // Step 7: Send via Ctrl+Enter AND send button click
      console.log('  -> Sending email...');
      await gmailPage.keyboard.down('Control');
      await gmailPage.keyboard.press('Enter');
      await gmailPage.keyboard.up('Control');
      await sleep(1500);

      await gmailPage.evaluate(() => {
        const sendBtn = document.querySelector('div[role="button"][data-tooltip*="Send"], div[aria-label*="Send"]');
        if (sendBtn && sendBtn.offsetParent !== null) sendBtn.click();
      });

      console.log('  -> Waiting 6s for message to transmit...');
      await sleep(6000);

      // Step 8: Assert physically in Sent folder
      console.log('  -> Asserting in #sent folder...');
      await gmailPage.goto('https://mail.google.com/mail/u/1/#sent', { waitUntil: 'domcontentloaded' });
      await sleep(4000);

      const sentConfirmed = await gmailPage.evaluate((recip, subj) => {
        const firstRow = document.querySelector('div[role="main"] tr[role="row"]');
        if (!firstRow) return false;
        const text = firstRow.textContent.toLowerCase();
        const recipPrefix = recip.split('@')[0].toLowerCase();
        return text.includes(recip.toLowerCase()) || text.includes(recipPrefix) || text.includes(subj.toLowerCase());
      }, lead.recipient, subject);

      if (sentConfirmed) {
        console.log(`  ✅ CONFIRMED IN SENT: Email to ${lead.company} (${lead.recipient}) verified delivered!`);
        f5.jobs.push({
          id: f5.jobs.length + 1,
          company: lead.company,
          role: lead.role,
          recipient: lead.recipient,
          channel: 'Direct Recruiter Email (Slot 5 Dispatch)',
          subject: subject,
          resume: resumeFileName,
          status: 'SENT_VERIFIED_OUTBOX',
          timestamp: new Date().toISOString()
        });
        f5.total = f5.jobs.length;
        fs.writeFileSync(f5Path, JSON.stringify(f5, null, 2));
      } else {
        console.log(`  ⚠️ Notice: Sent folder sync in progress for ${lead.recipient}.`);
      }

      // Natural Human Random Jitter Pause (30s to 65s)
      if (i < pending.length - 1) {
        const randomDelay = Math.floor(Math.random() * (65000 - 30000 + 1)) + 30000;
        console.log(`  ⏳ Random human jitter pause (${(randomDelay / 1000).toFixed(1)}s) before next dispatch...`);
        await sleep(randomDelay);
      }

    } catch (err) {
      console.error(`  ❌ Error on ${lead.company}: ${err.message}`);
    }
  }

  await browser.disconnect();
  console.log('\n====================================================');
  console.log(`🎯 SLOT 5 EMAIL DISPATCHES FINISHED. Total in File 5: ${f5.total}`);
  console.log('====================================================');
}

runBulletproofSlot5().catch(console.error);
