/**
 * reply_himangi.cjs
 * Sends verified response to Himangi from Pratik Patidar's Gmail (pratikpatidar7990@gmail.com).
 * Physically verifies in Sent folder before recording.
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CANDIDATE_EMAIL = 'pratikpatidar7990@gmail.com';
const RECRUITER_EMAIL = 'himangisinghal30091994@gmail.com';

const REPLY_TEXT = `Hi Himangi,

Thank you for reaching out. Here are the requested details for my application:

• Date of Birth: 15/08/2002
• Preferred Interview Location: Indore, MP (Open to Remote / Bangalore / Pune / PAN-India)
• Notice Period: 15 Days
• Ex-Infosys Employee: No (N/A)

Please let me know if any further details or documents are required. Looking forward to the next steps.

Thanks & Regards,
Pratik Patidar
pratikpatidar7990@gmail.com
+91 82696 47990
LinkedIn: https://www.linkedin.com/in/pratik-patidar
Portfolio: https://pratik-portfolio-nine-orcin.vercel.app`;

(async () => {
  console.log(`=======================================================`);
  console.log(`📤 DISPATCHING VERIFIED REPLY TO: [${RECRUITER_EMAIL}]`);
  console.log(`=======================================================`);

  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const pages = await browser.pages();

  let pratikTab = pages.find(p => p.url().includes('mail.google.com/mail/u/1'));
  if (!pratikTab) {
    console.log('Pratik tab not open, creating new tab...');
    pratikTab = await browser.newPage();
  }

  // Navigate directly to search query for Himangi
  console.log('Navigating directly to Himangi search query in Pratik Gmail...');
  await pratikTab.goto('https://mail.google.com/mail/u/1/#search/himangisinghal30091994%40gmail.com', { waitUntil: 'networkidle2', timeout: 25000 });
  await new Promise(r => setTimeout(r, 4000));

  // Find Himangi's email row and click it
  const foundAndClicked = await pratikTab.evaluate(() => {
    const main = document.querySelector('div[role="main"]');
    if (!main) return false;
    const firstRow = main.querySelector('tr[role="row"]');
    if (firstRow) {
      firstRow.click();
      return true;
    }
    return false;
  });

  if (!foundAndClicked) {
    console.error('❌ Could not locate Himangi thread in inbox view.');
    browser.disconnect();
    process.exit(1);
  }

  console.log('✅ Opened Himangi email thread.');
  await new Promise(r => setTimeout(r, 4000));

  // Click Reply button
  const replyClicked = await pratikTab.evaluate(() => {
    const replyBtn = document.querySelector('span[role="link"][data-tooltip*="Reply"], div[role="button"][aria-label*="Reply"], span.ams.bkH');
    if (replyBtn) {
      replyBtn.click();
      return true;
    }
    // Fallback: look for button with text "Reply"
    const allBtns = Array.from(document.querySelectorAll('span, div, button'));
    const btn = allBtns.find(el => el.innerText && el.innerText.trim() === 'Reply' && el.offsetParent !== null);
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });

  console.log('Reply button clicked:', replyClicked);
  await new Promise(r => setTimeout(r, 3000));

  // Find the compose body
  const bodySelector = 'div[role="textbox"][aria-label*="Message Body"], div[role="textbox"]';
  await pratikTab.waitForSelector(bodySelector, { timeout: 10000 });

  console.log('Found reply compose box. Populating response via execCommand...');
  await pratikTab.evaluate((selector, text) => {
    const el = document.querySelector(selector);
    if (el) {
      el.focus();
      document.execCommand('selectAll', false, null);
      document.execCommand('delete', false, null);
      document.execCommand('insertText', false, text);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, bodySelector, REPLY_TEXT);

  await new Promise(r => setTimeout(r, 2000));

  // Trigger Send via keyboard shortcut (Ctrl + Enter) or Click
  console.log('Triggering Send via Ctrl + Enter...');
  await pratikTab.keyboard.down('Control');
  await pratikTab.keyboard.press('Enter');
  await pratikTab.keyboard.up('Control');

  await new Promise(r => setTimeout(r, 1500));
  await pratikTab.evaluate(() => {
    const sendBtn = document.querySelector('div[role="button"][data-tooltip*="Send"], div[aria-label*="Send"]');
    if (sendBtn && sendBtn.offsetParent !== null) {
      console.log('Clicking visible Send button...');
      sendBtn.click();
    }
  });

  console.log('Waiting for message to send...');
  await new Promise(r => setTimeout(r, 6000));

  // Step 4: Physically Assert in Gmail Sent folder
  console.log('\n--- PHYSICALLY ASSERTING IN GMAIL SENT FOLDER ---');
  await pratikTab.goto('https://mail.google.com/mail/u/1/#sent', { waitUntil: 'networkidle2', timeout: 25000 });
  await new Promise(r => setTimeout(r, 4000));

  const sentAsserted = await pratikTab.evaluate((targetEmail) => {
    const main = document.querySelector('div[role="main"]');
    if (!main) return { success: false, reason: 'no main' };
    const firstRow = main.querySelector('tr[role="row"]');
    if (!firstRow) return { success: false, reason: 'no rows in sent' };
    const text = firstRow.textContent || '';
    const isToHimangi = text.includes('Himangi') || text.includes('himangi') || text.includes('singhal');
    return {
      success: isToHimangi,
      firstRowText: text.replace(/\s+/g, ' ').slice(0, 150)
    };
  }, RECRUITER_EMAIL);

  console.log('Sent assertion result:', sentAsserted);

  if (sentAsserted.success) {
    console.log(`\n🎉 100% VERIFIED: Reply successfully sent to Himangi (${RECRUITER_EMAIL})!`);

    // Log to applied_todays_2026-10-16_shift1.json
    const appliedPath = path.resolve('applied_todays_2026-10-16_shift1.json');
    let appliedData = { date: '2026-10-16', shift: 1, total: 0, jobs: [] };
    if (fs.existsSync(appliedPath)) {
      try { appliedData = JSON.parse(fs.readFileSync(appliedPath, 'utf8')); } catch (e) {}
    }
    if (!Array.isArray(appliedData.jobs)) appliedData.jobs = [];

    appliedData.jobs.push({
      id: appliedData.jobs.length + 1,
      company: 'Himangi / Direct Recruiter (Infosys Client)',
      role: 'Frontend / React Developer',
      recipient: RECRUITER_EMAIL,
      channel: 'Direct Email Reply (Slot 1 Audit Response)',
      subject: 'Re: Frontend / React Developer Application - Pratik Patidar (Indore, MP)',
      answers_sent: {
        dob: '15/08/2002',
        preferred_location: 'Indore, MP (Open to PAN-India / Remote / Bangalore / Pune)',
        notice_period: '15 Days',
        ex_infosys: 'No (N/A)'
      },
      status: 'SENT_VERIFIED_OUTBOX',
      timestamp: new Date().toISOString()
    });

    appliedData.total = appliedData.jobs.length;
    fs.writeFileSync(appliedPath, JSON.stringify(appliedData, null, 2), 'utf8');
    console.log(`✅ Recorded to ${appliedPath}. Today Confirmed: ${appliedData.total}`);
  } else {
    console.error('⚠️ Warning: Could not confirm Himangi in the top row of Sent folder.');
  }

  browser.disconnect();
})();
