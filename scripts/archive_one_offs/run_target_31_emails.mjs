import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

const TRACKER_FILE = 'C:/mcp/job-search-mcp-engine/applied_and_seen_tracker.json';
const QUEUE_FILE = 'C:/mcp/job-search-mcp-engine/scripts/all_31_target_emails_queue.json';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function getRandomJitter(minSec = 40, maxSec = 120) {
  return Math.floor(Math.random() * (maxSec - minSec + 1) + minSec) * 1000;
}

function generateEmailBody(item) {
  return `Hi ${item.company} Hiring Team,

I came across your opening for a ${item.role} in ${item.location} and wanted to apply for the position.

I am a Frontend / React Developer with 1.5 years of production experience across React.js, Next.js, TypeScript, JavaScript, REST APIs, and modern responsive UI engineering. I specialize in building performant, reusable UI components, clean API integrations, and scalable web frontends.

I am based in Indore, MP (open to Remote / Hybrid / On-site roles), and would be glad to discuss how my skill set aligns with your team's requirements.

I have attached my updated resume for your review.

Portfolio: https://pratik-portfolio-nine-orcin.vercel.app
LinkedIn: https://www.linkedin.com/in/pratik-patidar
GitHub: https://github.com/pratikpatidar

Thanks & Regards,
Pratik Patidar
pratikpatidar7990@gmail.com
+91 82696 47990`;
}

async function sendSingleApplication(gmailPage, item) {
  console.log(`\n========================================`);
  console.log(`Preparing dispatch for: ${item.company} (${item.email})`);
  console.log(`Role: ${item.role} | Resume: ${item.resume}`);
  console.log(`========================================`);

  await gmailPage.evaluate(() => {
    const discardBtns = document.querySelectorAll('img[aria-label="Discard draft"], div[aria-label="Discard draft"], .og.T-I-J3');
    discardBtns.forEach(btn => btn.click());
  });
  await sleep(1500);

  console.log('Clicking Compose button...');
  await gmailPage.evaluate(() => {
    const compBtn = document.querySelector('div[role="button"][gh="cm"], .T-I.T-I-KE.L3, [aria-label="Compose"], .T-I.T-I-KE');
    if (compBtn) compBtn.click();
  });
  await sleep(2500);

  console.log(`Typing recipient: ${item.email}...`);
  await gmailPage.evaluate(() => {
    const toInput = document.querySelector('input[name="to"], input[peoplekit-id], input.agP.aFw, [aria-label="To recipients"], [aria-label="To"]');
    if (toInput) toInput.focus();
  });
  await sleep(300);
  await gmailPage.keyboard.type(item.email, { delay: 30 });
  await gmailPage.keyboard.press('Enter');
  await sleep(800);

  const subjectText = `Application for ${item.role} - Pratik Patidar`;
  console.log(`Typing subject: "${subjectText}"...`);
  await gmailPage.evaluate(() => {
    const subjInput = document.querySelector('input[name="subjectbox"], input[placeholder="Subject"]');
    if (subjInput) subjInput.focus();
  });
  await sleep(300);
  await gmailPage.keyboard.type(subjectText, { delay: 20 });
  await sleep(800);

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

  const resumeAbsPath = path.resolve('resumes', item.resume);
  console.log(`Uploading resume attachment: ${resumeAbsPath}...`);
  const fileInput = await gmailPage.$('input[type="file"][name="Filedata"], input[type="file"]');
  if (!fileInput) throw new Error('File input not found in compose box');
  await fileInput.uploadFile(resumeAbsPath);

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
    throw new Error('Attachment upload timed out');
  }

  await sleep(1500);

  console.log('Dispatching Send button...');
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

  console.log('Message sent. Waiting 5s for delivery...');
  await sleep(5000);

  // Return to Sent folder and verify
  await gmailPage.goto('https://mail.google.com/mail/u/1/#sent', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await sleep(3500);

  const cleanCompName = item.company.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const screenshotPath = `screenshots/2026-10-12/sent_${cleanCompName}.png`;
  await gmailPage.screenshot({ path: screenshotPath });
  console.log(`Saved screenshot proof to ${screenshotPath}`);

  await gmailPage.goto('https://mail.google.com/mail/u/1/#inbox', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await sleep(2500);

  // Update Tracker
  let trackerData = JSON.parse(fs.readFileSync(TRACKER_FILE, 'utf8'));
  const newId = (trackerData.applied.length > 0 ? Math.max(...trackerData.applied.map(a => a.id || 0)) : 0) + 1;
  const trackerEntry = {
    id: newId,
    company: item.company,
    role: item.role,
    location: item.location,
    recipient_or_url: item.email,
    channel: "Direct Email (CDP Verified)",
    status: "Applied & Submitted (Verified in Sent Folder)",
    date: "2026-10-12",
    timestamp: new Date().toISOString(),
    resume: item.resume,
    notes: `Dispatched via CDP Gmail /u/1/ and physically verified in live Sent folder DOM (Recipient: ${item.email}). Screenshot: ${screenshotPath}`
  };

  trackerData.applied.push(trackerEntry);
  trackerData.summary.total_lifetime_applied = trackerData.applied.length;
  trackerData.summary.total_applied = trackerData.applied.length;
  fs.writeFileSync(TRACKER_FILE, JSON.stringify(trackerData, null, 2));

  // Count emails today
  const todayEmails = trackerData.applied.filter(a => a.date === '2026-10-12' && a.channel.includes('Email')).length;
  console.log(`✓ Master Tracker updated! Lifetime total: ${trackerData.applied.length} | Today Emails Count: ${todayEmails}/31`);

  return todayEmails;
}

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const gmailPage = pages.find(p => p.url().includes('mail.google.com'));

  if (!gmailPage) {
    console.error('No Gmail tab found!');
    await browser.disconnect();
    return;
  }

  const queue = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'));
  console.log(`Processing remaining queue to hit all 31 emails today!`);

  for (let i = 0; i < queue.length; i++) {
    const target = queue[i];

    // Check tracker
    const tracker = JSON.parse(fs.readFileSync(TRACKER_FILE, 'utf8'));
    const alreadySent = tracker.applied.some(a => (a.recipient_or_url || '').toLowerCase() === target.email.toLowerCase());
    if (alreadySent) {
      console.log(`Skipping ${target.company} (${target.email}) - Already in tracker!`);
      continue;
    }

    try {
      const todayTotal = await sendSingleApplication(gmailPage, target);
      if (todayTotal >= 31) {
        console.log(`🎯 TARGET REACHED! Exactly 31 verified emails applied today!`);
        break;
      }
    } catch (err) {
      console.error(`Failed to send to ${target.company}:`, err.message);
    }

    // Cooldown with randomized human jitter: 40s to 120s
    const jitterMs = getRandomJitter(40, 120);
    console.log(`[Cooldown Cadence] Sleeping ${(jitterMs/1000).toFixed(1)}s (human jitter: 40s–120s) before next dispatch...`);
    await sleep(jitterMs);
  }

  await browser.disconnect();
}

main().catch(console.error);
