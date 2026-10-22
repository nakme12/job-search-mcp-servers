const puppeteer = require('puppeteer-core');
const fs = require('fs');
const { humanDelay, humanScroll, assertLinkedInTabsCeiling } = require('./linkedin_human_emulator.cjs');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  let browser;
  const auditReport = {
    timestamp: new Date().toISOString(),
    gmailInbox: [],
    linkedInDms: []
  };

  try {
    console.log('[Slot 1 Dual Audit] Connecting to Brave (Port 9222)...');
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });

    // ==========================================
    // 1. GMAIL DEEP INBOX AUDIT
    // ==========================================
    console.log('\n--- 1. AUDITING PRATIK PATIDAR GMAIL INBOX ---');
    const gmailPage = await browser.newPage();
    try {
      await gmailPage.goto('https://mail.google.com/mail/u/?authuser=pratikpatidar7990@gmail.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await sleep(3500);

      const rows = await gmailPage.evaluate(() => {
        const trs = Array.from(document.querySelectorAll('tr[role="row"], .zA'));
        return trs.slice(0, 15).map(r => {
          const sender = r.querySelector('.zF, .bA4, .yX')?.innerText?.trim() || '';
          const subject = r.querySelector('.bog, .bqe')?.innerText?.trim() || '';
          const snippet = r.querySelector('.y2')?.innerText?.trim() || '';
          const date = r.querySelector('.xW, .m1')?.innerText?.trim() || '';
          const isUnread = r.classList.contains('zE') || r.style.fontWeight === 'bold';
          return { sender, subject, snippet, date, isUnread };
        }).filter(r => r.subject || r.sender);
      });

      console.log(`[Gmail Audit] Extracted ${rows.length} visible inbox threads:`);
      rows.forEach((r, i) => {
        const flag = r.isUnread ? '📬 [UNREAD]' : '📖 [READ]';
        console.log(`  ${flag} [${i+1}] ${r.sender} | ${r.subject} (${r.date})`);
        if (r.snippet) console.log(`       -> ${r.snippet.substring(0, 100)}...`);
      });

      auditReport.gmailInbox = rows;
    } catch (gErr) {
      console.error('[Gmail Audit Error]:', gErr.message);
    } finally {
      await gmailPage.close();
    }

    // ==========================================
    // 2. LINKEDIN DMS AUDIT (RULE 86 COMPLIANT)
    // ==========================================
    console.log('\n--- 2. AUDITING LINKEDIN DMS (RULE 86 HUMAN EMULATION) ---');
    await assertLinkedInTabsCeiling(browser);

    const liPage = await browser.newPage();
    try {
      await liPage.goto('https://www.linkedin.com/messaging/', { waitUntil: 'domcontentloaded', timeout: 35000 });
      await humanDelay(3500, 6000);

      // Check if logged in
      const title = await liPage.title();
      console.log(`[LinkedIn] Title: "${title}"`);

      if (title.toLowerCase().includes('messaging') || title.toLowerCase().includes('linkedin')) {
        await humanScroll(liPage, 2, 200);
        await humanDelay(2000, 3500);

        const dms = await liPage.evaluate(() => {
          const list = Array.from(document.querySelectorAll('.msg-conversation-listitem, .msg-conversations-container__convo-item, div[data-view-name*="conversation"]'));
          return list.slice(0, 12).map(item => {
            const name = item.querySelector('.msg-conversation-listitem__participant-names, [class*="participant-names"]')?.innerText.trim() || '';
            const snippet = item.querySelector('.msg-conversation-card__message-snippet, [class*="message-snippet"]')?.innerText.trim() || '';
            const time = item.querySelector('time')?.innerText.trim() || '';
            const hasUnread = !!item.querySelector('.msg-conversation-card__unread-count, [class*="unread"]');
            return { name, snippet, time, hasUnread };
          }).filter(x => x.name || x.snippet);
        });

        console.log(`[LinkedIn DMs Audit] Extracted ${dms.length} conversations:`);
        dms.forEach((d, i) => {
          const flag = d.hasUnread ? '🔔 [UNREAD DM]' : '💬 [DM]';
          console.log(`  ${flag} [${i+1}] ${d.name} (${d.time})`);
          if (d.snippet) console.log(`       -> ${d.snippet.substring(0, 100)}...`);
        });

        auditReport.linkedInDms = dms;
      } else {
        console.log('[LinkedIn] Page did not load messaging.');
      }
    } catch (lErr) {
      console.error('[LinkedIn Audit Error]:', lErr.message);
    } finally {
      await liPage.close();
    }

    fs.writeFileSync('C:\\mcp\\slot1_dual_audit_report.json', JSON.stringify(auditReport, null, 2), 'utf8');
    console.log('\n[Slot 1 Dual Audit] Saved report to C:\\mcp\\slot1_dual_audit_report.json');

  } catch (fatal) {
    console.error('Fatal audit error:', fatal.message);
  } finally {
    if (browser) await browser.disconnect();
  }
})();
