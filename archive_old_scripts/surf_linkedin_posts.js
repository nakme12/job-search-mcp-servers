import puppeteer from 'puppeteer-core';
import fs from 'fs';

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    let page = pages.find(p => p.url().includes('linkedin.com'));
    if (!page) {
      console.log('No LinkedIn tab found, creating new...');
      page = await browser.newPage();
    }
    await page.bringToFront();

    // Query for posts mentioning hiring frontend / react / mern with HR emails
    const searchUrl = 'https://www.linkedin.com/search/results/content/?keywords=%22hiring%22%20AND%20(%22React%22%20OR%20%22Frontend%22%20OR%20%22MERN%22)%20AND%20(%22gmail.com%22%20OR%20%22careers@%22%20OR%20%22hr@%22)&sortBy=%22date_posted%22';
    console.log('Navigating to LinkedIn content search:');
    console.log(searchUrl);

    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await new Promise(r => setTimeout(r, 4000));

    // Scroll 3 times slowly to load 10-15 posts
    for (let s = 0; s < 3; s++) {
      await page.evaluate(() => window.scrollBy(0, 1000));
      await new Promise(r => setTimeout(r, 2000));
    }

    await page.screenshot({ path: 'screenshots/2026-10-12/linkedin_posts_search.png' });
    console.log('Saved screenshot: screenshots/2026-10-12/linkedin_posts_search.png');

    // Extract posts content
    const postsData = await page.evaluate(() => {
      // Find post containers
      const containers = Array.from(document.querySelectorAll('.feed-shared-update-v2, div[data-urn*="activity"]'));
      return containers.map((c, idx) => {
        const text = c.innerText.trim();
        // Extract post URL if available
        const postLink = c.querySelector('a[href*="/activity/"], a[href*="/posts/"]');
        const author = c.querySelector('.update-components-actor__name, .feed-shared-actor__name');
        return {
          id: idx + 1,
          author: author ? author.innerText.trim() : 'Unknown Author',
          link: postLink ? postLink.href : '',
          rawText: text
        };
      });
    });

    console.log(`Extracted ${postsData.length} raw LinkedIn posts.`);
    fs.writeFileSync('linkedin_scraped_posts.json', JSON.stringify(postsData, null, 2));

    // Filter posts for email and hiring
    const results = [];
    postsData.forEach(p => {
      const text = p.rawText;
      const emails = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi) || [];
      if (emails.length > 0) {
        results.push({
          author: p.author,
          emails,
          snippet: text.replace(/\n+/g, ' ').slice(0, 250),
          full: text
        });
      }
    });

    console.log(`Found ${results.length} posts with direct emails.`);
    results.forEach((r, i) => {
      console.log(`\n--- Post #${i+1} by ${r.author} ---`);
      console.log(`Emails: ${r.emails.join(', ')}`);
      console.log(`Snippet: ${r.snippet}`);
    });

  } catch (err) {
    console.error('LinkedIn Scraper Error:', err.message);
  }
})();
