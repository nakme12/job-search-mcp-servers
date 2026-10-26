const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const sleep = ms => new Promise(r => setTimeout(r, ms));

const ENGINE_ROOT = path.resolve(__dirname, '..');
const TODAY_DATE = '2026-10-25';
const APPLIED_FILE = path.join(ENGINE_ROOT, `applied_todays_${TODAY_DATE}.json`);
const HIST_FILE = path.join(ENGINE_ROOT, 'total_historical_except_today.json');

const TARGETS = [
  {
    company: 'AHOM Technologies Pvt. Ltd.',
    recipient: 'jyoti.singh@ahomtech.com',
    role: 'Frontend Developer',
    location: 'Gurugram',
    resumeName: 'Pratik Patidar Resume - Frontend Engineer.pdf',
    resumePath: path.join(ENGINE_ROOT, 'resumes', 'Pratik Patidar Resume - Frontend Engineer.pdf'),
    subject: 'Application: Frontend Developer - Pratik Patidar',
    bodyLines: [
      'Hi Jyoti Singh & AHOM Technologies Hiring Team,',
      '',
      'I came across your opening for a Frontend Developer in Gurugram and wanted to apply for the role.',
      '',
      'I am a Frontend Engineer with 1.5 years of experience, mainly working with React.js, Next.js, TypeScript, JavaScript, REST APIs, and responsive UI development. I have hands-on experience building reusable components, clean interfaces, and API-integrated web applications.',
      '',
      'I am based in Indore and would be glad to discuss the opportunity further.',
      '',
      'I have attached my updated resume for your review.',
      '',
      'LinkedIn: https://www.linkedin.com/in/pratik-patidar',
      'Portfolio: https://pratik-portfolio-nine-orcin.vercel.app',
      '',
      'Thanks & Regards,',
      'Pratik Patidar',
      'pratikpatidar7990@gmail.com',
      '+91 82696 47990'
    ]
  },
  {
    company: 'BQarlson Software Technologies',
    recipient: 'hr@bqarlson.tech',
    role: 'Full Stack Developer',
    location: 'India',
    resumeName: 'Pratik Patidar Resume - MERN Full Stack.pdf',
    resumePath: path.join(ENGINE_ROOT, 'resumes', 'Pratik Patidar Resume - MERN Full Stack.pdf'),
    subject: 'Application: Full Stack Developer - Pratik Patidar',
    bodyLines: [
      'Hi BQarlson Hiring Team,',
      '',
      'I came across your hiring notification for Full Stack Developers and wanted to apply for the role.',
      '',
      'I am a Full Stack / Frontend Engineer with 1.5 years of experience, specializing in React.js, Next.js, TypeScript, Node.js, REST APIs, and modern web application development. I have hands-on experience building end-to-end features, modular components, and API integrations.',
      '',
      'I am based in Indore and would be glad to discuss relevant software engineering opportunities with your team.',
      '',
      'I have attached my updated resume for your review.',
      '',
      'LinkedIn: https://www.linkedin.com/in/pratik-patidar',
      'Portfolio: https://pratik-portfolio-nine-orcin.vercel.app',
      '',
      'Thanks & Regards,',
      'Pratik Patidar',
      'pratikpatidar7990@gmail.com',
      '+91 82696 47990'
    ]
  },
  {
    company: 'ZoflowX (Zoho Partner)',
    recipient: 'hr@zoflowx.com',
    role: 'Software Engineer / Web Developer',
    location: 'India',
    resumeName: 'Pratik Patidar Resume - Frontend Engineer.pdf',
    resumePath: path.join(ENGINE_ROOT, 'resumes', 'Pratik Patidar Resume - Frontend Engineer.pdf'),
    subject: 'Application: Software Engineer / Web Developer - Pratik Patidar',
    bodyLines: [
      'Hi ZoflowX Hiring Team,',
      '',
      'I came across your opening for software development roles and wanted to apply for engineering opportunities.',
      '',
      'I am a Software Engineer with 1.5 years of experience specializing in React.js, Next.js, TypeScript, JavaScript, REST APIs, and web application development. I have hands-on experience building clean, responsive interfaces, robust components, and API integrations.',
      '',
      'I am based in Indore and would be glad to discuss the role further.',
      '',
      'I have attached my updated resume for your review.',
      '',
      'LinkedIn: https://www.linkedin.com/in/pratik-patidar',
      'Portfolio: https://pratik-portfolio-nine-orcin.vercel.app',
      '',
      'Thanks & Regards,',
      'Pratik Patidar',
      'pratikpatidar7990@gmail.com',
      '+91 82696 47990'
    ]
  }
];

async function cleanupDrafts(page) {
  try {
    await page.evaluate(() => {
      const discards = document.querySelectorAll('div[data-tooltip*="Discard draft"], div[aria-label*="Discard draft"]');
      discards.forEach(d => d.click());
    });
    await sleep(1500);
  } catch (e) {}
}

