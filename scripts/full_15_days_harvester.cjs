const puppeteer = require('puppeteer-core');
const fs = require('fs');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  let browser;
  try {
    console.log('[Full 15-Day Harvester] Connecting to browser...');
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', protocolTimeout: 60000 });
    const pages = await browser.pages();
    let p = pages.find(x => x.url().includes('mail.google.com'));
    if (!p) {
      console.log('No page');
      return;
    }
    await p.bringToFront();

    // Start at top of inbox
    console.log('Navigating to top of #inbox...');
    await p.goto('https://mail.google.com/mail/u/0/#inbox', { waitUntil: 'domcontentloaded' });
    await sleep(3500);

    let allUnique = [];
    const maxPages = 5;

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      console.log(`\n========================================`);
      console.log(`📖 Harvesting Page ${pageNum}...`);
      console.log(`========================================`);
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
        console.log(`Date window on Page ${pageNum}: [${rows[0].date}] to [${rows[rows.length - 1].date}]`);
      }

      for (const r of rows) {
        const key = `${r.sender}|${r.subject}|${r.date}`;
        if (!allUnique.some(e => `${e.sender}|${e.subject}|${e.date}` === key)) {
          allUnique.push(r);
        }
      }

      if (pageNum < maxPages) {
        const btnInfo = await p.evaluate(() => {
          const olderBtn = document.querySelector('div[aria-label="Older"][role="button"]');
          if (!olderBtn) return null;
          const rect = olderBtn.getBoundingClientRect();
          return {
            x: rect.x + rect.width / 2,
            y: rect.y + rect.height / 2,
            visible: rect.width > 0 && rect.height > 0,
            ariaDisabled: olderBtn.getAttribute('aria-disabled')
          };
        });

        if (!btnInfo || btnInfo.ariaDisabled === 'true') {
          console.log('Older button not available or disabled.');
          break;
        }

        console.log(`Clicking Older button at (${btnInfo.x}, ${btnInfo.y})...`);
        await p.mouse.click(btnInfo.x, btnInfo.y);
        await sleep(3500);
      }
    }

    console.log(`\n========================================`);
    console.log(`✅ TOTAL UNIQUE EMAILS COLLECTED: ${allUnique.length}`);
    console.log(`========================================`);

    fs.writeFileSync('full_15_days_inbox.json', JSON.stringify(allUnique, null, 2));

    // Deep categorization
    const actionable = {
      assessments_tests: [],
      recruiter_outreach: [],
      questionnaires_cutshort: [],
      confirmations: [],
      other: []
    };

    for (const e of allUnique) {
      const full = `${e.sender} ${e.subject} ${e.snippet}`.toLowerCase();

      if (full.includes('assessment') || full.includes('test link') || full.includes('hiring challenge') || full.includes('red sag') || full.includes('code challenge')) {
        actionable.assessments_tests.push(e);
      } else if (full.includes('questionnaire') || full.includes('message from') || full.includes('yash makhecha') || full.includes('aman singh') || full.includes('sivasankar')) {
        actionable.questionnaires_cutshort.push(e);
      } else if (full.includes('urgent opening') || full.includes('job invite') || full.includes('invitation to apply') || full.includes('interview') || full.includes('shortlisted') || full.includes('bastionex') || full.includes('karmick')) {
        actionable.recruiter_outreach.push(e);
      } else if (full.includes('application successful') || full.includes('application confirmed') || full.includes('thank you for applying') || full.includes('thanks for applying') || full.includes('application received')) {
        actionable.confirmations.push(e);
      } else {
        actionable.other.push(e);
      }
    }

    console.log('\n--- 1. ASSESSMENTS / TESTS (' + actionable.assessments_tests.length + ') ---');
    actionable.assessments_tests.forEach(a => console.log(`* [${a.date}] ${a.sender} -> ${a.subject}`));

    console.log('\n--- 2. QUESTIONNAIRES & SCREENINGS (' + actionable.questionnaires_cutshort.length + ') ---');
    actionable.questionnaires_cutshort.forEach(q => console.log(`* [${q.date}] ${q.sender} -> ${q.subject}`));

    console.log('\n--- 3. RECRUITER OUTREACH & INVITES (' + actionable.recruiter_outreach.length + ') ---');
    actionable.recruiter_outreach.forEach(r => console.log(`* [${r.date}] ${r.sender} -> ${r.subject}`));

    console.log('\n--- 4. APPLICATION CONFIRMATIONS (' + actionable.confirmations.length + ') ---');

    fs.writeFileSync('categorized_15_days_summary.json', JSON.stringify(actionable, null, 2));

    browser.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    if (browser) browser.disconnect();
  }
})();
