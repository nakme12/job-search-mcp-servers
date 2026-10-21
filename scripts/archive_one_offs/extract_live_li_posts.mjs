import puppeteer from 'puppeteer';
import fs from 'fs';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const liPage = pages.find(p => p.url().includes('linkedin.com'));
  if (!liPage) return;

  // Extract all text and post structures directly from the page
  const pageData = await liPage.evaluate(() => {
    // In LinkedIn search content results, posts are inside container divs
    const texts = [];
    const elements = document.querySelectorAll('*');
    for (const el of elements) {
      if (el.innerText && el.innerText.includes('Hiring') && el.innerText.length > 50 && el.innerText.length < 1500) {
        texts.push({
          tag: el.tagName,
          className: el.className,
          text: el.innerText.replace(/\s+/g, ' ')
        });
      }
    }
    return texts;
  });

  console.log(`Matched ${pageData.length} hiring text elements.`);
  
  // Deduplicate
  const uniquePosts = [];
  pageData.forEach(p => {
    if (!uniquePosts.some(u => u.text.slice(0, 80) === p.text.slice(0, 80))) {
      uniquePosts.push(p);
    }
  });

  console.log(`Unique hiring posts on page: ${uniquePosts.length}`);
  uniquePosts.slice(0, 5).forEach((p, i) => {
    console.log(`\n[Post ${i+1}]:`, p.text.slice(0, 250));
  });

  fs.writeFileSync('scripts/live_li_detected_posts.json', JSON.stringify(uniquePosts, null, 2));

  await browser.disconnect();
}

main().catch(console.error);
