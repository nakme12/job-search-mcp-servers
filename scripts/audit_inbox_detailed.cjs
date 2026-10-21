const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const DEAD_EMAILS_FILE = path.join(__dirname, '..', 'dead_recruiter_emails.json');

http.get('http://127.0.0.1:9222/json/list', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', async () => {
    const list = JSON.parse(data);
    const gmailTab = list.find(t => t.type === 'page' && t.url.includes('mail.google.com'));
    if (!gmailTab) {
      console.log('No gmail tab found');
      return;
    }
    const ws = new WebSocket(gmailTab.webSocketDebuggerUrl);
    let id = 1;

    function sendCommand(method, params = {}) {
      return new Promise((resolve) => {
        const msgId = id++;
        const handler = (msg) => {
          const res = JSON.parse(msg);
          if (res.id === msgId) {
            ws.off('message', handler);
            resolve(res.result);
          }
        };
        ws.on('message', handler);
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });
    }

    ws.on('open', async () => {
      console.log('Connected to Gmail CDP WebSocket.');

      const evalRes = await sendCommand('Runtime.evaluate', {
        expression: `(() => {
          const rows = Array.from(document.querySelectorAll('div[role="main"] tr[role="row"]'));
          return JSON.stringify(rows.map((r, i) => {
            const isUnread = r.className.includes('zE');
            
            // Sender
            const senderEl = r.querySelector('span[email]') || r.querySelector('.yX span') || r.querySelector('.bA4 span');
            const sender = senderEl ? (senderEl.getAttribute('name') || senderEl.textContent || '') : '';
            const senderEmail = senderEl ? (senderEl.getAttribute('email') || '') : '';

            // Subject & Snippet
            // Often in .xS or .bog
            const subjectEl = r.querySelector('.bog span') || r.querySelector('.bog') || r.querySelector('span[data-thread-id]');
            const subject = subjectEl ? subjectEl.textContent.trim() : '';
            
            const snippetEl = r.querySelector('.y2');
            const snippet = snippetEl ? snippetEl.textContent.trim() : '';

            // Date
            const dateEl = r.querySelector('.xW span') || r.querySelector('.xW');
            const date = dateEl ? dateEl.textContent.trim() : '';

            // Fallback textContent
            const fullText = r.textContent.replace(/\\s+/g, ' ').trim();

            return { index: i, isUnread, sender, senderEmail, subject, snippet, date, fullText };
          }));
        })()`,
        returnByValue: true
      });

      const rows = JSON.parse(evalRes?.result?.value || '[]');
      console.log('Extracted ' + rows.length + ' rows from inbox.\n');

      const bounces = [];
      const replies = [];
      const confirmations = [];

      rows.forEach((r, idx) => {
        const status = r.isUnread ? '🔴 UNREAD' : '⚪ READ';
        console.log(`[${idx + 1}] ${status} | ${r.sender} <${r.senderEmail}> | Subj: "${r.subject}" | Snip: "${r.snippet.slice(0, 80)}" | Date: ${r.date}`);

        const combined = (r.sender + ' ' + r.senderEmail + ' ' + r.subject + ' ' + r.snippet + ' ' + r.fullText).toLowerCase();

        // Check bounce
        if (combined.includes('mailer-daemon') || combined.includes('delivery status notification') || combined.includes('address not found') || combined.includes('delivery incomplete') || combined.includes('message blocked') || combined.includes('undelivered')) {
          bounces.push(r);
        }

        // Check confirmation
        if (combined.includes('thank you for applying') || combined.includes('application received') || combined.includes('applied') || combined.includes('acknowledgement') || combined.includes('received your application') || combined.includes('ashby') || combined.includes('greenhouse') || combined.includes('lever') || combined.includes('smartrecruiters') || combined.includes('workable')) {
          confirmations.push(r);
        }

        // Check recruiter reply / interview / test
        if (r.isUnread && (combined.includes('interview') || combined.includes('assessment') || combined.includes('test') || combined.includes('shortlisted') || combined.includes('hiring team') || combined.includes('screening') || combined.includes('ctc') || combined.includes('notice period') || combined.includes('curriculum vitae') || combined.includes('next steps'))) {
          replies.push(r);
        }
      });

      console.log('\n=============================================');
      console.log('🔍 SLOT 1 INBOX AUDIT SUMMARY');
      console.log('=============================================');
      console.log(`Total threads inspected: ${rows.length}`);
      console.log(`Recruiter Replies / Invites found: ${replies.length}`);
      console.log(`Confirmations found: ${confirmations.length}`);
      console.log(`Mailer-daemon / Bounces found: ${bounces.length}`);

      if (replies.length > 0) {
        console.log('\n--- 🎯 RECRUITER REPLIES / ACTIONABLE ITEMS ---');
        replies.forEach(rep => {
          console.log(`- From: ${rep.sender} (${rep.senderEmail})\n  Subject: ${rep.subject}\n  Snippet: ${rep.snippet}\n  Date: ${rep.date}\n`);
        });
      }

      if (confirmations.length > 0) {
        console.log('\n--- 📩 CONFIRMATIONS ---');
        confirmations.forEach(conf => {
          console.log(`- From: ${conf.sender} (${conf.senderEmail}) | Subj: ${conf.subject} (${conf.date})`);
        });
      }

      if (bounces.length > 0) {
        console.log('\n--- ⚠️ BOUNCES / MAILER-DAEMON ---');
        bounces.forEach(b => {
          console.log(`- From: ${b.sender} (${b.senderEmail}) | Subj: ${b.subject}\n  Snippet: ${b.snippet}`);
        });

        // Record dead recruiter emails
        let deadList = [];
        if (fs.existsSync(DEAD_EMAILS_FILE)) {
          try { deadList = JSON.parse(fs.readFileSync(DEAD_EMAILS_FILE, 'utf8')); } catch(e) {}
        }
        const set = new Set(deadList);
        for (const b of bounces) {
          const match = (b.snippet + ' ' + b.fullText).match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/g);
          if (match) {
            match.forEach(em => {
              if (em.toLowerCase() !== 'pratikpatidar7990@gmail.com' && !em.includes('google.com')) {
                set.add(em.toLowerCase());
                console.log('Recorded dead recruiter email:', em.toLowerCase());
              }
            });
          }
        }
        fs.writeFileSync(DEAD_EMAILS_FILE, JSON.stringify([...set], null, 2), 'utf8');
        console.log(`Updated dead_recruiter_emails.json. Total count: ${set.size}`);
      } else {
        console.log('\n✅ Zero bounced emails / mailer-daemon notices detected in active view.');
      }

      ws.close();
    });
  });
});
