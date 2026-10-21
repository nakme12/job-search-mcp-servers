import puppeteer from 'puppeteer-core';
import fs from 'fs';

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const page = (await browser.pages()).find(p => p.url().includes('linkedin.com'));
    if (!page) return;

    // Search query specifically for MERN / React / Frontend India posts
    const queryUrl = 'https://www.linkedin.com/search/results/content/?keywords=MERN%20developer%20hiring%20India&sortBy=%22date_posted%22';
    console.log('Navigating to:', queryUrl);
    await page.goto(queryUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await new Promise(r => setTimeout(r, 4000));

    // Scroll 4 times to populate list
    for (let i = 0; i < 4; i++) {
      await page.evaluate(() => window.scrollBy(0, 1000));
      await new Promise(r => setTimeout(r, 1500));
    }

    // Expand "...more"
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('button')).filter(b => (b.innerText || '').toLowerCase().includes('more')).forEach(b => b.click());
    });
    await new Promise(r => setTimeout(r, 1000));

    await page.screenshot({ path: 'screenshots/2026-10-12/linkedin_mern_india_posts.png' });

    // Extract all visible feed posts
    const posts = await page.evaluate(() => {
      const allEls = Array.from(document.querySelectorAll('*')).filter(el => {
        const t = el.innerText || '';
        return (t.includes('Hiring') || t.includes('hiring') || t.includes('looking for')) &&
               (t.includes('MERN') || t.includes('React') || t.includes('Frontend')) &&
               el.children.length > 2 && el.children.length < 25 &&
               t.length > 100 && t.length < 2500;
      });
      return allEls.map(el => el.innerText.trim());
    });

    const unique = Array.from(new Set(posts));
    console.log(`Extracted ${unique.length} relevant MERN India posts.`);

    const structured = [];
    unique.forEach((p, idx) => {
      const emailMatches = p.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi) || [];
      structured.push({
        id: idx + 1,
        emails: Array.from(new Set(emailMatches)),
        snippet: p.replace(/\n+/g, ' ').slice(0, 300),
        fullText: p
      });
    });

    fs.writeFileSync('linkedin_mern_posts.json', JSON.stringify(structured, null, 2));

    structured.forEach(s => {
      console.log(`\n=== Post #${s.id} ===`);
      console.log(`Emails: ${s.emails.join(', ') || 'No email (in text or comment)'}`);
      console.log(`Snippet: ${s.snippet}`);
    });

  } catch (err) {
    console.error('Error:', err.message);
  }
})();
