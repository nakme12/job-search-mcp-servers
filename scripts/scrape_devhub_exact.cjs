const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const tgPage = pages.find(p => p.url().includes('web.telegram.org/a'));

  if (!tgPage) { console.log('No TG tab'); process.exit(1); }

  console.log('Clicking directly on "Developer Hub | Jobs & Referrals" in the chat list...');
  
  // Click on Developer Hub item directly
  const clicked = await tgPage.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.ListItem, .chatlist-chat, div[role="button"]'));
    const target = items.find(el => {
      const text = el.innerText ? el.innerText.trim() : '';
      return text.includes('Developer Hub');
    });
    if (target) {
      target.click();
      return true;
    }
    return false;
  });

  console.log('Developer Hub clicked:', clicked);
  await new Promise(r => setTimeout(r, 4000));

  // Extract all visible messages from the chat container
  const rawPosts = await tgPage.evaluate(() => {
    const bubbles = Array.from(document.querySelectorAll('.text-content, .message-content, div.text, .translatable-message'));
    return bubbles.map(b => b.innerText ? b.innerText.trim() : '').filter(Boolean);
  });

  console.log(`\nExtracted ${rawPosts.length} messages from Developer Hub!`);
  
  // Filter and show the latest 5 messages
  const last5 = rawPosts.slice(-5);
  console.log('\n=== LATEST POSTS IN DEVELOPER HUB ===');
  last5.forEach((p, idx) => {
    console.log(`\n[POST ${idx + 1}]`);
    console.log(p);
  });

  fs.writeFileSync('C:/mcp/job-search-mcp-engine/scripts/devhub_live_posts.json', JSON.stringify(rawPosts, null, 2));

  await browser.disconnect();
})().catch(e => console.error('Error:', e.message));
