import puppeteer from 'puppeteer';
import fs from 'fs';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const liPage = pages.find(p => p.url().includes('linkedin.com'));
  if (!liPage) {
    console.error("No LinkedIn tab found!");
    process.exit(1);
  }

  console.log("Connected to LinkedIn tab:", liPage.url());

  const queries = [
    'https://www.linkedin.com/search/results/content/?datePosted=%22past-24h%22&keywords=hiring%20react%20developer&origin=FACETED_SEARCH&sortBy=%22date_posted%22',
    'https://www.linkedin.com/search/results/content/?datePosted=%22past-24h%22&keywords=hiring%20frontend%20developer&origin=FACETED_SEARCH&sortBy=%22date_posted%22',
    'https://www.linkedin.com/search/results/content/?datePosted=%22past-24h%22&keywords=hiring%20mern%20stack&origin=FACETED_SEARCH&sortBy=%22date_posted%22'
  ];

  const harvested = [];

  for (const q of queries) {
    console.log(`Navigating to ${q.slice(0, 75)}...`);
    await liPage.goto(q, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(4000);

    for (let scroll = 0; scroll < 5; scroll++) {
      const posts = await liPage.evaluate(() => {
        // Collect text blocks that contain hiring posts
        const elements = Array.from(document.querySelectorAll('div, li, section'));
        const matched = [];
        for (const el of elements) {
          // If element has feed post marker and author
          if (el.innerText && el.innerText.startsWith('Feed post\n') && el.innerText.length > 100 && el.innerText.length < 3000) {
            // Find links inside
            const links = Array.from(el.querySelectorAll('a')).map(a => a.href);
            matched.push({
              text: el.innerText,
              links: links.filter(l => l.includes('linkedin.com/in/') || l.includes('linkedin.com/posts/') || l.includes('mailto:'))
            });
          }
        }
        return matched;
      });

      posts.forEach(p => {
        const textStart = p.text.slice(0, 100);
        if (!harvested.some(h => h.text.slice(0, 100) === textStart)) {
          harvested.push(p);
        }
      });

      await liPage.evaluate(() => window.scrollBy(0, 1200));
      await sleep(2000);
    }
  }

  console.log(`Total LinkedIn posts harvested: ${harvested.length}`);
  fs.writeFileSync('scripts/live_harvested_linkedin_feed.json', JSON.stringify(harvested, null, 2));

  // Extract emails and details
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  const leads = [];

  for (const post of harvested) {
    const text = post.text;
    const emails = text.match(emailRegex) || [];
    const validEmails = emails.filter(e => !e.endsWith('.png') && !e.endsWith('.jpg') && !e.includes('example.com') && !e.includes('linkedin.com'));
    
    // Check if 0-2 YOE friendly
    const isSenior = /senior|lead|principal|architect|5\+|6\+|7\+|8\+|10\+/i.test(text);
    const isJunior = /fresher|junior|0-1|0-2|1-2|entry level|immediate joiner|intern/i.test(text);

    if (validEmails.length > 0 && !isSenior) {
      leads.push({
        raw_text: text,
        emails: validEmails,
        links: post.links,
        junior_indicator: isJunior
      });
    }
  }

  console.log(`Extracted ${leads.length} direct recruiter email leads matching 0-2 YOE!`);
  fs.writeFileSync('scripts/live_linkedin_email_leads.json', JSON.stringify(leads, null, 2));
  console.log("Saved to scripts/live_linkedin_email_leads.json");

  await browser.disconnect();
}

main().catch(console.error);
