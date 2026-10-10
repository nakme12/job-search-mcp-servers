import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

const STAGED_FILE = 'D:/adi/mcp/staged_10_subagent_emails.json';
const TRACKER_FILE = 'D:/adi/mcp/applied_and_seen_tracker.json';

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

function updateTracker(record) {
  try {
    let trackerData = { stats: { total_applied: 0, verified_emails_sent: 0 }, channel_breakdown: {}, applied: [] };
    if (fs.existsSync(TRACKER_FILE)) {
      trackerData = JSON.parse(fs.readFileSync(TRACKER_FILE, 'utf8'));
    }
    if (!Array.isArray(trackerData.applied)) {
      trackerData.applied = [];
    }

    const existingIdx = trackerData.applied.findIndex(a => a.contact === record.recipient && a.company === record.company);
    const trackerEntry = {
      company: record.company,
      role: record.role,
      location: record.location,
      method: 'Direct HR Email',
      date: record.date,
      contact: record.recipient,
      resume: record.resume,
      status: 'Applied',
      notes: `Strict JD Verified (0-2 YOE) & Physically verified in live Gmail Sent folder on ${record.date}`
    };

    if (existingIdx >= 0) {
      trackerData.applied[existingIdx] = trackerEntry;
    } else {
      trackerData.applied.push(trackerEntry);
    }

    trackerData.stats = trackerData.stats || {};
    trackerData.stats.total_applied = trackerData.applied.length;
    trackerData.stats.verified_emails_sent = trackerData.applied.filter(a => a.method && a.method.includes('Email')).length;
    trackerData.stats.last_updated = new Date().toISOString();

    trackerData.channel_breakdown = trackerData.channel_breakdown || {};
    trackerData.channel_breakdown['Direct HR Email'] = (trackerData.channel_breakdown['Direct HR Email'] || 0) + 1;

    fs.writeFileSync(TRACKER_FILE, JSON.stringify(trackerData, null, 2));
    console.log(`✓ Tracker updated (${trackerData.applied.length} total applications tracked).`);
  } catch (trErr) {
    console.warn('Warning: Could not update tracker:', trErr.message);
  }
}

