import puppeteer from 'puppeteer-core';

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
    const page = (await browser.pages()).find(p => p.url().includes('web.telegram.org'));
    if (!page) {
      console.log('No Telegram page found');
      return;
    }
    await page.bringToFront();

    // Scroll chat list multiple times to load all channels/chats
    for (let i = 0; i < 8; i++) {
      await page.evaluate(() => {
        const scrollable = document.querySelector('.chatlist, .ChatList, .sidebar, div[class*="chatlist"]');
        if (scrollable) {
          scrollable.scrollTop += 2000;
        } else {
          window.scrollBy(0, 1000);
        }
      });
      await new Promise(r => setTimeout(r, 600));
    }

    const chatItems = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('.chat-title, .peer-title, .ListItem-title, h3, .user-caption'));
      return elements.map(el => el.innerText.trim()).filter(Boolean);
    });

    const unique = Array.from(new Set(chatItems));
    console.log(`Total chats/channels loaded: ${unique.length}`);

    // Categorize
    const jobKeywords = ['job', 'career', 'tech', 'hire', 'developer', 'hiring', 'referral', 'mern', 'react', 'intern'];
    const jobChannels = [];
    const otherChats = [];

    unique.forEach(name => {
      const lower = name.toLowerCase();
      if (jobKeywords.some(k => lower.includes(k))) {
        jobChannels.push(name);
      } else {
        otherChats.push(name);
      }
    });

    console.log('\n=== JOB / TECH CHANNELS & GROUPS (' + jobChannels.length + ') ===');
    jobChannels.forEach((c, idx) => console.log(`${idx + 1}. ${c}`));

    console.log('\n=== OTHER CHATS / CHANNELS (' + otherChats.length + ') ===');
    otherChats.forEach((c, idx) => console.log(`${idx + 1}. ${c}`));

  } catch (err) {
    console.error('Error:', err.message);
  }
})();
