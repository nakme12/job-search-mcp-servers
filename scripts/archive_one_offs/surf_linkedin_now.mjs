import puppeteer from 'puppeteer-core';
import fs from 'fs';

async function surfLinkedIn() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  let liPage = pages.find(p => p.url().includes('linkedin.com'));

  if (!liPage) {
    console.log('LinkedIn tab not found');
    browser.disconnect();
    return;
  }

  // Smooth scroll to load 10-15 posts
  for (let i = 0; i < 4; i++) {
    await liPage.evaluate(() => window.scrollBy(0, 1000));
    await new Promise(r => setTimeout(r, 1500));
  }

  const posts = await liPage.evaluate(() => {
    // Select post containers
    const cards = Array.from(document.querySelectorAll('.feed-shared-update-v2, .search-results-container div[data-urn], div.update-components-actor'));
    const results = [];
    
    // Fallback: search main feed container text
    const container = document.querySelector('.scaffold-finite-scroll__content') || document.body;
    const rawTexts = Array.from(container.querySelectorAll('.feed-shared-update-v2, .update-components-text, .feed-shared-inline-show-more-text'));

    rawTexts.forEach((el, idx) => {
      const text = el.innerText || '';
      if (text.length > 80) {
        // Extract emails if any
        const emails = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
        results.push({
          id: idx + 1,
          text: text.slice(0, 500).replace(/\n+/g, ' '),
          emails: emails
        });
      }
    });

    return results;
  });

  console.log(`Found ${posts.length} raw text blocks.`);
  fs.writeFileSync('scripts/live_linkedin_buffer_surfed.json', JSON.stringify(posts, null, 2));

  // Filter posts with emails or strong hiring intent
  const hiring = posts.filter(p => p.emails.length > 0 || /hiring|opening|urgent|immediate|send resume|mail/i.test(p.text));
  console.log(`Hiring relevant posts: ${hiring.length}`);
  
  hiring.slice(0, 6).forEach((p, i) => {
    console.log(`\n--- [POST ${i+1}] Emails: ${p.emails.join(', ') || 'None'} ---`);
    console.log(p.text.slice(0, 250));
  });

  browser.disconnect();
}

surfLinkedIn().catch(e => console.error(e.message));
