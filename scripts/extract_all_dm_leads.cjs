const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
  let browser;
  try {
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const liPage = (await browser.pages()).find(p => p.url().includes('linkedin.com'));
    if (!liPage) {
      console.log('LinkedIn tab not found');
      process.exit(0);
    }

    // Function to extract leads from currently opened thread
    async function extractCurrentThread() {
      // Scroll up inside message list a few times to get full 7 days history
      for (let i = 0; i < 6; i++) {
        await liPage.evaluate(() => {
          const scrollable = document.querySelector('.msg-s-message-list, .msg-thread, .msg-s-message-list-container');
          if (scrollable) scrollable.scrollTop = 0;
        });
        await new Promise(r => setTimeout(r, 800));
      }

      return await liPage.evaluate(() => {
        const events = Array.from(document.querySelectorAll('.msg-s-message-list__event, .msg-s-event-listitem'));
        const leads = [];
        for (const ev of events) {
          const text = ev.innerText;
          // Check for emails
          const emails = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
          // Check for post links
          const postLinks = Array.from(ev.querySelectorAll('a')).map(a => a.href).filter(h => h.includes('/feed/update/urn:li:activity:'));
          
          if (emails.length > 0 || postLinks.length > 0) {
            leads.push({
              text: text.substring(0, 500).replace(/\n+/g, ' '),
              emails: [...new Set(emails)],
              postLinks: [...new Set(postLinks)]
            });
          }
        }
        return leads;
      });
    }

    // 1. Group thread leads
    console.log('[Extractor] Extracting Group Thread leads...');
    const groupLeads = await extractCurrentThread();
    console.log(`Found ${groupLeads.length} lead items in Group thread.`);

    // 2. Switch to Poornesh thread
    console.log('[Extractor] Switching to Poornesh Vishnole thread...');
    const convos = await liPage.$$('.msg-conversation-listitem, .msg-conversation-card');
    for (const c of convos) {
      const text = await liPage.evaluate(el => el.innerText, c);
      if (text.includes('Poornesh Vishnole')) {
        await c.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 3000));

    console.log('[Extractor] Extracting Poornesh thread leads...');
    const poorneshLeads = await extractCurrentThread();
    console.log(`Found ${poorneshLeads.length} lead items in Poornesh thread.`);

    const allLeads = [...groupLeads, ...poorneshLeads];
    fs.writeFileSync('C:\\mcp\\dm_extracted_leads.json', JSON.stringify(allLeads, null, 2), 'utf8');
    console.log(`[Extractor] Wrote ${allLeads.length} leads to C:\\mcp\\dm_extracted_leads.json`);

  } catch(e) {
    console.error('Extractor error:', e.message);
  } finally {
    if (browser) await browser.disconnect();
    process.exit(0);
  }
})();
