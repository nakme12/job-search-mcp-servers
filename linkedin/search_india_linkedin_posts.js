import puppeteer from 'puppeteer-core';
import fs from 'fs';

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const page = (await browser.pages()).find(p => p.url().includes('linkedin.com'));
    if (!page) return;

    // Search specifically for India hiring posts (Bangalore, Pune, Noida, Indore, Remote India)
    const indiaSearchUrl = 'https://www.linkedin.com/search/results/content/?keywords=(%22hiring%22%20OR%20%22looking%20for%22)%20AND%20(%22React%22%20OR%20%22Frontend%22)%20AND%20(%22India%22%20OR%20%22Indore%22%20OR%20%22Bangalore%22%20OR%20%22Remote%22)%20AND%20%22@%22&sortBy=%22date_posted%22';
    console.log('Navigating to India LinkedIn Posts search:');
    await page.goto(indiaSearchUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await new Promise(r => setTimeout(r, 4000));

    // Scroll 3 times
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, 1500));
      await new Promise(r => setTimeout(r, 1500));
    }

    await page.screenshot({ path: 'screenshots/2026-10-12/linkedin_india_posts.png' });

    // Extract all posts with email addresses
    const postData = await page.evaluate(() => {
      const allDivs = Array.from(document.querySelectorAll('div, li'));
      const textNodes = allDivs.filter(d => {
        const t = d.innerText || '';
        return (t.includes('hiring') || t.includes('Hiring') || t.includes('Looking for')) && t.includes('@') && t.length > 50 && t.length < 2500;
      });

      return textNodes.map((d, i) => d.innerText.trim());
    });

    // Deduplicate text
    const uniquePosts = Array.from(new Set(postData));
    console.log(`Found ${uniquePosts.length} post matches.`);

    const structured = [];
    uniquePosts.forEach((text, idx) => {
      const emailMatches = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi) || [];
      if (emailMatches.length > 0) {
        // filter out US staffing / C2C / W2 spam
        const lower = text.toLowerCase();
        const isUSSpam = lower.includes('c2c') || lower.includes('w2 only') || lower.includes('corp to corp') || lower.includes('us citizen') || lower.includes('green card');
        structured.push({
          id: idx + 1,
          emails: Array.from(new Set(emailMatches)),
          isUSSpam,
          preview: text.replace(/\n+/g, ' ').slice(0, 300),
          full: text
        });
      }
    });

    console.log(`\nFound ${structured.length} posts with emails.`);
    const indiaRoles = structured.filter(s => !s.isUSSpam);
    console.log(`India / Non-C2C Roles: ${indiaRoles.length}`);

    indiaRoles.slice(0, 8).forEach((r, i) => {
      console.log(`\n=== Role #${i+1} ===`);
      console.log(`Emails: ${r.emails.join(', ')}`);
      console.log(`Snippet: ${r.preview}`);
    });

  } catch (err) {
    console.error(err.message);
  }
})();
