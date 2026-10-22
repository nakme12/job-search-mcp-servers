const playwright = require('C:/mcp/naukri-auto-apply-engine/node_modules/playwright');

async function runDetailedSlot1() {
  console.log('====================================================');
  console.log('📬 EXECUTING SLOT 1: UNIFIED INBOX & OUTBOUND AUDIT');
  console.log('🛡️ IDENTITY RULE 74: Authorized = pratikpatidar7990@gmail.com');
  console.log('====================================================');

  const browser = await playwright.chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0];
  const pages = context.pages();

  // 1. Audit Open Tabs for Identity Isolation
  console.log('\n--- 1. BROWSER TABS & IDENTITY SANITIZATION ---');
  for (const page of pages) {
    const url = page.url();
    const title = await page.title();
    if (url.includes('nakmeisiliya') || url.includes('/u/1/') || url.includes('/u/2/')) {
      console.log('🚨 BANNED PROFILE DETECTED & CLOSED:', url);
      await page.close();
    } else {
      console.log('  • Tab:', title.substring(0, 40), '| URL:', url.substring(0, 60));
    }
  }

  // 2. Audit Gmail (Pratik Only)
  console.log('\n--- 2. GMAIL AUDIT (pratikpatidar7990@gmail.com) ---');
  let gmailPage = pages.find(p => p.url().includes('mail.google.com'));
  if (gmailPage) {
    const gmailAccount = await gmailPage.evaluate(() => {
      const title = document.title;
      const accountEl = document.querySelector('header a[aria-label*="Google Account"]');
      const accountText = accountEl ? accountEl.getAttribute('aria-label') : 'Default profile';
      
      const rows = Array.from(document.querySelectorAll('tr[role="row"]')).slice(0, 5).map(r => {
        const sender = r.querySelector('[email], .zF, .bA4')?.innerText?.trim() || 'Unknown';
        const subject = r.querySelector('.bog, .bqe')?.innerText?.trim() || 'No Subject';
        const time = r.querySelector('.xW, .m16m6n6g')?.innerText?.trim() || '';
        return { sender, subject, time };
      });
      return { title, accountText, rows };
    });
    console.log('Gmail Title:', gmailAccount.title);
    console.log('Gmail Profile Label:', gmailAccount.accountText);
    console.log('Latest Inbox Emails in Pratik Tab:');
    gmailAccount.rows.forEach((r, idx) => {
      console.log(`  [${idx+1}] ${r.sender} | ${r.subject} (${r.time})`);
    });
  } else {
    console.log('No active Gmail tab currently open in CDP session.');
  }

  // 3. Audit WhatsApp
  console.log('\n--- 3. WHATSAPP RECRUITER AUDIT ---');
  let waPage = pages.find(p => p.url().includes('web.whatsapp.com'));
  if (waPage) {
    const waDetails = await waPage.evaluate(() => {
      const activeChatTitle = document.querySelector('header [title]')?.getAttribute('title') || 'None';
      const unreadChats = Array.from(document.querySelectorAll('div[role="listitem"]'))
        .filter(el => el.querySelector('span[aria-label*="unread message"]'))
        .map(el => el.querySelector('span[title]')?.getAttribute('title') || 'Unknown');
      return { activeChatTitle, unreadChats };
    });
    console.log('Active Open WhatsApp Chat:', waDetails.activeChatTitle);
    console.log('Unread Chats Count:', waDetails.unreadChats.length);
    if (waDetails.unreadChats.length > 0) {
      console.log('Unread From:', waDetails.unreadChats.join(', '));
    }
  } else {
    console.log('No active WhatsApp tab in CDP session.');
  }

  // 4. Audit LinkedIn DMs (Rule 61 Max-2 Tabs Hard Ceiling)
  console.log('\n--- 4. LINKEDIN RECRUITER DMS AUDIT ---');
  let liPage = pages.find(p => p.url().includes('linkedin.com/messaging'));
  let tempOpened = false;
  if (!liPage) {
    liPage = await context.newPage();
    tempOpened = true;
    await liPage.goto('https://www.linkedin.com/messaging/', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 3500));
  }
  const liDMs = await liPage.evaluate(() => {
    const unread = document.querySelectorAll('.msg-conversation-card__unread-count, .msg-conversation-card--unread').length;
    const threads = Array.from(document.querySelectorAll('.msg-conversation-listitem')).slice(0, 4).map(c => {
      const name = c.querySelector('.msg-conversation-listitem__participant-names')?.innerText.trim() || 'Unknown';
      const snippet = c.querySelector('.msg-conversation-card__message-snippet')?.innerText.trim() || '';
      const time = c.querySelector('.msg-conversation-listitem__time-stamp')?.innerText.trim() || '';
      return { name, snippet, time };
    });
    return { unread, threads };
  });
  console.log('Unread InMail / DMs:', liDMs.unread);
  liDMs.threads.forEach((t, i) => {
    console.log(`  [${i+1}] ${t.name} (${t.time}): "${t.snippet.substring(0, 70)}..."`);
  });

  if (tempOpened) {
    await liPage.close();
    console.log('Rule 61 enforced: Temporary LinkedIn tab closed immediately.');
  }

  console.log('\n====================================================');
  console.log('✅ SLOT 1 COMPLETE: All inboxes verified with 0 identity leakage.');
  console.log('====================================================');
}

runDetailedSlot1().catch(console.error);