async function dispatchAll() {
  console.log('=================================================================');
  console.log(`🚀 [SLOT 5 DISPATCH] STARTING EMAIL APPLICATIONS DISPATCH`);
  console.log('=================================================================');

  let appliedToday = [];
  if (fs.existsSync(APPLIED_FILE)) {
    try {
      appliedToday = JSON.parse(fs.readFileSync(APPLIED_FILE, 'utf8'));
      if (!Array.isArray(appliedToday)) appliedToday = [];
    } catch (e) { appliedToday = []; }
  }

  // Filter out targets already dispatched & verified
  const pendingTargets = TARGETS.filter(t => {
    return !appliedToday.some(a => (a.recipient || '').toLowerCase() === t.recipient.toLowerCase());
  });

  console.log(`Already verified today: ${appliedToday.length} targets.`);
  console.log(`Pending to dispatch: ${pendingTargets.length} targets.`);

  if (pendingTargets.length === 0) {
    console.log('All targets already dispatched and verified!');
    return;
  }

  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', protocolTimeout: 120000 });
  const pages = await browser.pages();
  let page = pages.find(p => p.url().includes('mail.google.com'));

  if (!page) {
    console.log('Opening new Gmail tab on port 9222...');
    page = await browser.newPage();
    await page.goto('https://mail.google.com/mail/u/0/#inbox', { waitUntil: 'domcontentloaded', timeout: 30000 });
  }

  await page.bringToFront();
  await cleanupDrafts(page);

  for (let i = 0; i < pendingTargets.length; i++) {
    const t = pendingTargets[i];
    console.log(`\n-------------------------------------------------------------`);
    console.log(`[Dispatch ${i + 1}/${pendingTargets.length}] Target: ${t.company} -> ${t.recipient}`);
    console.log(`-------------------------------------------------------------`);

    try {
      // 1. Clean slate navigation
      await page.goto('https://mail.google.com/mail/u/0/#inbox', { waitUntil: 'domcontentloaded', timeout: 20000 });
      await sleep(2500);
      await cleanupDrafts(page);

      // 2. Open Compose dialog via DOM click
      console.log('   Clicking Compose button...');
      await page.evaluate(() => {
        const btn = document.querySelector('div[gh="cm"]');
        if (btn) btn.click();
      });

      await page.waitForFunction(() => document.querySelectorAll('div[role="dialog"]').length > 0, { timeout: 15000 });
      await sleep(1500);

      // 3. Type Recipient
      console.log('   Typing Recipient:', t.recipient);
      const recipientFocused = await page.evaluate(() => {
        const toInput = document.querySelector('input[aria-label="To recipients"], input[peoplekit-id], input.agP, input[type="text"]');
        if (!toInput) return false;
        toInput.focus();
        toInput.value = '';
        return true;
      });
      if (!recipientFocused) throw new Error('To recipient input not found or could not focus');

      await sleep(300);
      await page.keyboard.type(t.recipient, { delay: 15 });
      await sleep(400);
      await page.keyboard.press('Enter');
      await sleep(500);

      // 4. Type Subject
      console.log('   Typing Subject:', t.subject);
      const subjectFocused = await page.evaluate(() => {
        const subj = document.querySelector('input[name="subjectbox"]');
        if (!subj) return false;
        subj.focus();
        subj.value = '';
        return true;
      });
      if (!subjectFocused) throw new Error('Subject input not found or could not focus');

      await sleep(300);
      await page.keyboard.type(t.subject, { delay: 12 });
      await sleep(500);

      // 5. Type Body
      console.log('   Typing Body lines...');
      const bodyFocused = await page.evaluate(() => {
        const body = document.querySelector('div[aria-label="Message Body"], div[role="textbox"]');
        if (!body) return false;
        body.focus();
        return true;
      });
      if (!bodyFocused) throw new Error('Message body editor not found or could not focus');

      await sleep(300);
      for (const line of t.bodyLines) {
        if (line === '') {
          await page.keyboard.press('Enter');
        } else {
          await page.keyboard.type(line, { delay: 1 });
          await page.keyboard.press('Enter');
        }
      }
      await sleep(1500);

      // 6. Attach Resume
      console.log('   Attaching Resume:', t.resumeName);
      const fileInput = await page.$('input[name="Filedata"], input[type="file"]');
      if (!fileInput) throw new Error('File attachment input not found');

      await fileInput.uploadFile(t.resumePath);
      console.log('   Uploaded file to input, waiting for attachment completion in DOM (up to 45s)...');

      let uploadComplete = false;
      for (let p = 1; p <= 45; p++) {
        await sleep(1000);
        const attachStatus = await page.evaluate(() => {
          const chip = document.querySelector('[aria-label*="Attachment:"], [aria-label*="attachment:"]');
          if (!chip) return { found: false, isDone: false, aria: '' };
          const aria = chip.getAttribute('aria-label') || '';
          const isDone = aria.startsWith('Attachment:') && !aria.toLowerCase().includes('uploading');
          return { found: true, isDone, aria };
        });

        if (attachStatus.isDone) {
          console.log(`   Attachment upload complete after ${p}s: "${attachStatus.aria}"`);
          uploadComplete = true;
          break;
        } else if (p % 3 === 0) {
          console.log(`   [Upload in progress ${p}s] Status:`, attachStatus.aria || 'Waiting...');
        }
      }

      if (!uploadComplete) {
        throw new Error(`Resume attachment failed to complete upload within 45s: ${t.resumeName}`);
      }

      await sleep(1500);

      // 7. Click Send
      console.log('   Clicking Send...');
      const sendClicked = await page.evaluate(() => {
        const btn = document.querySelector('div[role="button"][data-tooltip*="Send"], div[role="button"][aria-label*="Send"], div.T-I.J-J5-Ji.aoO.v7.T-I-atl.L3');
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      });

      if (!sendClicked) {
        console.log('   Using Ctrl+Enter keyboard fallback to send...');
        await page.keyboard.down('Control');
        await page.keyboard.press('Enter');
        await page.keyboard.up('Control');
      }

      console.log('   Waiting for compose dialog to close...');
      await page.waitForFunction(() => document.querySelectorAll('div[role="dialog"]').length === 0, { timeout: 15000 }).catch(() => {});
      await sleep(3500);

      // 8. Rule 19 Strict Live Sent Folder Verification
      console.log('   Verifying in Live Sent Folder (Rule 19)...');
      await page.goto('https://mail.google.com/mail/u/0/#sent', { waitUntil: 'networkidle2', timeout: 25000 });
      await sleep(4000);

      const topSentRows = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('div[role="main"] tr[role="row"]'));
        return rows.slice(0, 5).map(r => r.innerText.replace(/\n+/g, ' | ').trim());
      });

      console.log('   Top Sent Row 1:', topSentRows[0] || 'NONE');
      console.log('   Top Sent Row 2:', topSentRows[1] || 'NONE');

      const expectedRecipientUser = t.recipient.toLowerCase().split('@')[0];
      const match = topSentRows.slice(0, 3).find(row => {
        const rLower = row.toLowerCase();
        return rLower.includes(expectedRecipientUser) ||
               rLower.includes(t.company.toLowerCase().split(' ')[0]) ||
               rLower.includes(t.role.toLowerCase()) ||
               rLower.includes(t.subject.toLowerCase());
      });

      if (!match) {
        throw new Error(`Rule 19 Verification Failed! Sent row not found for ${t.recipient}. Top sent row: "${topSentRows[0]}"`);
      }

      console.log(`   ✅ [LIVE SENT PROOF ASSERTED]: "${match}"`);

      const record = {
        id: `email_${Date.now()}_${i}`,
        company: t.company,
        role: t.role,
        recipient: t.recipient,
        subject: t.subject,
        channel: 'Direct Recruiter Email',
        resume: t.resumeName,
        status: 'DISPATCHED_AND_VERIFIED',
        sent_folder_proof: match,
        timestamp: new Date().toISOString()
      };

      appliedToday.push(record);
      fs.writeFileSync(APPLIED_FILE, JSON.stringify(appliedToday, null, 2), 'utf8');
      console.log(`   🎉 Successfully dispatched & asserted to ${t.company}!`);

    } catch (err) {
      console.error(`   ❌ Failed dispatch for ${t.company}:`, err.message);
    }

    await sleep(4000);
  }

  // Update total_historical_except_today.json
  if (fs.existsSync(HIST_FILE)) {
    try {
      const histData = JSON.parse(fs.readFileSync(HIST_FILE, 'utf8'));
      appliedToday.forEach(app => {
        const alreadyIn = (histData.jobs || []).some(j => (j.recipient_or_url || '').toLowerCase() === app.recipient.toLowerCase());
        if (!alreadyIn) {
          histData.jobs.push({
            company: app.company,
            role: app.role,
            recipient_or_url: app.recipient,
            channel: 'Direct Recruiter Email',
            status: 'APPLIED_LIFETIME',
            timestamp: app.timestamp,
            resume: app.resume,
            sent_folder_proof: app.sent_folder_proof
          });
        }
      });
      histData.total = (histData.jobs || []).length;
      fs.writeFileSync(HIST_FILE, JSON.stringify(histData, null, 2), 'utf8');
      console.log(`Updated historical records: ${histData.total} lifetime jobs.`);
    } catch (e) {
      console.warn('Warning updating historical file:', e.message);
    }
  }

  console.log('\n=================================================================');
  console.log(`🏁 [DISPATCH COMPLETE] ${appliedToday.length}/${TARGETS.length} applications verified in live Sent folder.`);
  console.log('=================================================================');

  browser.disconnect();
}

dispatchAll().catch(err => {
  console.error('Fatal Dispatch Error:', err);
  process.exit(1);
});
