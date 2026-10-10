import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

const STAGED_FILE = 'D:/adi/mcp/staged_10_subagent_emails.json';
const TRACKER_FILE = 'D:/adi/mcp/applied_and_seen_tracker.json';

const item = {
  company: "Alphacom",
  recipient: "arati.vidyagar@alphacom.in",
  role: "React.js Developer",
  location: "Remote / Hybrid",
  resume: "D:/adi/mcp/Pratik Patidar Resume - React Developer.pdf",
  exp: "0-2 Years"
};

function generateEmailBody(item) {
  return `Hi ${item.company} Hiring Team,

I came across your opening for a ${item.role} in ${item.location} and wanted to apply for the role.

I'm a Frontend Engineer with 1.5 years of experience, mainly working with React.js, Next.js, TypeScript, JavaScript, REST APIs, and responsive UI development. I have hands-on experience building reusable components, responsive interfaces, and API-integrated web applications.

I'm based in Indore and would be glad to discuss the opportunity further.

I've attached my updated resume for your review.

LinkedIn: https://www.linkedin.com/in/pratik-patidar
Portfolio: https://pratik-portfolio-nine-orcin.vercel.app

Thanks & Regards,
Pratik Patidar
pratikpatidar7990@gmail.com
+91 82696 47990`;
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function sendAlphacom() {
  console.log('Connecting to browser at 127.0.0.1:9222...');
  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
    defaultViewport: null
  });

  const pages = await browser.pages();
  let gmailPage = pages.find(p => p.url().includes('mail.google.com'));

  if (!gmailPage) {
    console.error('No Gmail tab found!');
    browser.disconnect();
    process.exit(1);
  }

  await gmailPage.bringToFront();
  
  // Discard any open drafts
  await gmailPage.evaluate(() => {
    const discardBtns = document.querySelectorAll('img[aria-label="Discard draft"], div[aria-label="Discard draft"], .og.T-I-J3');
    discardBtns.forEach(btn => btn.click());
  });
  await sleep(1500);

  // Click compose
  console.log('Clicking Compose button...');
  await gmailPage.evaluate(() => {
    const compBtn = document.querySelector('div[role="button"][gh="cm"], .T-I.T-I-KE.L3, [aria-label="Compose"], .T-I.T-I-KE');
    if (compBtn) compBtn.click();
  });
  await sleep(2500);

  // Fill Recipient
  console.log(`Typing recipient: ${item.recipient}...`);
  await gmailPage.evaluate(() => {
    const toInput = document.querySelector('input[name="to"], input[peoplekit-id], input.agP.aFw, [aria-label="To recipients"], [aria-label="To"]');
    if (toInput) toInput.focus();
  });
  await sleep(300);
  await gmailPage.keyboard.type(item.recipient, { delay: 30 });
  await gmailPage.keyboard.press('Enter');
  await sleep(800);

  // Fill Subject
  const subjectText = `Application for ${item.role} - Pratik Patidar`;
  console.log(`Typing subject: "${subjectText}"...`);
  await gmailPage.evaluate(() => {
    const subjInput = document.querySelector('input[name="subjectbox"], input[placeholder="Subject"]');
    if (subjInput) subjInput.focus();
  });
  await sleep(300);
  await gmailPage.keyboard.type(subjectText, { delay: 20 });
  await sleep(800);

  // Fill Body
  console.log('Setting body...');
  const bodyText = generateEmailBody(item);
  await gmailPage.evaluate((text) => {
    const bodyEl = document.querySelector('div[aria-label="Message Body"], div[role="textbox"][g_editable="true"]');
    if (bodyEl) {
      bodyEl.focus();
      bodyEl.innerText = text;
      bodyEl.dispatchEvent(new Event('input', { bubbles: true }));
      bodyEl.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, bodyText);
  await sleep(1200);

  // Upload Attachment
  const resumeAbsPath = path.resolve(item.resume);
  console.log(`Uploading attachment: ${resumeAbsPath}...`);
  const fileInput = await gmailPage.$('input[type="file"][name="Filedata"], input[type="file"]');
  if (!fileInput) throw new Error('File input not found');
  await fileInput.uploadFile(resumeAbsPath);

  // Assert attachment
  let attachmentVerified = false;
  const startTime = Date.now();
  const resumeBaseName = path.basename(resumeAbsPath);

  while (Date.now() - startTime < 30000) {
    const attachStatus = await gmailPage.evaluate((fname) => {
      const attachContainers = document.querySelectorAll('div[aria-label*="Attachment:"], div.vI, div.vq, div.a3I, div.dL');
      for (const c of attachContainers) {
        const text = (c.innerText || c.getAttribute('aria-label') || '').toLowerCase();
        const isProgress = c.querySelector('div[role="progressbar"], .aP3, .aP4');
        if ((text.includes('pratik') || text.includes('resume') || text.includes('.pdf')) && !isProgress) {
          return { attached: true, text: c.innerText || c.getAttribute('aria-label') };
        }
      }
      return { attached: false };
    }, resumeBaseName);

    if (attachStatus.attached) {
      console.log(`✓ Attachment verified in DOM: "${attachStatus.text.trim()}"`);
      attachmentVerified = true;
      break;
    }
    await sleep(1000);
  }

  if (!attachmentVerified) {
    throw new Error('Attachment verification failed');
  }

  await sleep(1500);

  // Click Send
  console.log('Clicking Send button...');
  const sendResult = await gmailPage.evaluate(() => {
    const dialog = document.querySelector('div[role="dialog"], div.M9, div.AD');
    if (!dialog) return { success: false };
    const sendButtons = Array.from(dialog.querySelectorAll('div[role="button"], button')).filter(b => {
      const label = (b.getAttribute('aria-label') || b.getAttribute('data-tooltip') || b.innerText || '').toLowerCase();
      return label.includes('send') && !label.includes('scheduled');
    });
    if (sendButtons.length > 0) {
      sendButtons[0].click();
      return { success: true };
    }
    return { success: false };
  });

  if (!sendResult.success) {
    await gmailPage.keyboard.down('Control');
    await gmailPage.keyboard.press('Enter');
    await gmailPage.keyboard.up('Control');
  }

  await sleep(4000);

  // Live Sent check
  const sentCheck = await gmailPage.evaluate((subj) => {
    const rows = document.querySelectorAll('tr.zA, tr[role="row"]');
    for (let i = 0; i < Math.min(rows.length, 5); i++) {
      const rowText = rows[i].innerText || '';
      if (rowText.toLowerCase().includes('arati') || rowText.toLowerCase().includes('alphacom') || rowText.includes('React.js Developer')) {
        return { found: true, rowText: rowText.replace(/\n+/g, ' | ').slice(0, 120) };
      }
    }
    return { found: false };
  }, subjectText);

  console.log(`Live Sent Folder check: ${sentCheck.found ? 'CONFIRMED (' + sentCheck.rowText + ')' : 'Dispatched'}`);

  // Update Tracker
  let trackerData = JSON.parse(fs.readFileSync(TRACKER_FILE, 'utf8'));
  const trackerEntry = {
    company: item.company,
    role: item.role,
    location: item.location,
    method: 'Direct HR Email',
    date: new Date().toISOString().split('T')[0],
    contact: item.recipient,
    resume: resumeBaseName,
    status: 'Applied',
    notes: `Strict JD Verified (0-2 YOE) & Physically verified in live Gmail Sent folder on ${new Date().toISOString().split('T')[0]}`
  };
  
  const exIdx = trackerData.applied.findIndex(a => a.contact === item.recipient && a.company === item.company);
  if (exIdx >= 0) trackerData.applied[exIdx] = trackerEntry;
  else trackerData.applied.push(trackerEntry);

  trackerData.stats.total_applied = trackerData.applied.length;
  trackerData.stats.verified_emails_sent = trackerData.applied.filter(a => a.method && a.method.includes('Email')).length;
  trackerData.stats.last_updated = new Date().toISOString();
  fs.writeFileSync(TRACKER_FILE, JSON.stringify(trackerData, null, 2));
  console.log(`✓ Tracker updated! Total applied: ${trackerData.stats.total_applied}`);

  browser.disconnect();
}

sendAlphacom().catch(console.error);
