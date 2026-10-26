const puppeteer = require('puppeteer-core');
const fs = require('fs');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  let browser;
  try {
    console.log('[15-Day Deep Mail Audit] Connecting to browser...');
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', protocolTimeout: 60000 });
    const pages = await browser.pages();
    let p = pages.find(x => x.url().includes('mail.google.com'));
    if (!p) {
      p = await browser.newPage();
    }
    await p.bringToFront();

    console.log('Navigating to search: newer_than:15d...');
    await p.goto('https://mail.google.com/mail/u/0/#search/newer_than%3A15d', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await p.reload({ waitUntil: 'domcontentloaded' });
    await sleep(4500);

    let allEmails = [];
    let pageCount = 0;
    const maxPages = 4; // Up to 200 emails

    while (pageCount < maxPages) {
      pageCount++;
      console.log(`Extracting page ${pageCount}...`);

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

      console.log(`Page ${pageCount} yielded ${rows.length} rows.`);
      for (const r of rows) {
        // Deduplicate by sender + subject + date
        const key = `${r.sender}|${r.subject}|${r.date}`;
        if (!allEmails.some(e => `${e.sender}|${e.subject}|${e.date}` === key)) {
          allEmails.push(r);
        }
      }

      // Check if "Older" button is available and enabled
      const hasOlder = await p.evaluate(() => {
        const nextBtn = document.querySelector('div[aria-label="Older"], div[data-tooltip="Older"]');
        if (nextBtn && nextBtn.getAttribute('aria-disabled') !== 'true') {
          nextBtn.click();
          return true;
        }
        return false;
      });

      if (!hasOlder) {
        console.log('No more pages (Older button disabled or not found).');
        break;
      }
      await sleep(3500);
    }

    console.log(`\nTotal unique emails captured across last 15 days: ${allEmails.length}`);
    fs.writeFileSync('last_15_days_emails.json', JSON.stringify(allEmails, null, 2));

    // Categorize
    const highSignal = [];
    const confirmations = [];
    const assessmentsOrInterviews = [];

    for (const e of allEmails) {
      const text = `${e.sender} ${e.subject} ${e.snippet}`.toLowerCase();
      
      if (text.includes('assessment') || text.includes('test') || text.includes('interview') || text.includes('hiring challenge') || text.includes('screening') || text.includes('shortlisted')) {
        assessmentsOrInterviews.push(e);
      } else if (text.includes('urgent opening') || text.includes('job invite') || text.includes('questionnaire') || text.includes('message from') || text.includes('referral') || text.includes('invitation to apply') || text.includes('schedule') || text.includes('feedback')) {
        highSignal.push(e);
      } else if (text.includes('thank you for applying') || text.includes('application confirmed') || text.includes('application received') || text.includes('thanks for applying') || text.includes('application successful')) {
        confirmations.push(e);
      }
    }

    console.log('=== ASSESSMENTS / INTERVIEWS ===', assessmentsOrInterviews.length);
    assessmentsOrInterviews.forEach(a => console.log(`* [${a.date}] From: ${a.sender} | Subject: ${a.subject} | Snippet: ${a.snippet.slice(0, 80)}...`));

    console.log('\n=== HIGH SIGNAL / QUESTIONNAIRES / OUTREACH ===', highSignal.length);
    highSignal.forEach(h => console.log(`* [${h.date}] From: ${h.sender} | Subject: ${h.subject} | Snippet: ${h.snippet.slice(0, 80)}...`));

    console.log('\n=== APPLICATION CONFIRMATIONS ===', confirmations.length);
    console.log(`Total confirmations: ${confirmations.length}`);

    browser.disconnect();
  } catch (err) {
    console.error('Error during 15-day audit:', err.message);
    if (browser) browser.disconnect();
  }
})();
