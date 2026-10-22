const puppeteer = require('puppeteer-core');

(async () => {
  let browser;
  try {
    browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null
    });

    const pages = await browser.pages();
    console.log('--- Current Open Tabs Count: ' + pages.length + ' ---');
    for (let i = 0; i < pages.length; i++) {
      try {
        const title = await pages[i].title();
        const url = pages[i].url();
        console.log(`[Tab ${i}] ${title} | ${url}`);
      } catch (e) {
        console.log(`[Tab ${i}] (cannot read)`);
      }
    }

    // Step 1: LinkedIn Messaging Inspection
    console.log('\n========================================');
    console.log('STEP 1: INSPECTING LINKEDIN MESSAGING (RULE 61 COMPLIANT)');
    console.log('========================================');

    // Rule 61 check: ensure max 2 tabs
    let liPage = pages.find(p => p.url().includes('linkedin.com'));
    let isNewLi = false;
    if (!liPage) {
      liPage = await browser.newPage();
      isNewLi = true;
    }

    console.log('[LinkedIn] Navigating to https://www.linkedin.com/messaging/ ...');
    await liPage.goto('https://www.linkedin.com/messaging/', { waitUntil: 'domcontentloaded', timeout: 35000 });

    console.log('[LinkedIn] Pacing delay 6s for network idle and organic telemetry...');
    await new Promise(r => setTimeout(r, 6000));

    // Human scroll simulation
    console.log('[LinkedIn] Executing smooth step scroll...');
    await liPage.evaluate(() => {
      window.scrollBy({ top: 220, behavior: 'smooth' });
    });
    await new Promise(r => setTimeout(r, 2500));

    const liResults = await liPage.evaluate(() => {
      const currentUrl = window.location.href;
      const title = document.title;
      const isLoggedOut = currentUrl.includes('/login') || currentUrl.includes('/authwall') || document.querySelector('input[name="session_key"]') !== null;

      if (isLoggedOut) {
        return { loggedIn: false, currentUrl, title, messages: [] };
      }

      const items = [];
      // Selector for conversation cards in messaging
      const cards = document.querySelectorAll('.msg-conversation-listitem, .msg-conversations-container__convo-item, li.msg-conversation-card, .msg-conversation-card__content');
      
      cards.forEach((card, idx) => {
        if (idx >= 8) return;
        const nameNode = card.querySelector('.msg-conversation-listitem__participant-names, .msg-conversation-card__participant-names, .msg-conversation-listitem__link, h3');
        const snippetNode = card.querySelector('.msg-conversation-card__message-snippet, .msg-conversation-listitem__message-snippet, p');
        const timeNode = card.querySelector('time, .msg-conversation-listitem__time-stamp');
        const unreadNode = card.querySelector('.msg-conversation-card__unread-count, .notification-badge--show, .msg-conversation-card--unread');

        const senderName = nameNode ? nameNode.innerText.trim() : 'Unknown';
        const snippet = snippetNode ? snippetNode.innerText.trim() : '';
        const timestamp = timeNode ? timeNode.innerText.trim() : '';
        const isUnread = !!unreadNode || card.className.includes('unread');

        items.push({
          senderName,
          snippet,
          timestamp,
          isUnread
        });
      });

      return {
        loggedIn: true,
        currentUrl,
        title,
        messageCountDetected: items.length,
        messages: items,
        bodyPreview: items.length === 0 ? document.body.innerText.substring(0, 400) : ''
      };
    });

    console.log('[LinkedIn] Results:');
    console.log(JSON.stringify(liResults, null, 2));

    // Rule 61: Tab ceiling & immediate pruning
    console.log('[LinkedIn] Pruning LinkedIn tab immediately to maintain <=2 tabs limit...');
    await liPage.close();
    console.log('[LinkedIn] Tab closed successfully.');

    // Step 2: Naukri Inspection
    console.log('\n========================================');
    console.log('STEP 2: INSPECTING NAUKRI INBOX & NOTIFICATIONS');
    console.log('========================================');

    let nkPage = await browser.newPage();
    console.log('[Naukri] Navigating to https://www.naukri.com/mnjuser/homepage ...');
    await nkPage.goto('https://www.naukri.com/mnjuser/homepage', { waitUntil: 'domcontentloaded', timeout: 35000 });

    console.log('[Naukri] Waiting 6s for widgets and notification badges to load...');
    await new Promise(r => setTimeout(r, 6000));

    const nkResults = await nkPage.evaluate(() => {
      const currentUrl = window.location.href;
      const title = document.title;
      const isLoggedOut = currentUrl.includes('/login') || document.querySelector('#usernameField') !== null;

      if (isLoggedOut) {
        return { loggedIn: false, currentUrl, title };
      }

      // Check notification bell / badge
      const bell = document.querySelector('.nI-gNb-header__notification-wrap, [data-indicator="notification"], .nI-gNb-badge, .chat-notification, .unread-count, .notification-count');
      const badgeText = bell ? bell.innerText.trim() : '0';

      // Check for recruiter actions or inbox/application updates
      const widgets = Array.from(document.querySelectorAll('.widget-container, .user-status, .dashboard-container, .section, .nI-gNb-menuItems, .layer, .count-wrapper')).map(e => e.innerText.trim()).filter(Boolean);

      const recentHeadlines = Array.from(document.querySelectorAll('a[href*="inbox"], a[href*="messages"], a[href*="applicationStatus"], .notification-item')).map(e => e.innerText.trim()).filter(Boolean);

      return {
        loggedIn: true,
        currentUrl,
        title,
        notificationBadge: badgeText,
        widgetsSummary: widgets.slice(0, 5),
        recentActivity: recentHeadlines.slice(0, 5),
        pageSnippet: document.body.innerText.substring(0, 600)
      };
    });

    console.log('[Naukri] Results:');
    console.log(JSON.stringify(nkResults, null, 2));

    // Immediate tab pruning
    console.log('[Naukri] Pruning Naukri tab immediately...');
    await nkPage.close();
    console.log('[Naukri] Tab closed successfully.');

    // Output final consolidated payload to file
    const fs = require('fs');
    const finalReport = {
      timestamp: new Date().toISOString(),
      linkedin: liResults,
      naukri: nkResults
    };
    fs.writeFileSync('C:/mcp/inbox_inspection_report.json', JSON.stringify(finalReport, null, 2));
    console.log('\nReport written to C:/mcp/inbox_inspection_report.json');

  } catch (err) {
    console.error('Fatal Error:', err);
  } finally {
    if (browser) {
      await browser.disconnect();
    }
  }
})();