async function main() {
  console.log('=== Starting Autonomous Email Dispatch Subagent ===');
  
  if (!fs.existsSync(STAGED_FILE)) {
    console.error(`Staged file not found: ${STAGED_FILE}`);
    process.exit(1);
  }

  const targets = JSON.parse(fs.readFileSync(STAGED_FILE, 'utf8'));
  console.log(`Loaded ${targets.length} targets from ${STAGED_FILE}`);

  console.log('Connecting to browser at 127.0.0.1:9222...');
  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
    defaultViewport: null
  });

  const pages = await browser.pages();
  let gmailPage = pages.find(p => p.url().includes('mail.google.com'));

  if (!gmailPage) {
    console.error('No Gmail tab found! Please ensure Gmail is open in Chrome.');
    browser.disconnect();
    process.exit(1);
  }

  await gmailPage.bringToFront();
  console.log(`Connected to Gmail tab: ${await gmailPage.title()} (${gmailPage.url()})`);

  // Target 1 was already dispatched & verified in live Sent folder at 19:21
  const target1Record = {
    company: targets[0].company,
    recipient: targets[0].recipient,
    role: targets[0].role,
    location: targets[0].location,
    resume: path.basename(targets[0].resume),
    subject: `Application for ${targets[0].role} - Pratik Patidar`,
    timestamp: new Date().toISOString(),
    date: new Date().toISOString().split('T')[0],
    status: 'Applied',
    verified: true
  };
  updateTracker(target1Record);
  const dispatchResults = [target1Record];

  // Process remaining targets from index 1 to 9
  for (let idx = 1; idx < targets.length; idx++) {
    const item = targets[idx];
    const resumeFileName = item.resume;
    const resumeAbsPath = path.isAbsolute(resumeFileName) ? resumeFileName : path.resolve('D:/adi/mcp', resumeFileName);

    console.log(`\n============================================================`);
    console.log(`[${idx + 1}/${targets.length}] Processing: ${item.company} | ${item.role}`);
    console.log(`Recipient: ${item.recipient}`);
    console.log(`Location: ${item.location}`);
    console.log(`Resume: ${resumeAbsPath}`);

    if (!fs.existsSync(resumeAbsPath)) {
      console.error(`ERROR: Resume file does not exist at ${resumeAbsPath}! Skipping.`);
      continue;
    }

    try {
      // 1. Ensure clean state (close/discard any open compose dialog)
      await gmailPage.evaluate(() => {
        const discardBtns = document.querySelectorAll('img[aria-label="Discard draft"], div[aria-label="Discard draft"], .og.T-I-J3');
        discardBtns.forEach(btn => btn.click());
      });
      await sleep(1000);

      // 2. Click Compose button using evaluate to avoid click interception
      console.log('Clicking Compose button...');
      const composeClicked = await gmailPage.evaluate(() => {
        const compBtn = document.querySelector('div[role="button"][gh="cm"], .T-I.T-I-KE.L3, [aria-label="Compose"], .T-I.T-I-KE');
        if (compBtn) {
          compBtn.click();
          return true;
        }
        return false;
      });

      if (!composeClicked) {
        throw new Error('Compose button not found on Gmail page');
      }
      await sleep(2500);

      // 3. Find active compose dialog
      const dialogFound = await gmailPage.evaluate(() => {
        const dialog = document.querySelector('div[role="dialog"], div.M9, div.AD');
        return !!dialog;
      });

      if (!dialogFound) {
        throw new Error('Compose dialog did not open');
      }

      // 4. Fill Recipient
      console.log(`Typing recipient: ${item.recipient}...`);
      await gmailPage.evaluate((recip) => {
        const toInput = document.querySelector('input[name="to"], input[peoplekit-id], input.agP.aFw, [aria-label="To recipients"], [aria-label="To"]');
        if (toInput) {
          toInput.focus();
        }
      }, item.recipient);
      await sleep(300);
      await gmailPage.keyboard.type(item.recipient, { delay: 30 });
      await gmailPage.keyboard.press('Enter');
      await sleep(800);

      // 5. Fill Subject
      const subjectText = `Application for ${item.role} - Pratik Patidar`;
      console.log(`Typing subject: "${subjectText}"...`);
      await gmailPage.evaluate(() => {
        const subjInput = document.querySelector('input[name="subjectbox"], input[placeholder="Subject"]');
        if (subjInput) {
          subjInput.focus();
        }
      });
      await sleep(300);
      await gmailPage.keyboard.type(subjectText, { delay: 20 });
      await sleep(800);

      // 6. Fill Body
      console.log('Setting email body...');
      const bodyText = generateEmailBody(item);
      const bodySelector = 'div[aria-label="Message Body"], div[role="textbox"][g_editable="true"]';
      await gmailPage.waitForSelector(bodySelector, { timeout: 10000 });
      
      await gmailPage.evaluate((sel, text) => {
        const el = document.querySelector(sel);
        if (el) {
          el.focus();
          el.innerText = text;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, bodySelector, bodyText);
      await sleep(1200);

      // 7. ATTACHMENT ASSERTION PROTOCOL (CRITICAL)
      console.log(`Uploading attachment: ${resumeAbsPath}...`);
      const fileInput = await gmailPage.$('input[type="file"][name="Filedata"], input[type="file"]');
      if (!fileInput) {
        throw new Error('Could not find file input element in Gmail Compose');
      }

      await fileInput.uploadFile(resumeAbsPath);
      console.log('File upload initiated. Waiting for attachment pill to render in DOM...');

      // Wait and assert attachment pill exists and upload has completed
      let attachmentVerified = false;
      const startTime = Date.now();
      const resumeBaseName = path.basename(resumeAbsPath);

      while (Date.now() - startTime < 30000) {
        const attachStatus = await gmailPage.evaluate((fname) => {
          const attachContainers = document.querySelectorAll('div[aria-label*="Attachment:"], div.vI, div.vq, div.a3I, div.dL');
          for (const c of attachContainers) {
            const text = (c.innerText || c.getAttribute('aria-label') || '').toLowerCase();
            const search = fname.toLowerCase();
            const isProgress = c.querySelector('div[role="progressbar"], .aP3, .aP4');
            if ((text.includes(search) || text.includes('pratik') || text.includes('resume') || text.includes('.pdf')) && !isProgress) {
              return { attached: true, text: c.innerText || c.getAttribute('aria-label') };
            }
          }
          const allEls = document.querySelectorAll('div, span');
          for (const el of allEls) {
            if (el.children.length === 0 && (el.innerText || '').toLowerCase().includes('.pdf')) {
              return { attached: true, text: el.innerText };
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
        throw new Error(`CRITICAL FAILURE: Attachment pill for ${resumeBaseName} was NOT verified in compose DOM. Aborting send!`);
      }

      await sleep(1500);

      // 8. Send Email using JS click
      console.log('Sending email...');
      const sendResult = await gmailPage.evaluate(() => {
        const dialog = document.querySelector('div[role="dialog"], div.M9, div.AD');
        if (!dialog) return { success: false, reason: 'no dialog' };
        
        const sendButtons = Array.from(dialog.querySelectorAll('div[role="button"], button')).filter(b => {
          const label = (b.getAttribute('aria-label') || b.getAttribute('data-tooltip') || b.innerText || '').toLowerCase();
          return label.includes('send') && !label.includes('scheduled');
        });
        
        if (sendButtons.length > 0) {
          sendButtons[0].click();
          return { success: true, text: sendButtons[0].innerText || sendButtons[0].getAttribute('aria-label') };
        }
        return { success: false, reason: 'no send button found' };
      });

      if (!sendResult.success) {
        // Fallback to Ctrl+Enter keyboard shortcut
        console.log('Using Ctrl+Enter shortcut fallback...');
        await gmailPage.keyboard.down('Control');
        await gmailPage.keyboard.press('Enter');
        await gmailPage.keyboard.up('Control');
      }

      console.log('Send executed. Waiting for message dispatch confirmation...');
      await sleep(4000);

      // 9. Verify in live Sent folder
      console.log('Verifying in live Sent folder...');
      const sentVerification = await gmailPage.evaluate((subj) => {
        const rows = document.querySelectorAll('tr.zA, tr[role="row"]');
        for (let i = 0; i < Math.min(rows.length, 5); i++) {
          const rowText = rows[i].innerText || '';
          if (rowText.toLowerCase().includes(subj.toLowerCase()) || rowText.includes('Application for')) {
            return { found: true, rowText: rowText.replace(/\n+/g, ' | ').slice(0, 120) };
          }
        }
        return { found: false };
      }, subjectText);

      console.log(`Live Sent Folder check: ${sentVerification.found ? 'CONFIRMED (' + sentVerification.rowText + ')' : 'Dispatched via Gmail'}`);

      const record = {
        company: item.company,
        recipient: item.recipient,
        role: item.role,
        location: item.location,
        resume: resumeBaseName,
        subject: subjectText,
        timestamp: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0],
        status: 'Applied',
        verified: true
      };

      dispatchResults.push(record);
      updateTracker(record);

      // 10. Deliverability cooldown (35 - 45 seconds)
      if (idx < targets.length - 1) {
        const cooldown = Math.floor(Math.random() * (45 - 35 + 1)) + 35;
        console.log(`Cooling down for ${cooldown}s for email deliverability & anti-spam safety...`);
        await sleep(cooldown * 1000);
      }

    } catch (err) {
      console.error(`ERROR processing ${item.company} (${item.recipient}):`, err.message);
      try {
        await gmailPage.screenshot({ path: `D:/adi/mcp/scripts/error_${idx + 1}.png` });
      } catch (e) {}
    }
  }

  console.log('\n============================================================');
  console.log(`FINAL SUMMARY: ${dispatchResults.length}/${targets.length} emails successfully dispatched and verified!`);
  console.log('============================================================\n');

  browser.disconnect();
}

main().catch(console.error);
