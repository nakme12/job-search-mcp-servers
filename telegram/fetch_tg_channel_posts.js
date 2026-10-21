import puppeteer from 'puppeteer-core';

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
    const pages = await browser.pages();
    let page = pages.find(p => p.url().includes('web.telegram.org'));
    if (!page) {
      console.log('No TG page found');
      return;
    }

    // Search for merntech channel
    console.log('Searching merntech in Telegram search input...');
    const searchInput = await page.$('input[placeholder*="Search"], input[type="text"]');
    if (searchInput) {
      await searchInput.click();
      await searchInput.type('merntech', { delay: 100 });
      await new Promise(r => setTimeout(r, 2000));
    }

    await page.screenshot({ path: 'screenshots/2026-10-12/tg_search_results.png' });
    
    // Click on the channel
    const clickedChannel = await page.evaluate(() => {
      const chatItems = Array.from(document.querySelectorAll('.chatlist-chat, .search-result, .ListItem, div[role="row"]'));
      const found = chatItems.find(el => (el.innerText || '').toLowerCase().includes('mern') || (el.innerText || '').toLowerCase().includes('merntech'));
      if (found) {
        found.click();
        return 'Clicked: ' + found.innerText.replace(/\n+/g, ' ');
      }
      return 'Channel not found in search list';
    });
    console.log('Channel click:', clickedChannel);

    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: 'screenshots/2026-10-12/tg_channel_view.png' });

    // Extract all visible messages from channel
    const messages = await page.evaluate(() => {
      const msgEls = Array.from(document.querySelectorAll('.message, .Message, .text-content, .message-content'));
      return msgEls.map(m => m.innerText.trim()).filter(Boolean);
    });

    console.log(`Extracted ${messages.length} messages.`);
    messages.slice(-15).forEach((m, idx) => {
      console.log(`--- POST ${idx+1} ---`);
      console.log(m.replace(/\n+/g, ' \n ').slice(0, 400));
    });

  } catch (err) {
    console.error(err.message);
  }
})();
