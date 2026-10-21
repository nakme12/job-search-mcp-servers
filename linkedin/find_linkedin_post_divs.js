import puppeteer from 'puppeteer-core';
import fs from 'fs';

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    let page = pages.find(p => p.url().includes('linkedin.com'));
    if (!page) return;

    const posts = await page.evaluate(() => {
      // Find all elements containing 'Send resume to email' or 'Role :'
      const allDivs = Array.from(document.querySelectorAll('div'));
      const postDivs = allDivs.filter(d => {
        const text = d.innerText || '';
        return text.includes('Role :') && text.includes('Send resume to email') && d.children.length < 15;
      });

      return postDivs.map((d, i) => ({
        id: i + 1,
        text: d.innerText.trim()
      }));
    });

    console.log(`Found ${posts.length} direct hiring post divs.`);
    posts.forEach((p, i) => {
      console.log(`\n=== HIRING POST #${i+1} ===`);
      console.log(p.text);
    });

  } catch (err) {
    console.error(err.message);
  }
})();
