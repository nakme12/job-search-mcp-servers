import puppeteer from 'puppeteer-core';
import fs from 'fs';

async function surfNatural() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const li = pages.find(p => p.url().includes('linkedin.com'));
  
  const searchUrl = 'https://www.linkedin.com/search/results/content/?keywords=hiring%20React%20developer%20email&sortBy=%22date_posted%22';
  console.log('Navigating to natural search:', searchUrl);
  await li.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
  await new Promise(r => setTimeout(r, 4500));

  for (let i = 0; i < 4; i++) {
    await li.evaluate(() => window.scrollBy(0, 1200));
    await new Promise(r => setTimeout(r, 1500));
  }

  const rawText = await li.evaluate(() => document.body.innerText);
  const posts = rawText.split(/Feed post\s*\n/).slice(1);
  console.log('Total posts found:', posts.length);

  const matched = [];
  posts.forEach((post, idx) => {
    const emails = post.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    if (emails.length > 0) {
      const lines = post.split('\n').map(l => l.trim()).filter(Boolean);
      matched.push({
        id: idx + 1,
        author: lines[0],
        emails: Array.from(new Set(emails)),
        text: post.slice(0, 500).replace(/\n+/g, ' ')
      });
    }
  });

  console.log('Posts with email:', matched.length);
  fs.writeFileSync('scripts/live_surfed_buffer_leads.json', JSON.stringify(matched, null, 2));

  matched.slice(0, 5).forEach((m, i) => {
    console.log(`\n=== MATCH #${i+1} ===`);
    console.log(`Author: ${m.author}`);
    console.log(`Email: ${m.emails.join(', ')}`);
    console.log(`Text: ${m.text.slice(0, 250)}`);
  });

  browser.disconnect();
}

surfNatural().catch(e => console.error(e.message));
