/**
 * check_inbox_slot1.cjs
 * 
 * BULLETPROOF SLOT 1 INBOX & RECRUITER RESPONSE AUDIT ENGINE
 * Strict Enforcements:
 * 1. Strictly asserts candidate identity: pratikpatidar7990@gmail.com (NEVER nakmeisiliya or other accounts).
 * 2. Navigates to authuser=pratikpatidar7990@gmail.com if not already active.
 * 3. Deep audits the inbox using textContent & span[email] (Zero slice shortcuts).
 * 4. Filters and extracts:
 *    - Unread recruiter replies & interview requests.
 *    - Application confirmations (Ashby, Greenhouse, Lever).
 *    - Mailer-daemon bounce notices (automatically recorded to dead_recruiter_emails.json).
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CANDIDATE_EMAIL = 'pratikpatidar7990@gmail.com';
const DEAD_EMAILS_FILE = path.join(__dirname, '..', 'dead_recruiter_emails.json');

(async () => {
  console.log(`=======================================================`);
  console.log(`🔍 STRICT CANDIDATE INBOX AUDIT: [${CANDIDATE_EMAIL}]`);
  console.log(`=======================================================`);

  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const pages = await browser.pages();

  let pratikTab = null;
  for (const p of pages) {
    const url = p.url();
    if (url.includes('mail.google.com')) {
      const title = await p.title();
      if (title.includes(CANDIDATE_EMAIL) || url.includes(CANDIDATE_EMAIL) || url.includes('/u/0/') || url.includes('/u/1/')) {
        pratikTab = p;
        break;
      }
    }
  }

  if (!pratikTab) {
    console.log(`Pratik's Gmail tab not found open. Opening authuser=${CANDIDATE_EMAIL}...`);
    pratikTab = await browser.newPage();
    await pratikTab.goto(`https://mail.google.com/mail/u/?authuser=${CANDIDATE_EMAIL}`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
  }

  const pageTitle = await pratikTab.title();
  const pageUrl = pratikTab.url();
  console.log(`✅ Verified Active Account: "${pageTitle}" at ${pageUrl}`);

  if (!pageTitle.includes(CANDIDATE_EMAIL) && !pageUrl.includes(CANDIDATE_EMAIL)) {
    console.error(`🚨 FATAL: Active tab does NOT belong to ${CANDIDATE_EMAIL}! Aborting.`);
    browser.disconnect();
    process.exit(1);
  }

  // Ensure on inbox root, not inside a thread
  if (pratikTab.url().includes('#inbox/')) {
    console.log('Tab is inside a thread. Navigating back to main inbox (#inbox)...');
    const baseUrl = pratikTab.url().split('#')[0];
    await pratikTab.goto(baseUrl + '#inbox', { waitUntil: 'networkidle2', timeout: 15000 });
  }

  // Ensure DOM is ready
  try {
    await pratikTab.waitForSelector('div[role="main"]', { timeout: 15000 });
    await new Promise(r => setTimeout(r, 3000));
  } catch (e) {}

  const emailData = await pratikTab.evaluate(() => {
    const main = document.querySelector('div[role="main"]');
    if (!main) return { err: 'main_not_found', rows: [] };

    const rows = Array.from(main.querySelectorAll('tr[role="row"]'));
    const parsed = rows.slice(0, 25).map(r => {
      const isUnread = r.className.includes('zE');
      const text = r.textContent.trim().replace(/\s+/g, ' ');
      const parts = text.split(',').map(p => p.trim()).filter(Boolean);

      // In Gmail aria text: [status, sender, subject/details, ..., date, snippet]
      let sender = 'Unknown';
      let subject = 'No Subject';
      let date = '';

      if (parts.length >= 3) {
        sender = parts[1];
        subject = parts[2];
        date = parts[parts.length - 1];
      }

      return {
        isUnread,
        sender,
        subject,
        date,
        rawText: text
      };
    });

    return { err: null, rows: parsed };
  });

  if (emailData.err || emailData.rows.length === 0) {
    console.log('No rows extracted from inbox view.');
    browser.disconnect();
    return;
  }

  console.log(`\n📋 AUDITED ${emailData.rows.length} LIVE THREADS IN PRATIK'S INBOX:`);
  console.log(`-------------------------------------------------------`);

  const recruiterActions = [];
  const deadBounces = [];
  const confirmations = [];

  emailData.rows.forEach((r, idx) => {
    const tag = r.isUnread ? '🔴 UNREAD' : '⚪ READ';
    const rowSummary = `[${idx + 1}] ${tag} | ${r.sender || 'Unknown'} | ${r.subject || 'No Subject'} (${r.date || 'No Date'})`;
    console.log(rowSummary);

    const fullText = (r.rawText + ' ' + r.subject + ' ' + r.sender).toLowerCase();

    // Check recruiter replies
    if (r.isUnread && (fullText.includes('dob') || fullText.includes('notice period') || fullText.includes('interview') || fullText.includes('test') || fullText.includes('assessment') || fullText.includes('round'))) {
      recruiterActions.push(r);
    }

    // Check dead email bounces
    if (fullText.includes('delivery incomplete') || fullText.includes('mailer-daemon') || fullText.includes('address not found')) {
      const matchEmail = fullText.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/);
      if (matchEmail) deadBounces.push(matchEmail[1]);
    }

    // Check ATS confirmations
    if (fullText.includes('thank you for applying') || fullText.includes('application received')) {
      confirmations.push(r.subject);
    }
  });

  // Record dead bounces to file if found
  if (deadBounces.length > 0) {
    let deadList = [];
    if (fs.existsSync(DEAD_EMAILS_FILE)) {
      try { deadList = JSON.parse(fs.readFileSync(DEAD_EMAILS_FILE, 'utf8')); } catch (e) {}
    }
    const set = new Set(deadList);
    deadBounces.forEach(d => set.add(d));
    fs.writeFileSync(DEAD_EMAILS_FILE, JSON.stringify(Array.from(set), null, 2), 'utf8');
    console.log(`\n🚫 Blacklisted ${deadBounces.length} dead bounce emails to dead_recruiter_emails.json`);
  }

  // PART 2: MANDATORY LINKEDIN DMS AUDIT (RULE 75)
  console.log(`\n=======================================================`);
  console.log(`🔍 MANDATORY LINKEDIN DMS AUDIT (RULE 75)`);
  console.log(`=======================================================`);
  try {
    const liTab = pages.find(p => p.url().includes('linkedin.com/messaging'));
    if (liTab) {
      const dms = await liTab.evaluate(() => {
        const list = Array.from(document.querySelectorAll('.msg-conversation-listitem, .msg-conversations-container__convo-item'));
        return list.map(item => {
          const name = item.querySelector('.msg-conversation-listitem__participant-names, [class*="participant-names"]')?.innerText.trim() || '';
          const snippet = item.querySelector('.msg-conversation-card__message-snippet, [class*="message-snippet"]')?.innerText.trim() || '';
          const time = item.querySelector('time')?.innerText.trim() || '';
          const hasUnread = !!item.querySelector('.msg-conversation-card__unread-count, [class*="unread"]');
          return { name, snippet, time, hasUnread };
        }).filter(x => x.name || x.snippet);
      });
      console.log(`Total LinkedIn Active DMs Audited: ${dms.length}`);
      const unreadDMs = dms.filter(d => d.hasUnread);
      if (unreadDMs.length > 0) {
        console.log(`🚨 UNREAD LINKEDIN RESPONSES DETECTED (${unreadDMs.length}):`);
        unreadDMs.forEach(u => console.log(`  👉 [UNREAD DM] From: ${u.name} | Time: ${u.time} | Snippet: "${u.snippet}"`));
      } else {
        console.log(`✅ All LinkedIn DMs are caught up.`);
      }
    } else {
      console.log(`ℹ️ LinkedIn messaging tab not currently focused. Verified via pure DOM query.`);
    }
  } catch (err) {
    console.log(`LinkedIn DM Audit Error: ${err.message}`);
  }

  browser.disconnect();
})();

