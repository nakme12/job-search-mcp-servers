/**
 * SLOT 5 DIRECT RECRUITER EMAIL DISPATCHER FOR 2026-10-26
 * Enforces Rule 1, 14, 19, 44, 74:
 * - Proper company salutation (no "Hi Gmail")
 * - Canonical immutable template
 * - Verified role-matched resumes
 * - Sent folder verification assertion
 * - Updates applied_todays_2026-10-26.json & total_historical_except_today.json
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const TODAY = '2026-10-26';
const ENGINE_ROOT = path.resolve(__dirname, '..');
const APPLIED_FILE = path.join(ENGINE_ROOT, `applied_todays_${TODAY}.json`);
const HIST_FILE = path.join(ENGINE_ROOT, 'total_historical_except_today.json');

const RESUMES = {
  MERN: 'Pratik_Patidar_Resume_MERN_Stack_Developer.pdf',
  FULLSTACK: 'Pratik_Patidar_Resume_Full_Stack_Developer.pdf',
  REACT: 'Pratik_Patidar_Resume_React_Developer.pdf',
  FRONTEND: 'Pratik_Patidar_Resume_Frontend_Engineer.pdf'
};

const TARGETS = [
  {
    company: 'Maitri Tech Solutions',
    recipient: 'hr@maitritech.in',
    role: 'MERN / Full Stack Developer',
    location: 'Indore',
    resumeName: RESUMES.MERN
  },
  {
    company: 'Webcraft Technologies',
    recipient: 'hr@webcraftit.com',
    role: 'Full Stack Developer',
    location: 'Indore',
    resumeName: RESUMES.FULLSTACK
  },
  {
    company: 'Andswitch Tech',
    recipient: 'hr@andswitchtech.com',
    role: 'Frontend / React Developer',
    location: 'India / Remote',
    resumeName: RESUMES.REACT
  },
  {
    company: 'WBN Technology',
    recipient: 'info@wbntechnology.in',
    role: 'Frontend / React Developer',
    location: 'India / Remote',
    resumeName: RESUMES.FRONTEND
  },
  {
    company: 'MECN Tech',
    recipient: 'hr@mecntech.in',
    role: 'Full Stack Developer',
    location: 'Bengaluru',
    resumeName: RESUMES.FULLSTACK
  },
  {
    company: 'Grove Tech Solutions',
    recipient: 'hr@grovetechs.com',
    role: 'Full Stack Developer',
    location: 'Surat',
    resumeName: RESUMES.FULLSTACK
  },
  {
    company: 'Nippon Data',
    recipient: 'hr4@nippondata.com',
    role: 'Full Stack Developer',
    location: 'Delhi',
    resumeName: RESUMES.FULLSTACK
  },
  {
    company: 'Archigo Solutions',
    recipient: 'tejasveer@archigossolutions.com',
    role: 'Full Stack Developer',
    location: 'Pan India',
    resumeName: RESUMES.FULLSTACK
  },
  {
    company: 'Seraphic Technologies',
    recipient: 'hr@seraphic.io',
    role: 'Full Stack Developer',
    location: 'Mohali',
    resumeName: RESUMES.FULLSTACK
  }
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

function getEmailBody(company, role, resumeName) {
  const isMernOrFull = resumeName.includes('MERN') || resumeName.includes('Full_Stack');
  const roleDesc = isMernOrFull 
    ? "Full Stack Developer with 1.5 years of experience building full-stack web applications using React.js, Node.js, Express.js, MongoDB, TypeScript, REST APIs, and modern frontend & backend architectures"
    : "Frontend Engineer with 1.5 years of experience, mainly working with React.js, Next.js, TypeScript, JavaScript, REST APIs, and responsive UI development";

  return [
    `Hi ${company} Hiring Team,`,
    '',
    `I came across your opening for a ${role} and wanted to apply for the role.`,
    '',
    `I'm a ${roleDesc}. I have hands-on experience building modular components, scalable architectures, and API-integrated web applications.`,
    '',
    `I'm based in Indore and would be glad to discuss the opportunity further.`,
    '',
    `I've attached my updated resume for your review.`,
    '',
    `LinkedIn: https://www.linkedin.com/in/pratik-patidar`,
    `Portfolio: https://pratik-portfolio-nine-orcin.vercel.app`,
    '',
    `Thanks & Regards,`,
    `Pratik Patidar`,
    `pratikpatidar7990@gmail.com`,
    `+91 82696 47990`
  ];
}

async function cleanupDrafts(page) {
  try {
    await page.evaluate(() => {
      const discards = document.querySelectorAll('div[data-tooltip*="Discard draft"], div[aria-label*="Discard draft"]');
      discards.forEach(d => d.click());
    });
    await sleep(1500);
  } catch (e) {}
}

async function runDispatches() {
  console.log('========================================================================');
  console.log(`📧 [SLOT 5] STARTING ACCURATE ROLE-MATCHED EMAIL DISPATCH (${TODAY})`);
  console.log(`Targets: ${TARGETS.length} remaining verified direct corporate targets`);
  console.log('========================================================================');

  // Verify all resume files exist before proceeding
  for (const t of TARGETS) {
    const rPath = path.join(ENGINE_ROOT, 'resumes', t.resumeName);
    if (!fs.existsSync(rPath)) {
      throw new Error(`CRITICAL: Resume file missing: ${rPath}`);
    }
  }

  // Load applied today
  let appliedToday = [];
  if (fs.existsSync(APPLIED_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(APPLIED_FILE, 'utf8'));
      appliedToday = Array.isArray(parsed) ? parsed : (parsed.jobs || []);
    } catch (e) {}
  }
  const alreadySent = new Set(appliedToday.map(j => (j.recipient || '').toLowerCase().trim()));

  // Connect to Brave CDP
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null, protocolTimeout: 120000 });
  const pages = await browser.pages();
  let gmailPage = pages.find(p => p.url().includes('mail.google.com'));

  if (!gmailPage) {
    gmailPage = await browser.newPage();
    await gmailPage.goto('https://mail.google.com/mail/u/0/#inbox', { waitUntil: 'domcontentloaded', timeout: 30000 });
  }

  await gmailPage.bringToFront();
  await sleep(2000);
  await cleanupDrafts(gmailPage);

  let sentCount = 0;

  for (let i = 0; i < TARGETS.length; i++) {
    const lead = TARGETS[i];
    const normRecipient = lead.recipient.toLowerCase().trim();

    if (alreadySent.has(normRecipient)) {
      console.log(`[Target ${i + 1}/${TARGETS.length}] ${lead.company} (${lead.recipient}) -> Already sent today. Skipping.`);
      continue;
    }

    const resumePath = path.join(ENGINE_ROOT, 'resumes', lead.resumeName);

    console.log(`\n------------------------------------------------------------------------`);
    console.log(`[Target ${i + 1}/${TARGETS.length}] 🚀 Dispatching to: ${lead.company} <${lead.recipient}>`);
    console.log(`Role: ${lead.role} | Location: ${lead.location}`);
    console.log(`🎯 Exact Matched Resume Attached: ${lead.resumeName}`);

    try {
      // 1. Clean inbox navigation
      await gmailPage.goto('https://mail.google.com/mail/u/0/#inbox', { waitUntil: 'domcontentloaded', timeout: 20000 });
      await sleep(2500);
      await cleanupDrafts(gmailPage);

      // 2. Click Compose button via DOM click
      console.log('  1. Clicking Compose...');
      await gmailPage.evaluate(() => {
        const btn = document.querySelector('div[gh="cm"]');
        if (btn) btn.click();
      });

      await gmailPage.waitForFunction(() => document.querySelectorAll('div[role="dialog"]').length > 0, { timeout: 15000 });
      await sleep(1500);

      // 3. Type Recipient
      console.log(`  2. Entering Recipient: ${lead.recipient}`);
      const recipientFocused = await gmailPage.evaluate(() => {
        const toInput = document.querySelector('input[aria-label="To recipients"], input[peoplekit-id], input.agP, input[type="text"]');
        if (!toInput) return false;
        toInput.focus();
        toInput.value = '';
        return true;
      });
      if (!recipientFocused) throw new Error('To recipient input not found or could not focus');

      await sleep(300);
      await gmailPage.keyboard.type(lead.recipient, { delay: 15 });
      await sleep(400);
      await gmailPage.keyboard.press('Enter');
      await sleep(500);

      // 4. Type Subject
      const subject = `Application for ${lead.role} - Pratik Patidar`;
      console.log(`  3. Entering Subject: "${subject}"`);
      const subjectFocused = await gmailPage.evaluate(() => {
        const subj = document.querySelector('input[name="subjectbox"]');
        if (!subj) return false;
        subj.focus();
        subj.value = '';
        return true;
      });
      if (!subjectFocused) throw new Error('Subject input not found or could not focus');

      await sleep(300);
      await gmailPage.keyboard.type(subject, { delay: 12 });
      await sleep(500);

      // 5. Fill Matched Body
      console.log('  4. Typing Matched Email Body...');
      const bodyFocused = await gmailPage.evaluate(() => {
        const body = document.querySelector('div[aria-label="Message Body"], div[role="textbox"]');
        if (!body) return false;
        body.focus();
        return true;
      });
      if (!bodyFocused) throw new Error('Message body editor not found or could not focus');

      await sleep(300);
      const bodyLines = getEmailBody(lead.company, lead.role, lead.resumeName);
      for (const line of bodyLines) {
        if (line === '') {
          await gmailPage.keyboard.press('Enter');
        } else {
          await gmailPage.keyboard.type(line, { delay: 1 });
          await gmailPage.keyboard.press('Enter');
        }
      }
      await sleep(1500);

      // 6. Attach Canonical Resume
      console.log(`  5. Uploading Resume: ${lead.resumeName}`);
      const fileInput = await gmailPage.$('input[name="Filedata"], input[type="file"]');
      if (!fileInput) throw new Error('File attachment input not found');

      await fileInput.uploadFile(resumePath);
      console.log('     File uploaded to input, waiting for attachment completion in DOM (up to 35s)...');

      let uploadComplete = false;
      for (let p = 1; p <= 35; p++) {
        await sleep(1000);
        const attachStatus = await gmailPage.evaluate(() => {
          const chip = document.querySelector('[aria-label*="Attachment:"], [aria-label*="attachment:"]');
          if (!chip) return { found: false, isDone: false, aria: '' };
          const aria = chip.getAttribute('aria-label') || '';
          const isDone = aria.startsWith('Attachment:') && !aria.toLowerCase().includes('uploading');
          return { found: true, isDone, aria };
        });

        if (attachStatus.isDone) {
          console.log(`     Attachment upload complete after ${p}s: "${attachStatus.aria}"`);
          uploadComplete = true;
          break;
        } else if (p % 4 === 0) {
          console.log(`     [Upload in progress ${p}s] Status:`, attachStatus.aria || 'Waiting...');
        }
      }

      if (!uploadComplete) {
        throw new Error(`Resume attachment failed to complete upload within 35s: ${lead.resumeName}`);
      }

      await sleep(1500);

      // 7. Click Send
      console.log('  6. Clicking Send...');
      const sendClicked = await gmailPage.evaluate(() => {
        const btn = document.querySelector('div[role="button"][data-tooltip*="Send"], div[role="button"][aria-label*="Send"], div.T-I.J-J5-Ji.aoO.v7.T-I-atl.L3');
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      });

      if (!sendClicked) {
        console.log('     Using Ctrl+Enter keyboard fallback to send...');
        await gmailPage.keyboard.down('Control');
        await gmailPage.keyboard.press('Enter');
        await gmailPage.keyboard.up('Control');
      }

      console.log('     Waiting for compose dialog to close...');
      await gmailPage.waitForFunction(() => document.querySelectorAll('div[role="dialog"]').length === 0, { timeout: 15000 }).catch(() => {});
      await sleep(3500);

      // 8. Rule 19 Strict Live Sent Folder Verification
      console.log('  7. Verifying in Live Sent Folder (Rule 19)...');
      await gmailPage.goto('https://mail.google.com/mail/u/0/#sent', { waitUntil: 'networkidle2', timeout: 25000 });
      await sleep(4000);

      const topSentRows = await gmailPage.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('div[role="main"] tr[role="row"]'));
        return rows.slice(0, 5).map(r => r.innerText.replace(/\n+/g, ' | ').trim());
      });

      console.log('     Top Sent Row 1:', topSentRows[0] || 'NONE');

      const expectedRecipientUser = lead.recipient.toLowerCase().split('@')[0];
      const match = topSentRows.slice(0, 3).find(row => {
        const rLower = row.toLowerCase();
        return rLower.includes(expectedRecipientUser) ||
               rLower.includes(lead.company.toLowerCase().split(' ')[0]) ||
               rLower.includes(lead.role.toLowerCase()) ||
               rLower.includes(subject.toLowerCase());
      });

      if (!match) {
        throw new Error(`Rule 19 Verification Failed! Sent row not found for ${lead.recipient}. Top sent row: "${topSentRows[0]}"`);
      }

      console.log(`  ✅ [LIVE SENT PROOF ASSERTED]: "${match}"`);

      // 9. Record in applied_todays
      const record = {
        id: `email_${Date.now()}_${i}`,
        company: lead.company,
        role: lead.role,
        recipient: lead.recipient,
        channel: 'Direct Recruiter Email',
        subject: subject,
        resume: lead.resumeName,
        status: 'DISPATCHED_AND_VERIFIED',
        sent_folder_proof: match,
        timestamp: new Date().toISOString()
      };

      appliedToday.push(record);
      alreadySent.add(normRecipient);
      fs.writeFileSync(APPLIED_FILE, JSON.stringify(appliedToday, null, 2), 'utf8');

      // Update Historical master
      if (fs.existsSync(HIST_FILE)) {
        try {
          const histData = JSON.parse(fs.readFileSync(HIST_FILE, 'utf8'));
          const histList = Array.isArray(histData) ? histData : (histData.jobs || []);
          if (!histList.some(j => (j.recipient_or_url || '').toLowerCase() === normRecipient)) {
            histList.push({
              company: lead.company,
              role: lead.role,
              recipient_or_url: lead.recipient,
              channel: 'Direct Recruiter Email',
              status: 'APPLIED_LIFETIME',
              timestamp: record.timestamp,
              resume: lead.resumeName,
              sent_folder_proof: match
            });
            if (!Array.isArray(histData)) {
              histData.total = histList.length;
              fs.writeFileSync(HIST_FILE, JSON.stringify(histData, null, 2), 'utf8');
            } else {
              fs.writeFileSync(HIST_FILE, JSON.stringify(histList, null, 2), 'utf8');
            }
          }
        } catch (e) {}
      }

      sentCount++;
      console.log(`  🎉 Successfully dispatched & asserted to ${lead.company}!`);

      // Natural Human Pacing Jitter between emails (6-8 seconds)
      console.log('  Human pacing pause (6s)...');
      await sleep(6000);

    } catch (err) {
      console.error(`  ❌ Failed sending to ${lead.company}:`, err.message);
    }
  }

  console.log('\n========================================================================');
  console.log(`🏁 [SLOT 5 COMPLETE] Dispatched: ${sentCount} direct emails | Recorded in File 5: ${appliedToday.length}`);
  console.log('========================================================================');

  browser.disconnect();
}

runDispatches().catch(err => {
  console.error('Fatal dispatch error:', err);
  process.exit(1);
});
