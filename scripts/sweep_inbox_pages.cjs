const puppeteer = require('puppeteer-core');
const fs = require('fs');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  let browser;
  try {
    console.log('[Sweep Inbox Pages] Connecting to browser...');
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', protocolTimeout: 60000 });
    const pages = await browser.pages();
    let p = pages.find(x => x.url().includes('mail.google.com'));
    if (!p) {
      console.log('No gmail tab');
      return;
    }
    await p.bringToFront();

    // Start at inbox
    console.log('Going to #inbox...');
    await p.goto('https://mail.google.com/mail/u/0/#inbox', { waitUntil: 'domcontentloaded' });
    await sleep(3500);

    let allCollected = [];
    const maxPages = 4; // 200 emails = last 15-18 days

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      console.log(`\n=== Scanning Inbox Page ${pageNum} ===`);
      await sleep(2500);

      const rows = await p.evaluate(() => {
        const trs = Array.from(document.querySelectorAll('tr.zA, tr[role="row"]')).filter(r => r.innerText.trim().length > 5);
        return trs.map((r, i) => {
          const senderEl = r.querySelector('.zF, .bA4, .yX, span[email]');
          const sender = senderEl ? senderEl.innerText.trim() : (r.querySelector('.yX')?.innerText.trim() || '');
          const emailAttr = senderEl?.getAttribute('email') || '';
          const subjectEl = r.querySelector('.bog, .bqe, span[data-thread-id]');
          const subject = subjectEl ? subjectEl.innerText.trim() : '';
          const snippetEl = r.querySelector('.y2');
          const snippet = snippetEl ? snippetEl.innerText.trim() : '';
          const dateEl = r.querySelector('.xW, .m1');
          const date = dateEl ? (dateEl.getAttribute('title') || dateEl.innerText.trim()) : '';
          const isUnread = r.classList.contains('zE');
          return { sender, emailAttr, subject, snippet, date, isUnread };
        }).filter(x => x.sender || x.subject);
      });

      console.log(`Page ${pageNum} yielded ${rows.length} rows.`);
      if (rows.length > 0) {
        console.log(`Date range on Page ${pageNum}: [${rows[0].date}] down to [${rows[rows.length - 1].date}]`);
      }

      for (const r of rows) {
        const key = `${r.sender}|${r.subject}|${r.date}`;
        if (!allCollected.some(e => `${e.sender}|${e.subject}|${e.date}` === key)) {
          allCollected.push(r);
        }
      }

      if (pageNum < maxPages) {
        console.log('Clicking Older button...');
        const clicked = await p.evaluate(() => {
          const btn = document.querySelector('div[aria-label="Older"][role="button"]');
          if (btn && btn.getAttribute('aria-disabled') !== 'true') {
            btn.click();
            return true;
          }
          return false;
        });

        if (!clicked) {
          console.log('Older button not clickable or disabled.');
          break;
        }
        await sleep(3500);
      }
    }

    console.log(`\n======================================================`);
    console.log(`🎯 TOTAL COLLECTED: ${allCollected.length} EMAILS OVER LAST 15+ DAYS`);
    console.log(`======================================================`);

    fs.writeFileSync('last_15_days_inbox_full.json', JSON.stringify(allCollected, null, 2));

    // Deep analysis & categorization
    const actionableRecruiters = [];
    const assessments = [];
    const questionnaires = [];
    const confirmations = [];

    for (const e of allCollected) {
      const full = `${e.sender} ${e.subject} ${e.snippet}`.toLowerCase();

      if (full.includes('assessment') || full.includes('test') || full.includes('hacker') || full.includes('screening')) {
        assessments.push(e);
      } else if (full.includes('questionnaire') || full.includes('message from') || full.includes('pending from')) {
        questionnaires.push(e);
      } else if (full.includes('urgent opening') || full.includes('job invite') || full.includes('invitation to apply') || full.includes('interview') || full.includes('shortlisted') || full.includes('schedule')) {
        actionableRecruiters.push(e);
      } else if (full.includes('thank you for applying') || full.includes('application confirmed') || full.includes('application received') || full.includes('application successful')) {
        confirmations.push(e);
      }
    }

    console.log('\n--- 1. ASSESSMENTS / TESTS ---', assessments.length);
    assessments.forEach(a => console.log(`* [${a.date}] ${a.sender} -> ${a.subject}`));

    console.log('\n--- 2. QUESTIONNAIRES & SCREENINGS ---', questionnaires.length);
    questionnaires.forEach(q => console.log(`* [${q.date}] ${q.sender} -> ${q.subject}`));

    console.log('\n--- 3. RECRUITER OUTREACH & INTERVIEWS ---', actionableRecruiters.length);
    actionableRecruiters.forEach(r => console.log(`* [${r.date}] ${r.sender} -> ${r.subject}`));

    console.log('\n--- 4. CONFIRMATIONS COUNT ---', confirmations.length);

    browser.disconnect();
  } catch (err) {
    console.error('Error during inbox sweep:', err.message);
    if (browser) browser.disconnect();
  }
})();
