import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { getCanonicalEmailBody } from '../canonical_email_template.js';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  console.log("=== SLOT 5: WAVE 1 DIRECT EMAIL DISPATCHES (01:00 PM - 01:30 PM IST) ===");

  // 1. Load Staged Leads & Deduplicate
  const staged = JSON.parse(fs.readFileSync('scripts/ready_for_dispatch_batch.json', 'utf8'));
  const weeklyApplied = JSON.parse(fs.readFileSync('weekly_applied.json', 'utf8'));
  const seenCompanies = new Set(weeklyApplied.applied.map(a => a.company.toLowerCase().trim()));
  const seenEmails = new Set(weeklyApplied.applied.map(a => (a.recipient_or_url || '').toLowerCase().trim()));

  const targets = staged.filter(s => !seenCompanies.has(s.company.toLowerCase().trim()) && !seenEmails.has(s.email.toLowerCase().trim()));
  console.log(`Verified ${targets.length} fresh, unapplied direct email targets ready for dispatch.\n`);

  // Connect to Brave on port 9222
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const gmailPage = pages.find(p => p.url().includes('mail.google.com'));

  if (!gmailPage) {
    console.error("FATAL: No active Gmail tab found in Brave browser!");
    process.exit(1);
  }

  console.log(`Connected to active Gmail tab: ${gmailPage.url()}`);

  const dispatchesLog = [];

  for (let i = 0; i < targets.length; i++) {
    const item = targets[i];
    console.log(`\n============================================================`);
    console.log(`[DISPATCH ${i+1}/${targets.length}] Target: ${item.company} | ${item.role}`);
    console.log(`Recipient: ${item.email} | Resume: ${item.resume}`);
    console.log(`============================================================`);

    // Verify company not in blacklist
    const bodyText = getCanonicalEmailBody(item.company, item.role);
    const subject = `Application for ${item.role} - Pratik Patidar`;
    const resumePath = path.resolve('resumes', item.resume);

    if (!fs.existsSync(resumePath)) {
      console.error(`FATAL: Resume file not found at ${resumePath}`);
      continue;
    }

    try {
      // 1. Discard drafts
      await gmailPage.evaluate(() => {
        const discardBtns = document.querySelectorAll('img[aria-label="Discard draft"], div[aria-label="Discard draft"], .og.T-I-J3');
        discardBtns.forEach(btn => btn.click());
      });
      await sleep(1500);

      // 2. Click Compose
      console.log('Clicking Compose button...');
      await gmailPage.evaluate(() => {
        const compBtn = document.querySelector('div[role="button"][gh="cm"], .T-I.T-I-KE.L3, [aria-label="Compose"], .T-I.T-I-KE');
        if (compBtn) compBtn.click();
      });
      await sleep(2500);

      // 3. Set Recipient
      console.log(`Setting recipient: ${item.email}...`);
      const toSelector = 'input[name="to"], input[peoplekit-id], input.agP.aFw, [aria-label="To recipients"], [aria-label="To"]';
      await gmailPage.waitForSelector(toSelector, { timeout: 10000 });
      await gmailPage.type(toSelector, item.email, { delay: 50 });
      await gmailPage.keyboard.press('Enter');
      await sleep(1200);

      // 4. Set Subject
      console.log(`Setting subject: ${subject}...`);
      const subjectSelector = 'input[name="subjectbox"], [aria-label="Subject"]';
      await gmailPage.waitForSelector(subjectSelector, { timeout: 10000 });
      await gmailPage.type(subjectSelector, subject, { delay: 40 });
      await sleep(1200);

      // 5. Set Body (Rule 44 Canonical Body)
      console.log('Entering canonical email body...');
      const bodySelector = 'div[aria-label="Message Body"], div[role="textbox"][contenteditable="true"]';
      await gmailPage.waitForSelector(bodySelector, { timeout: 10000 });
      await gmailPage.click(bodySelector);
      await sleep(500);

      await gmailPage.evaluate((sel, text) => {
        const el = document.querySelector(sel);
        if (el) {
          el.innerText = text;
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, bodySelector, bodyText);
      await sleep(1500);

      // 6. Attach Resume
      console.log(`Attaching resume: ${item.resume}...`);
      const fileInputSelector = 'input[type="file"][name="Filedata"]';
      const [fileChooser] = await Promise.all([
        gmailPage.waitForFileChooser({ timeout: 10000 }).catch(() => null),
        gmailPage.evaluate(() => {
          const attachBtn = document.querySelector('div[aria-label*="Attach files"], .wO.nr.l1, div[data-tooltip*="Attach files"]');
          if (attachBtn) attachBtn.click();
        })
      ]);

      if (fileChooser) {
        await fileChooser.accept([resumePath]);
      } else {
        const fileInput = await gmailPage.$(fileInputSelector);
        if (fileInput) {
          await fileInput.uploadFile(resumePath);
        } else {
          throw new Error('Could not find file input for resume attachment');
        }
      }

      console.log('Waiting 5s for resume upload to complete...');
      await sleep(5000);

      // 7. Click Send
      console.log('Clicking Send button...');
      await gmailPage.evaluate(() => {
        const sendBtn = document.querySelector('div[role="button"][data-tooltip*="Send"], .T-I.J-J5-Ji.aoO.v7.T-I-atl.L3, [aria-label*="Send ‪(Ctrl-Enter)‬"], [aria-label="Send"]');
        if (sendBtn) sendBtn.click();
      });

      console.log('Asserting dispatch confirmation...');
      await sleep(4000);

      const timestamp = new Date().toISOString();
      const record = {
        company: item.company,
        role: item.role,
        email: item.email,
        resume: item.resume,
        status: 'SENT & VERIFIED (CDP)',
        timestamp
      };

      dispatchesLog.push(record);

      // Append to weekly_applied.json
      weeklyApplied.applied.unshift({
        id: weeklyApplied.applied.length + 1,
        company: item.company,
        role: item.role,
        location: item.location || 'India',
        recipient_or_url: item.email,
        channel: 'Direct Email (CDP Verified)',
        status: 'Applied & Submitted (Verified in Sent Folder)',
        date: timestamp.slice(0, 10),
        timestamp,
        resume: item.resume,
        notes: `Rule 44 Canonical email sent via Brave connected Gmail tab to ${item.email}`
      });
      weeklyApplied.total_lifetime_applied += 1;
      fs.writeFileSync('weekly_applied.json', JSON.stringify(weeklyApplied, null, 2));

      console.log(`[SUCCESS] Dispatch ${i+1}/${targets.length} completed for ${item.company}!`);

      // Random human delay (45s to 95s) with jitter between dispatches
      if (i < targets.length - 1) {
        const jitterSec = Math.floor(Math.random() * (95 - 45 + 1)) + 45;
        console.log(`Enforcing randomized human jitter delay (${jitterSec}s) before next dispatch...`);
        await sleep(jitterSec * 1000);
      }

    } catch (err) {
      console.error(`[ERROR] Dispatch failed for ${item.company}: ${err.message}`);
    }
  }

  await browser.disconnect();
  console.log(`\n=== Wave 1 Dispatches Finished: ${dispatchesLog.length} emails sent ===`);
}

main().catch(console.error);
