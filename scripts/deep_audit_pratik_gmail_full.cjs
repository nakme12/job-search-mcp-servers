const puppeteer = require('puppeteer-core');
const fs = require('fs');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  let browser;
  let page;
  try {
    console.log('[Deep Gmail Audit] Connecting to Brave...');
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });

    const pages = await browser.pages();
    page = pages.find(p => p.url().includes('mail.google.com'));
    if (!page) {
      page = await browser.newPage();
      await page.goto('https://mail.google.com/mail/u/0/#inbox', { waitUntil: 'domcontentloaded', timeout: 20000 });
    } else {
      await page.bringToFront();
      if (!page.url().includes('#inbox')) {
        await page.goto('https://mail.google.com/mail/u/0/#inbox', { waitUntil: 'domcontentloaded', timeout: 20000 });
      }
    }

    console.log('[Deep Gmail Audit] Waiting for inbox rows to appear...');
    await page.waitForSelector('tr[role="row"], tr.zA', { timeout: 15000 });
    await sleep(2500);

    console.log('Page Title:', await page.title());

    // Extract all rows
    const threads = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tr[role="row"], tr.zA'));
      return rows.slice(0, 30).map((r, idx) => {
        const senderEl = r.querySelector('.zF, .bA4, .yX, span[email]');
        const sender = senderEl ? senderEl.innerText.trim() : (r.querySelector('.yX')?.innerText.trim() || '');
        const emailAttr = senderEl?.getAttribute('email') || '';
        const subjectEl = r.querySelector('.bog, .bqe, span[data-thread-id]');
        const subject = subjectEl ? subjectEl.innerText.trim() : '';
        const snippetEl = r.querySelector('.y2');
        const snippet = snippetEl ? snippetEl.innerText.trim() : '';
        const dateEl = r.querySelector('.xW, .m1');
        const date = dateEl ? dateEl.innerText.trim() : '';
        const isUnread = r.classList.contains('zE') || (subjectEl && window.getComputedStyle(subjectEl).fontWeight >= '700');
        return {
          index: idx,
          sender,
          emailAttr,
          subject,
          snippet,
          date,
          isUnread
        };
      }).filter(t => t.sender || t.subject);
    });

    console.log(`\n=======================================================`);
    console.log(`📬 AUDITED PRATIK GMAIL INBOX: ${threads.length} VISIBLE EMAILS`);
    console.log(`=======================================================`);

    threads.forEach((t, i) => {
      const flag = t.isUnread ? '🔴 [UNREAD]' : '⚪ [READ]';
      console.log(`${flag} #${i + 1} | Sender: "${t.sender}" (${t.emailAttr}) | Date: ${t.date}`);
      console.log(`      Subject: ${t.subject}`);
      console.log(`      Snippet: ${t.snippet.substring(0, 160)}`);
      console.log('-------------------------------------------------------');
    });

    fs.writeFileSync('C:\\mcp\\gmail_inbox_deep_dump.json', JSON.stringify(threads, null, 2), 'utf8');

    // Click into unread emails or emails with questions / recruiter inquiries
    const actionableIndices = threads
      .map((t, idx) => ({ ...t, originalIndex: idx }))
      .filter(t => t.isUnread || /question|reply|assessment|test|interview|ctc|details|hire|shortlist|fde|developer|engineer/i.test(t.subject + ' ' + t.snippet + ' ' + t.sender))
      .slice(0, 5);

    console.log(`\n🔍 DEEP READING ${actionableIndices.length} CRITICAL / UNREAD THREADS...`);

    const detailedThreads = [];

    for (const t of actionableIndices) {
      console.log(`\n--- Inspecting Thread #${t.originalIndex + 1}: ${t.sender} — ${t.subject} ---`);
      
      // Click row
      const clicked = await page.evaluate((idx) => {
        const rows = Array.from(document.querySelectorAll('tr[role="row"], tr.zA'));
        if (rows[idx]) {
          rows[idx].click();
          return true;
        }
        return false;
      }, t.originalIndex);

      if (clicked) {
        await sleep(3000);
        const threadDetails = await page.evaluate(() => {
          const bodyEl = document.querySelector('.a3s.aiL, div[role="main"] .adn, div[role="main"]');
          const body = bodyEl ? bodyEl.innerText : '';
          const senderInfo = document.querySelector('.gD, span[email]')?.innerText || '';
          const senderEmail = document.querySelector('span[email]')?.getAttribute('email') || '';
          return { senderInfo, senderEmail, body: body.substring(0, 1200) };
        });

        console.log(`Sender: ${threadDetails.senderInfo} (${threadDetails.senderEmail})`);
        console.log(`Full Body:\n${threadDetails.body}\n`);

        detailedThreads.push({
          ...t,
          fullDetails: threadDetails
        });

        // Go back to inbox
        await page.goto('https://mail.google.com/mail/u/0/#inbox', { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForSelector('tr[role="row"], tr.zA', { timeout: 15000 });
        await sleep(1500);
      }
    }

    fs.writeFileSync('C:\\mcp\\detailed_recruiter_threads.json', JSON.stringify(detailedThreads, null, 2), 'utf8');

  } catch (err) {
    console.error('Error during deep Gmail audit:', err.message);
  } finally {
    if (browser) await browser.disconnect();
  }
})();
